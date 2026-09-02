import { test, expect, Page } from "@playwright/test";
import {
  levenshtein,
  normalizeName,
} from "../assessments/fname-pairs/stimuli.js";

const PIXEL_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAAD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGP/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwCH/9k=",
  "base64",
);

/** Double the first letter: James → Jjames, Nancy → Nnancy, Brenda → Bbrenda. */
function doubledInitial(name: string): string {
  return name.charAt(0) + name;
}

/** Insert an extra copy of the first doubled letter: William → Willliam. */
function extraGeminate(name: string): string {
  const match = name.match(/(.)\1/i);
  if (match && match.index != null) {
    return name.slice(0, match.index) + match[1] + name.slice(match.index);
  }
  return doubledInitial(name);
}

async function stubFaceImages(page: Page): Promise<void> {
  await page.route(/CFD-.*\.jpg$/i, (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", body: PIXEL_JPEG }),
  );
}

async function waitForGameReady(page: Page): Promise<void> {
  await page.waitForSelector("canvas", { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const overlay = document.getElementById("loading-overlay");
      if (overlay && !overlay.classList.contains("hidden")) return false;
      const spinner = document.getElementById("m2c2kit-spinner-div");
      if (spinner && window.getComputedStyle(spinner).display !== "none") {
        return false;
      }
      return true;
    },
    { timeout: 30_000 },
  );
}

async function openTypedRecall(page: Page, extraQuery = ""): Promise<void> {
  await stubFaceImages(page);
  const query = new URLSearchParams({
    phase: "delayed",
    response_mode: "typed",
    tutorial: "false",
    list: "1",
    subset_size: "4",
    subset_seed: "0",
    show_trials_complete_scene: "false",
    allow_skip: "false",
  });
  if (extraQuery) {
    for (const [k, v] of new URLSearchParams(extraQuery)) query.set(k, v);
  }
  await page.goto(`/assessments/fname-pairs/index.html?${query}`);
  await waitForGameReady(page);
}

async function waitForNameInput(page: Page) {
  const input = page.locator("#fname-pairs-name-input");
  await expect(input).toBeVisible({ timeout: 15_000 });
  await expect(input).toHaveAttribute("data-name-target", /.+/);
  return input;
}

async function submitName(page: Page, value: string): Promise<string> {
  const input = await waitForNameInput(page);
  const target = (await input.getAttribute("data-name-target")) ?? "";
  await input.fill(value);
  await input.press("Enter");
  return target;
}

async function readDebugResults(page: Page) {
  await expect(
    page.getByRole("heading", { name: /Assessment Complete/i }),
  ).toBeVisible({ timeout: 30_000 });
  const raw = await page.locator("pre").innerText();
  return JSON.parse(raw) as {
    summary: {
      n_test_trials: number;
      n_correct_strict: number;
      n_correct_lenient: number;
      response_mode: string;
    };
    trials: Array<{
      trial_type: string;
      name_target: string;
      response_raw: string;
      edit_distance: number | null;
      is_correct_strict: boolean;
      is_correct_lenient: boolean;
    }>;
  };
}

test.describe("typed-recall scoring kernel (reported typos)", () => {
  test("distance-1 insertions match the participant examples", () => {
    const cases: Array<[string, string]> = [
      ["Brenda", "bbrenda"],
      ["William", "willliam"],
      ["James", "jjames"],
      ["Nancy", "naancy"],
    ];
    for (const [target, typed] of cases) {
      const d = levenshtein(normalizeName(typed), normalizeName(target));
      expect(d, `${typed} vs ${target}`).toBe(1);
    }
  });

  test("normalizeName strips case, spaces, and accents", () => {
    expect(normalizeName("  José ")).toBe("jose");
    expect(normalizeName("Mary-Anne")).toBe("maryanne");
  });
});

test.describe("FNAME-Pairs typed recall (web)", () => {
  test("exact spellings are strict- and lenient-correct", async ({ page }) => {
    await openTypedRecall(page);
    for (let i = 0; i < 4; i++) {
      const input = await waitForNameInput(page);
      const target = (await input.getAttribute("data-name-target")) ?? "";
      await input.fill(target);
      await input.press("Enter");
    }
    const { summary, trials } = await readDebugResults(page);
    const tests = trials.filter((t) => t.trial_type === "test");
    expect(summary.response_mode).toBe("typed");
    expect(summary.n_test_trials).toBe(4);
    expect(summary.n_correct_strict).toBe(4);
    expect(summary.n_correct_lenient).toBe(4);
    expect(tests.every((t) => t.is_correct_strict && t.is_correct_lenient)).toBe(
      true,
    );
  });

  test("distance-1 typos (jjames / bbrenda / willliam style) are lenient-correct only", async ({
    page,
  }) => {
    await openTypedRecall(page);
    const typed: string[] = [];
    for (let i = 0; i < 4; i++) {
      const input = await waitForNameInput(page);
      const target = (await input.getAttribute("data-name-target")) ?? "";
      const typo = i % 2 === 0 ? doubledInitial(target) : extraGeminate(target);
      typed.push(typo);
      expect(
        levenshtein(normalizeName(typo), normalizeName(target)),
        `${typo} should be 1 edit from ${target}`,
      ).toBe(1);
      await input.fill(typo);
      await input.press("Enter");
    }
    const { summary, trials } = await readDebugResults(page);
    const tests = trials.filter((t) => t.trial_type === "test");
    expect(tests).toHaveLength(4);
    expect(summary.n_correct_strict).toBe(0);
    expect(summary.n_correct_lenient).toBe(4);
    for (const t of tests) {
      expect(t.edit_distance).toBe(1);
      expect(t.is_correct_strict).toBe(false);
      expect(t.is_correct_lenient).toBe(true);
    }
    expect(summary.n_correct_lenient).not.toBe(summary.n_correct_strict);
  });

  test("a wrong name is neither strict nor lenient", async ({ page }) => {
    await openTypedRecall(page, "subset_size=1");
    await submitName(page, "zzzzz");
    const { summary, trials } = await readDebugResults(page);
    const t = trials.find((row) => row.trial_type === "test");
    expect(t).toBeTruthy();
    expect(t!.is_correct_strict).toBe(false);
    expect(t!.is_correct_lenient).toBe(false);
    expect((t!.edit_distance ?? 0) > 1).toBe(true);
    expect(summary.n_correct_strict).toBe(0);
    expect(summary.n_correct_lenient).toBe(0);
  });

  test("feedback screen reports the lenient score", async ({ page }) => {
    await openTypedRecall(page, "subset_size=2");
    const input1 = await waitForNameInput(page);
    const target1 = (await input1.getAttribute("data-name-target")) ?? "";
    await input1.fill(target1);
    await input1.press("Enter");
    const input2 = await waitForNameInput(page);
    const target2 = (await input2.getAttribute("data-name-target")) ?? "";
    await input2.fill(doubledInitial(target2));
    await input2.press("Enter");

    await expect(page.locator("p", { hasText: /Recall: 2\/2/ })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("p", { hasText: /Recall:/ })).not.toContainText(
      /strict/i,
    );
  });
});
