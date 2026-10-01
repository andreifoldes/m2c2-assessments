import { test, expect, Page } from "@playwright/test";

const URL =
  "/assessments/visual-search/index.html?test=1&tutorial=false&number_of_trials=4&feedback_duration_ms=100&iti_ms=50";

async function waitForGameReady(page: Page): Promise<void> {
  await page.waitForSelector("canvas", { timeout: 30_000 });
  await page.waitForFunction(() => {
    const spinner = document.getElementById("m2c2kit-spinner-div");
    return !spinner || window.getComputedStyle(spinner).display === "none";
  }, { timeout: 30_000 });
  await page.waitForFunction(() => {
    const overlay = document.getElementById("m2c2kit-canvas-overlay-div");
    return !overlay || window.getComputedStyle(overlay).display === "none";
  }, { timeout: 30_000 });
  await page.waitForTimeout(500);
}

/** Convert game coordinates (400x800) to page coordinates. */
async function gameToPage(page: Page, x: number, y: number) {
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error("no canvas");
  const scale = Math.min(box.width / 400, box.height / 800);
  const offX = box.x + (box.width - 400 * scale) / 2;
  const offY = box.y + (box.height - 800 * scale) / 2;
  return { x: offX + x * scale, y: offY + y * scale };
}

async function waitForTrial(page: Page) {
  await page.waitForFunction(
    () => (window as any).__assessment?._awaitingResponse === true,
    { timeout: 15_000 },
  );
}

test("tapping the target records a correct trial; corner taps are errors", async ({ page }) => {
  await page.goto(URL);
  await waitForGameReady(page);

  // Trials 0-1: hit the target; trials 2-3: tap a far corner (miss)
  for (let i = 0; i < 4; i++) {
    await waitForTrial(page);
    const info = await page.evaluate(() => {
      const a = (window as any).__assessment;
      return { target: a._currentTrial.target, n: a._stimulusNodes.length, set: a._currentTrial.setSize };
    });
    expect(info.n).toBe(info.set + 1);
    const pt = i < 2 ? await gameToPage(page, info.target.x, info.target.y) : await gameToPage(page, 10, 790);
    await page.mouse.click(pt.x, pt.y);
    await page.waitForFunction((k) => (window as any).__assessment._trialCursor > k, i);
  }

  await page.waitForFunction(() => (window as any).__assessment._testEnded === true);
  await page.waitForTimeout(500);
  const done = await gameToPage(page, 200, 520);
  await page.mouse.click(done.x, done.y);

  const pre = page.locator("pre");
  await expect(pre).toBeVisible({ timeout: 30_000 });
  const trials = JSON.parse((await pre.textContent()) ?? "[]");
  expect(trials).toHaveLength(4);
  expect(trials.map((t: any) => t.correct)).toEqual([true, true, false, false]);
  for (const t of trials) {
    expect(t.rt_ms).toBeGreaterThan(0);
    expect([10, 20]).toContain(t.set_size);
  }
});
