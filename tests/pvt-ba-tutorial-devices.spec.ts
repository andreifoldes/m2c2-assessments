import { test, expect, Page, devices } from "@playwright/test";

const PVT_BA_URL = "/assessments/pvt-ba/index.html";

async function waitForGameReady(page: Page): Promise<void> {
  await page.waitForSelector("canvas", { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const spinner = document.getElementById("m2c2kit-spinner-div");
      if (!spinner) return true;
      return window.getComputedStyle(spinner).display === "none";
    },
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () => {
      const overlay = document.getElementById("m2c2kit-canvas-overlay-div");
      if (!overlay) return true;
      return window.getComputedStyle(overlay).display === "none";
    },
    { timeout: 30_000 },
  );
  await page.waitForTimeout(500);
}

/**
 * Translate game coordinates (400x800 canvas) to the element's bounding box
 * and click that position on the canvas.
 */
async function clickGameCoords(
  page: Page,
  gameX: number,
  gameY: number,
): Promise<void> {
  const canvas = page.locator("#m2c2kit-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box not available");
  await canvas.click({
    position: {
      x: box.width * (gameX / 400),
      y: box.height * (gameY / 800),
    },
  });
}

/**
 * Navigate to PVT-BA and advance past tutorial page 1 to reach page 2
 * ("Get Ready" with the device-specific illustration).
 */
async function goToTutorialPage2(page: Page): Promise<void> {
  await page.goto(PVT_BA_URL);
  await waitForGameReady(page);
  // NEXT button on tutorial page 1 sits at game coords (200, 670)
  await clickGameCoords(page, 200, 670);
  await page.waitForTimeout(600);
}

test.describe("PVT-BA Tutorial Page 2 — Device-Specific Instructions", () => {
  test("desktop (no touch) detects non-touch and renders mouse illustration", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: false,
    });
    const page = await context.newPage();

    const isTouchDevice = await page.evaluate(
      () => "ontouchstart" in window || navigator.maxTouchPoints > 0,
    );
    expect(isTouchDevice).toBe(false);

    await goToTutorialPage2(page);

    const canvas = page.locator("#m2c2kit-canvas");
    await expect(canvas).toBeVisible();
    await canvas.screenshot({
      path: "test-results/pvt-ba-tutorial2-desktop.png",
    });

    await context.close();
  });

  test("iPhone 13 (touch) detects touch and renders thumb illustration", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();

    const isTouchDevice = await page.evaluate(
      () => "ontouchstart" in window || navigator.maxTouchPoints > 0,
    );
    expect(isTouchDevice).toBe(true);

    await goToTutorialPage2(page);

    const canvas = page.locator("#m2c2kit-canvas");
    await expect(canvas).toBeVisible();
    await canvas.screenshot({
      path: "test-results/pvt-ba-tutorial2-iphone13.png",
    });

    await context.close();
  });

  test("iPad (touch) detects touch and renders thumb illustration", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      ...devices["iPad (gen 7)"],
    });
    const page = await context.newPage();

    const isTouchDevice = await page.evaluate(
      () => "ontouchstart" in window || navigator.maxTouchPoints > 0,
    );
    expect(isTouchDevice).toBe(true);

    await goToTutorialPage2(page);

    const canvas = page.locator("#m2c2kit-canvas");
    await expect(canvas).toBeVisible();
    await canvas.screenshot({
      path: "test-results/pvt-ba-tutorial2-ipad.png",
    });

    await context.close();
  });

  test("same viewport size: touch vs non-touch produces different canvas content", async ({
    browser,
  }) => {
    const viewport = { width: 400, height: 800 };

    // Non-touch (desktop mode)
    const desktopCtx = await browser.newContext({
      viewport,
      hasTouch: false,
    });
    const desktopPage = await desktopCtx.newPage();
    await goToTutorialPage2(desktopPage);
    const desktopShot = await desktopPage.locator("#m2c2kit-canvas").screenshot();
    await desktopCtx.close();

    // Touch (mobile mode)
    const touchCtx = await browser.newContext({
      viewport,
      hasTouch: true,
    });
    const touchPage = await touchCtx.newPage();
    await goToTutorialPage2(touchPage);
    const touchShot = await touchPage.locator("#m2c2kit-canvas").screenshot();
    await touchCtx.close();

    // With identical viewports, the only difference is hasTouch.
    // The canvas must render different illustrations and instruction text.
    expect(desktopShot.equals(touchShot)).toBe(false);
  });
});
