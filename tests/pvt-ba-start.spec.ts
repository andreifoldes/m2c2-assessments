import { test, expect, Page } from "@playwright/test";

const PVT_BA_URL = "/assessments/pvt-ba/index.html";

/**
 * Wait for the m2c2kit game to fully load. The framework shows a spinner
 * overlay and a canvas overlay during WASM initialization. We must wait
 * for both to be hidden before interacting with the canvas.
 */
async function waitForGameReady(page: Page): Promise<void> {
  await page.waitForSelector("canvas", { timeout: 30_000 });

  // Wait for the loading spinner to become hidden (display: none)
  await page.waitForFunction(
    () => {
      const spinner = document.getElementById("m2c2kit-spinner-div");
      if (!spinner) return true;
      return window.getComputedStyle(spinner).display === "none";
    },
    { timeout: 30_000 },
  );

  // Wait for the canvas overlay to become hidden
  await page.waitForFunction(
    () => {
      const overlay = document.getElementById("m2c2kit-canvas-overlay-div");
      if (!overlay) return true;
      return window.getComputedStyle(overlay).display === "none";
    },
    { timeout: 30_000 },
  );

  // Brief extra pause for event handlers to register
  await page.waitForTimeout(500);
}

/**
 * Collect console messages matching a prefix from the page.
 */
function collectConsoleLogs(page: Page, prefix: string): string[] {
  const logs: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.startsWith(prefix)) {
      logs.push(text);
    }
  });
  return logs;
}

test.describe("PVT-BA Start Button", () => {
  test("tapping the canvas center starts the trial scene", async ({
    page,
  }) => {
    const logs = collectConsoleLogs(page, "[pvt-ba]");

    await page.goto(PVT_BA_URL);
    await waitForGameReady(page);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    await canvas.click({
      position: { x: box!.width / 2, y: box!.height / 2 },
    });

    await expect
      .poll(() => logs.some((l) => l.includes("scene:trial")), {
        message: "Expected scene transition to trial after clicking canvas",
        timeout: 10_000,
      })
      .toBeTruthy();

    await expect
      .poll(() => logs.some((l) => l.includes("trial:started")), {
        message: "Expected trial to start after scene transition",
        timeout: 10_000,
      })
      .toBeTruthy();
  });

  test("tapping the START button area starts the trial scene", async ({
    page,
  }) => {
    const logs = collectConsoleLogs(page, "[pvt-ba]");

    await page.goto(PVT_BA_URL);
    await waitForGameReady(page);

    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    // Game coords (200, 670) in a 400x800 canvas → 50% width, 83.75% height
    const clickX = box!.width * 0.5;
    const clickY = box!.height * (670 / 800);

    await canvas.click({ position: { x: clickX, y: clickY } });

    await expect
      .poll(() => logs.some((l) => l.includes("scene:trial")), {
        message: "Expected scene transition after tapping START button area",
        timeout: 10_000,
      })
      .toBeTruthy();
  });

  test("tapping the top area of canvas also starts (full overlay)", async ({
    page,
  }) => {
    const logs = collectConsoleLogs(page, "[pvt-ba]");

    await page.goto(PVT_BA_URL);
    await waitForGameReady(page);

    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    // Click near the top — validates the full-screen overlay
    await canvas.click({
      position: { x: box!.width * 0.5, y: box!.height * 0.15 },
    });

    await expect
      .poll(() => logs.some((l) => l.includes("scene:trial")), {
        message: "Expected scene transition from top-area tap (full overlay)",
        timeout: 10_000,
      })
      .toBeTruthy();
  });
});

test.describe("PVT-BA Trial Interaction", () => {
  test("trial scene responds to taps during stimulus", async ({ page }) => {
    const logs = collectConsoleLogs(page, "[pvt-ba]");

    await page.goto(PVT_BA_URL);
    await waitForGameReady(page);

    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    // Start the test by tapping
    await canvas.click({
      position: { x: box!.width / 2, y: box!.height / 2 },
    });

    // Wait for trial to start
    await expect
      .poll(() => logs.some((l) => l.includes("trial:started")), {
        timeout: 10_000,
      })
      .toBeTruthy();

    // Wait for stimulus to appear (ISI is 1000–4000ms, add buffer)
    await page.waitForTimeout(5_000);

    // Tap the canvas to respond to stimulus
    await canvas.click({
      position: { x: box!.width / 2, y: box!.height / 2 },
    });

    // Verify no crash — canvas should still be visible
    await expect(canvas).toBeVisible();
  });
});
