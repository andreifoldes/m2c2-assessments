import { test, expect, Page } from "@playwright/test";

const URL = "/assessments/sart2/index.html";

async function waitForGameReady(page: Page): Promise<void> {
  await page.waitForSelector("canvas", { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const s = document.getElementById("m2c2kit-spinner-div");
      return !s || window.getComputedStyle(s).display === "none";
    },
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () => {
      const o = document.getElementById("m2c2kit-canvas-overlay-div");
      return !o || window.getComputedStyle(o).display === "none";
    },
    { timeout: 30_000 },
  );
  await page.waitForTimeout(500);
}

test.describe("SART2", () => {
  test("runs end to end with keyboard and records correct trial data", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (m) => logs.push(m.text()));
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    // 9 training + 9 test trials, short error feedback to keep the test quick
    await page.goto(
      `${URL}?training_trials=9&test_trials=9&error_feedback_ms=100&post_error_blank_ms=50`,
    );
    await waitForGameReady(page);

    // title -> instructions1 -> instructions2 -> training countdown
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(500);
    }
    const trialLogs = () => logs.filter((l) => l.includes("trial data:")).length;
    // 4 s countdown, then press 100 ms into each of the 9 training trials
    // (commission expected on the 3), syncing to each completed trial.
    await page.waitForTimeout(4100);
    for (let i = 0; i < 9; i++) {
      await page.waitForTimeout(100);
      await page.keyboard.press("Space");
      await expect.poll(trialLogs, { timeout: 8_000 }).toBe(i + 1);
    }
    await page.waitForTimeout(1000);
    // training summary -> real block instruction -> start test
    await page.keyboard.press("Space");
    await page.waitForTimeout(600);
    await page.keyboard.press("Space");
    // test block: withhold on everything (omissions on all go digits)
    await expect.poll(trialLogs, { timeout: 60_000 }).toBe(18);
    await page.waitForTimeout(4000);

    await expect
      .poll(() => logs.some((l) => l.includes("all trial data")), { timeout: 15_000 })
      .toBeTruthy();
    expect(errors).toEqual([]);

    const trials = await page.evaluate(() => {
      const pre = document.querySelector("pre");
      return pre ? JSON.parse(pre.textContent || "[]") : [];
    });
    expect(trials.length).toBe(18);
    const training = trials.filter((t: any) => t.block === "training");
    const test = trials.filter((t: any) => t.block === "test");
    expect(training.length).toBe(9);
    expect(test.length).toBe(9);
    // every digit 1-9 exactly once per block of 9
    expect(training.map((t: any) => t.digit).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // training: all pressed -> exactly one commission (the 3)
    expect(training.filter((t: any) => t.error_type === "commission").length).toBe(1);
    expect(training.every((t: any) => t.rt_ms === null || t.rt_ms >= 0)).toBeTruthy();
    // test: none pressed -> omissions on all 8 go digits, no-go correct
    expect(test.filter((t: any) => t.error_type === "omission").length).toBe(8);
    expect(test.find((t: any) => t.digit === 3).correct).toBe(true);
  });
});
