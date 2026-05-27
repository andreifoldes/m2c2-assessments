# WebGazer Eye Tracking Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `?webgazer=1` URL parameter to four cognitive assessments enabling browser-based eye tracking with gaze-based calibration and CSV export.

**Architecture:** New `assessments/webgazer/webgazer.js` module loaded conditionally per-assessment (mirroring the `webcam.js` pattern). WebGazer.js from CDN handles gaze prediction; our module handles consent, calibration UI, data collection with trial markers, and CSV delivery.

**Tech Stack:** WebGazer.js 2.1.3 (CDN), vanilla JS (ES modules), MediaRecorder-style delivery pipeline.

**Spec:** `docs/superpowers/specs/2026-03-17-webgazer-integration-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `assessments/webgazer/webgazer.js` | **Create** | Core module: consent, calibration, gaze collection, trial markers, CSV export, delivery |
| `assessments/pvt-ba/index.js` | **Modify** | Add webgazer loading, trial marker hooks, export call |
| `assessments/prices/index.js` | **Modify** | Add webgazer loading, trial marker hooks, export call |
| `assessments/@m2c2kit/assessment-symbol-search@0.8.33/index.js` | **Modify** | Add webgazer loading, trial marker hooks, export call |
| `assessments/@m2c2kit/assessment-color-shapes@0.8.33/index.js` | **Modify** | Add webgazer loading, trial marker hooks, export call |

---

### Task 1: Create `webgazer.js` — Remote Logging & Consent Overlay

**Files:**
- Create: `assessments/webgazer/webgazer.js`

This task creates the module file with the logging infrastructure and consent overlay. These are self-contained and can be tested in isolation.

- [ ] **Step 1: Create module with logging infrastructure**

Create `assessments/webgazer/webgazer.js` with the following. This mirrors the logging pattern in `assessments/webcam/webcam.js` lines 14-50:

```js
/**
 * WebGazer eye tracking module for m2c2kit assessments.
 *
 * Provides: consent overlay → gaze-based calibration → gaze data collection
 * with trial markers → CSV export on session end.
 *
 * Usage in any assessment index.js:
 *   import { showGazeConsentOverlay, initWebGazer, runCalibration,
 *            markTrialStart, markTrialEnd, stopAndExportGaze }
 *     from "../webgazer/webgazer.js";
 */

// ── Remote logging ──────────────────────────────────────────────
let _logEndpoint = null;
let _logToken = null;
let _source = null;

export function initGazeLogger(token, callbackUrl) {
  _logToken = token;
  try {
    _source = new URLSearchParams(window.location.search).get("source");
  } catch (_) {}
  if (callbackUrl) {
    try {
      const url = new URL(callbackUrl);
      url.pathname = url.pathname.replace(/\/cognitive\/complete$/, "/webgazer/log");
      _logEndpoint = url.toString();
    } catch (_) {
      _logEndpoint = null;
    }
  }
}

function logGaze(event, detail) {
  const entry = { token: _logToken, event, detail: typeof detail === "string" ? detail : JSON.stringify(detail) };
  console.log(`[webgazer] ${event}`, detail || "");
  if (_logEndpoint) {
    fetch(_logEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {});
  }
}
```

- [ ] **Step 2: Add consent overlay function**

Append to `assessments/webgazer/webgazer.js`. This mirrors `webcam.js` lines 56-138 but with eye-tracking-specific copy:

```js
/**
 * Shows a full-screen consent overlay for eye tracking.
 * Resolves true if the participant accepts, false if they decline.
 */
export function showGazeConsentOverlay() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "gaze-consent-overlay";
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: #ffffff;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 32px 24px; box-sizing: border-box;
      font-family: sans-serif; color: #222; text-align: center;
    `;

    const isTelegram = _source === "telegram";
    const storageMsg = isTelegram
      ? "If you agree, your eye movements will be tracked while you complete the task. " +
        "<strong>The gaze data will be sent to you in Telegram</strong> when the task ends."
      : "If you agree, your eye movements will be tracked while you complete the task. " +
        "<strong>The gaze data is saved only on your device</strong> — it is never " +
        "uploaded or shared.";

    overlay.innerHTML = `
      <div style="max-width: 420px; width: 100%;">
        <div style="font-size: 48px; margin-bottom: 16px;">👁️</div>
        <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #111;">
          Optional Eye Tracking
        </h2>
        <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #444;">
          The researcher has enabled optional eye tracking for this session.
        </p>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #444;">
          ${storageMsg}
        </p>
        <p style="margin: 0 0 28px; font-size: 14px; color: #666;">
          You can decline and still complete the task normally.
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="gaze-consent-accept" style="
            padding: 14px 24px; font-size: 16px; font-weight: 600;
            border: none; border-radius: 10px;
            background: #2e7d32; color: #fff; cursor: pointer;
          ">Allow Eye Tracking</button>
          <button id="gaze-consent-decline" style="
            padding: 14px 24px; font-size: 16px; font-weight: 500;
            border: 1.5px solid #bbb; border-radius: 10px;
            background: #fff; color: #555; cursor: pointer;
          ">No thanks, continue without eye tracking</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    logGaze("consent_shown");

    document.getElementById("gaze-consent-accept").addEventListener("click", () => {
      logGaze("consent_accepted");
      overlay.remove();
      resolve(true);
    });

    document.getElementById("gaze-consent-decline").addEventListener("click", () => {
      logGaze("consent_declined");
      overlay.remove();
      resolve(false);
    });
  });
}
```

- [ ] **Step 3: Verify file loads without errors**

Open a browser console and test:
```
http://localhost:8000/assessments/webgazer/webgazer.js
```
Or simply verify the file is syntactically valid by importing it in a test HTML page. The module should export `initGazeLogger` and `showGazeConsentOverlay` without errors.

- [ ] **Step 4: Commit**

```bash
git add assessments/webgazer/webgazer.js
git commit -m "feat(webgazer): add module with logging and consent overlay"
```

---

### Task 2: Add WebGazer Initialization & Calibration UI

**Files:**
- Modify: `assessments/webgazer/webgazer.js`

**Reference docs:**
- WebGazer API: `webgazer.begin()`, `setRegression()`, `saveDataAcrossSessions()`, `showVideo()`, `showPredictionPoints()`, `showFaceOverlay()`, `showFaceFeedbackBox()`, `applyKalmanFilter()`
- Spec calibration section: 5-point gaze-based, 2s per dot, synthetic click events

- [ ] **Step 1: Add WebGazer CDN loader and module-level state**

Append to `assessments/webgazer/webgazer.js`. First declare the module-level state variables that will be used by calibration (this task), gaze collection (Task 3), and export (Task 4):

```js
// ── Module state ────────────────────────────────────────────────
const _gazeData = [];
let _currentTrial = 0;
let _gazeListenerActive = false;

// ── WebGazer loading & initialization ───────────────────────────
let _webgazer = null;

/**
 * Dynamically loads WebGazer.js from CDN and initializes it.
 * Camera preview and prediction dots are hidden.
 * Returns the webgazer instance.
 */
export async function initWebGazer() {
  logGaze("webgazer_loading");
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/webgazer@2.1.3/dist/webgazer.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    _webgazer = window.webgazer;
    _webgazer
      .setRegression("ridge")
      .saveDataAcrossSessions(false)
      .showVideo(false)
      .showPredictionPoints(false)
      .showFaceOverlay(false)
      .showFaceFeedbackBox(false)
      .applyKalmanFilter(true);
    await _webgazer.begin();
    _webgazer.showVideo(false);
    _webgazer.showPredictionPoints(false);
    logGaze("webgazer_initialized");
    return _webgazer;
  } catch (e) {
    logGaze("webgazer_init_error", { name: e.name, message: e.message });
    throw e;
  }
}
```

Note: `showVideo(false)` is called again after `begin()` because `begin()` creates and attaches the video element — calling it before only sets the flag, the element may still briefly appear.

- [ ] **Step 2: Add 5-point gaze calibration UI**

Append to `assessments/webgazer/webgazer.js`:

```js
/**
 * Runs a 5-point gaze-based calibration.
 * Shows dots at 5 screen positions; user looks at each for 2 seconds.
 * Synthetic click events are dispatched at dot positions to train WebGazer.
 * Resolves when calibration is complete.
 */
export function runCalibration() {
  return new Promise((resolve) => {
    const HOLD_MS = 2000;
    const CLICK_INTERVAL_MS = 100; // ~10 synthetic clicks/sec
    const points = [
      { x: 0.50, y: 0.50 }, // center first
      { x: 0.15, y: 0.15 },
      { x: 0.85, y: 0.15 },
      { x: 0.15, y: 0.85 },
      { x: 0.85, y: 0.85 },
    ];

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: #000;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: sans-serif;
    `;

    const instruction = document.createElement("div");
    instruction.textContent = "Look at each dot until it disappears";
    instruction.style.cssText = `
      position: absolute; top: 8%; left: 50%;
      transform: translateX(-50%);
      color: rgba(255,255,255,0.8); font-size: 17px;
      text-align: center; pointer-events: none;
    `;

    const dot = document.createElement("div");
    const dotSize = Math.max(40, Math.min(window.innerWidth, window.innerHeight) * 0.06);
    dot.style.cssText = `
      position: absolute;
      width: ${dotSize}px; height: ${dotSize}px;
      border-radius: 50%;
      background: #4CAF50;
      transition: transform 0.1s ease;
      pointer-events: none;
    `;

    const progress = document.createElement("div");
    progress.style.cssText = `
      position: absolute; bottom: 6%; left: 50%;
      transform: translateX(-50%);
      color: rgba(255,255,255,0.5); font-size: 14px;
    `;

    overlay.appendChild(instruction);
    overlay.appendChild(dot);
    overlay.appendChild(progress);
    document.body.appendChild(overlay);

    logGaze("calibration_start", { points: points.length });

    let pointIdx = 0;

    function showNextPoint() {
      if (pointIdx >= points.length) {
        logGaze("calibration_complete");
        overlay.remove();
        resolve();
        return;
      }

      const pt = points[pointIdx];
      const screenX = Math.round(pt.x * window.innerWidth);
      const screenY = Math.round(pt.y * window.innerHeight);

      dot.style.left = `${screenX - dotSize / 2}px`;
      dot.style.top = `${screenY - dotSize / 2}px`;
      dot.style.transform = "scale(1)";
      progress.textContent = `${pointIdx + 1} / ${points.length}`;

      logGaze("calibration_point", { index: pointIdx, screenX, screenY });

      // Record calibration gaze samples during this point
      const calStartTime = Date.now();

      const elapsed = { ms: 0 };
      const clickInterval = setInterval(() => {
        elapsed.ms += CLICK_INTERVAL_MS;
        // Dispatch synthetic click at dot position to train WebGazer
        const clickEvent = new MouseEvent("click", {
          clientX: screenX,
          clientY: screenY,
          bubbles: true,
        });
        document.dispatchEvent(clickEvent);

        // Shrink dot as visual feedback
        const fraction = Math.min(elapsed.ms / HOLD_MS, 1);
        dot.style.transform = `scale(${1 - fraction * 0.6})`;

        // Record calibration sample
        _gazeData.push({
          timestamp_ms: Date.now(),
          x: screenX,
          y: screenY,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          trial_number: 0,
          event_type: "calibration",
        });
      }, CLICK_INTERVAL_MS);

      setTimeout(() => {
        clearInterval(clickInterval);
        pointIdx++;
        showNextPoint();
      }, HOLD_MS);
    }

    showNextPoint();
  });
}
```

- [ ] **Step 3: Verify calibration visually**

Create a quick test by temporarily adding to a test HTML file:
```html
<script type="module">
  import { initGazeLogger, showGazeConsentOverlay, initWebGazer, runCalibration } from "./webgazer.js";
  initGazeLogger(null, null);
  const accepted = await showGazeConsentOverlay();
  if (accepted) {
    await initWebGazer();
    await runCalibration();
    console.log("Calibration done!");
  }
</script>
```
Verify: 5 dots appear sequentially, each shrinks over 2s, overlay disappears after all 5. Check both desktop and mobile viewport (use Chrome DevTools device mode).

- [ ] **Step 4: Commit**

```bash
git add assessments/webgazer/webgazer.js
git commit -m "feat(webgazer): add WebGazer initialization and 5-point calibration"
```

---

### Task 3: Add Gaze Data Collection & Trial Markers

**Files:**
- Modify: `assessments/webgazer/webgazer.js`

- [ ] **Step 1: Add gaze data collection array and listener**

Append to `assessments/webgazer/webgazer.js`:

```js
// ── Gaze data collection ────────────────────────────────────────
// _gazeData, _currentTrial, _gazeListenerActive already declared in Task 2.

/**
 * Starts collecting gaze data via WebGazer's setGazeListener.
 * Each sample is pushed to the in-memory array with current trial number.
 */
export function startGazeCollection() {
  if (!_webgazer || _gazeListenerActive) return;
  _gazeListenerActive = true;
  _webgazer.setGazeListener((data, elapsedTime) => {
    _gazeData.push({
      timestamp_ms: Date.now(),
      x: data ? data.x.toFixed(1) : "",
      y: data ? data.y.toFixed(1) : "",
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      trial_number: _currentTrial,
      event_type: "gaze",
    });
  });
  logGaze("gaze_collection_started");
}
```

- [ ] **Step 2: Add trial marker functions**

Append to `assessments/webgazer/webgazer.js`:

```js
/**
 * Inserts a trial_end marker row and logs the event.
 */
export function markTrialEnd() {
  _gazeData.push({
    timestamp_ms: Date.now(),
    x: "",
    y: "",
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    trial_number: _currentTrial,
    event_type: "trial_end",
  });
  logGaze("trial_end", { trial: _currentTrial });
}

/**
 * Increments the trial counter and inserts a trial_start marker row.
 */
export function markTrialStart() {
  _currentTrial++;
  _gazeData.push({
    timestamp_ms: Date.now(),
    x: "",
    y: "",
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    trial_number: _currentTrial,
    event_type: "trial_start",
  });
  logGaze("trial_start", { trial: _currentTrial });
}
```

- [ ] **Step 3: Commit**

```bash
git add assessments/webgazer/webgazer.js
git commit -m "feat(webgazer): add gaze data collection and trial markers"
```

---

### Task 4: Add CSV Export & Delivery

**Files:**
- Modify: `assessments/webgazer/webgazer.js`

**Reference:** Delivery pipeline in `assessments/webcam/webcam.js` lines 208-316

- [ ] **Step 1: Add CSV builder and delivery function**

Append to `assessments/webgazer/webgazer.js`:

```js
// ── CSV export & delivery ───────────────────────────────────────

/**
 * Stops gaze collection, builds a CSV from collected data, and delivers
 * it via the same pipeline as webcam recordings (postMessage for Telegram,
 * Web Share API, or download fallback).
 */
export async function stopAndExportGaze(filenamePrefix) {
  // Stop predictions
  if (_webgazer) {
    try {
      _webgazer.clearGazeListener();
      _webgazer.pause();
    } catch (_) {}
  }
  _gazeListenerActive = false;

  // Insert final trial_end if we have an active trial
  if (_currentTrial > 0) {
    _gazeData.push({
      timestamp_ms: Date.now(),
      x: "",
      y: "",
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      trial_number: _currentTrial,
      event_type: "trial_end",
    });
  }

  logGaze("export_start", { totalSamples: _gazeData.length });

  if (_gazeData.length === 0) {
    logGaze("export_skip", "no data collected");
    cleanup();
    return;
  }

  // Build CSV
  const header = "timestamp_ms,x,y,viewport_width,viewport_height,trial_number,event_type";
  const rows = _gazeData.map((d) =>
    `${d.timestamp_ms},${d.x},${d.y},${d.viewport_width},${d.viewport_height},${d.trial_number},${d.event_type}`
  );
  const csv = header + "\n" + rows.join("\n") + "\n";

  const filename = `${filenamePrefix}-gaze-${Date.now()}.csv`;
  const blob = new Blob([csv], { type: "text/csv" });
  const file = new File([blob], filename, { type: "text/csv" });

  logGaze("csv_built", { rows: _gazeData.length, sizeBytes: blob.size, filename });

  // Delivery pipeline (mirrors webcam.js stopAndDownloadRecording)
  const isTelegram = _source === "telegram";
  const hasShare = typeof navigator.share === "function";
  const canShareFiles = hasShare && typeof navigator.canShare === "function"
    ? navigator.canShare({ files: [file] })
    : false;

  // 1. Telegram: postMessage to parent frame
  if (isTelegram && window.parent !== window) {
    try {
      logGaze("postMessage_to_parent", { blobSize: blob.size });
      window.parent.postMessage({
        type: "webgazer-gaze-data",
        blob: blob,
        filename: filename,
        mimeType: "text/csv",
      }, "*");
      logGaze("postMessage_sent");
      cleanup();
      return;
    } catch (e) {
      logGaze("postMessage_error", { name: e.name, message: e.message });
    }
  }

  // 2. Web Share API (mobile, non-iframe)
  if (hasShare && canShareFiles) {
    try {
      logGaze("share_api_called");
      await navigator.share({ files: [file] });
      logGaze("share_api_success");
      cleanup();
      return;
    } catch (e) {
      logGaze("share_api_error", { name: e.name, message: e.message });
      if (e.name === "AbortError") {
        cleanup();
        return;
      }
    }
  }

  // 3. postMessage fallback (non-Telegram iframe)
  if (window.parent !== window) {
    try {
      logGaze("postMessage_to_parent", { blobSize: blob.size });
      window.parent.postMessage({
        type: "webgazer-gaze-data",
        blob: blob,
        filename: filename,
        mimeType: "text/csv",
      }, "*");
      logGaze("postMessage_sent");
      cleanup();
      return;
    } catch (e) {
      logGaze("postMessage_error", { name: e.name, message: e.message });
    }
  }

  // 4. Desktop fallback: <a download>
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) {
    logGaze("fallback_a_download");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 3000);
    cleanup();
    return;
  }

  logGaze("export_failed", "No supported delivery method available");
  cleanup();
}

function cleanup() {
  if (_webgazer) {
    try { _webgazer.end(); } catch (_) {}
  }
  logGaze("webgazer_ended");
}
```

- [ ] **Step 2: Commit**

```bash
git add assessments/webgazer/webgazer.js
git commit -m "feat(webgazer): add CSV export and delivery pipeline"
```

---

### Task 5: Integrate into PVT-BA

**Files:**
- Modify: `assessments/pvt-ba/index.js`

**Reference:** Current file structure at `assessments/pvt-ba/index.js` (152 lines). The webcam integration pattern at lines 3, 36-45, 60-63, 136-149.

- [ ] **Step 1: Add webgazer module loading**

In `assessments/pvt-ba/index.js`, add after the webcam module variable declaration (line 3):

```js
let webgazerModule = null;
```

Add after the webcam loading block (after line 45):

```js
// webgazer=1 or webgazer=true enables the optional eye tracking feature
const webgazerParam = params.get("webgazer");
const webgazerEnabled = webgazerParam === "1" || webgazerParam === "true";
if (webgazerEnabled) {
  try {
    webgazerModule = await import("../webgazer/webgazer.js");
    webgazerModule.initGazeLogger(token, callbackUrl);
  } catch (e) {
    console.warn("[PVT-BA] Could not load webgazer module:", e);
  }
}
```

- [ ] **Step 2: Add trial markers to onActivityData**

Modify the `session.onActivityData` callback (currently at line 53-58). Add webgazer markers **before** the existing `allTrialData.push`:

Change:
```js
session.onActivityData((ev) => {
  allTrialData.push(ev.newData);
  if (debugMode) {
    console.log("[PVT-BA debug] trial data:", ev.newData);
  }
});
```

To:
```js
session.onActivityData((ev) => {
  if (webgazerModule) webgazerModule.markTrialEnd();
  if (webgazerModule) webgazerModule.markTrialStart();
  allTrialData.push(ev.newData);
  if (debugMode) {
    console.log("[PVT-BA debug] trial data:", ev.newData);
  }
});
```

- [ ] **Step 3: Add gaze export to onEnd**

In the `session.onEnd` callback (line 60), add **before** the webcam stop:

Change:
```js
session.onEnd(async () => {
  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "pvt-ba");
  }
```

To:
```js
session.onEnd(async () => {
  if (webgazerModule) {
    try {
      await webgazerModule.stopAndExportGaze("pvt-ba");
    } catch (e) {
      console.warn("[PVT-BA] Gaze export failed:", e);
    }
  }

  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "pvt-ba");
  }
```

- [ ] **Step 4: Add consent + calibration + start collection before session.initialize**

In the section before `session.initialize()` (around line 136-149), add **after** the webcam consent/recording block:

```js
// WebGazer: consent → init → calibrate → start collection
if (webgazerEnabled && webgazerModule) {
  const accepted = await webgazerModule.showGazeConsentOverlay();
  if (accepted) {
    try {
      await webgazerModule.initWebGazer();
      await webgazerModule.runCalibration();
      webgazerModule.startGazeCollection();
      webgazerModule.markTrialStart();
    } catch (e) {
      console.warn("[PVT-BA] Eye tracking unavailable, proceeding without it.", e);
    }
  }
}
```

This goes right before `session.initialize();`.

- [ ] **Step 5: Test manually**

Open PVT-BA with webgazer enabled:
```
http://localhost:8000/?assessment=pvt-ba&webgazer=1
```

Verify:
1. Eye tracking consent overlay appears
2. After accepting, 5-point calibration runs
3. Task runs normally
4. On session end, a CSV file downloads
5. CSV contains: calibration rows (trial 0), trial_start/trial_end markers, gaze rows with x/y coordinates

Also test `?webcam=1&webgazer=1` to verify both work simultaneously.

- [ ] **Step 6: Commit**

```bash
git add assessments/pvt-ba/index.js
git commit -m "feat(webgazer): integrate eye tracking into PVT-BA assessment"
```

---

### Task 6: Integrate into Prices

**Files:**
- Modify: `assessments/prices/index.js`

**Reference:** Current file at `assessments/prices/index.js` (165 lines). Same pattern as PVT-BA — webcam integration at lines 3, 48-57, 72-75, 149-163.

- [ ] **Step 1: Add webgazer module loading**

After line 3 (`let webcamModule = null;`), add:
```js
let webgazerModule = null;
```

After the webcam loading block (after line 57), add:
```js
// webgazer=1 or webgazer=true enables the optional eye tracking feature
const webgazerParam = params.get("webgazer");
const webgazerEnabled = webgazerParam === "1" || webgazerParam === "true";
if (webgazerEnabled) {
  try {
    webgazerModule = await import("../webgazer/webgazer.js");
    webgazerModule.initGazeLogger(token, callbackUrl);
  } catch (e) {
    console.warn("[Prices] Could not load webgazer module:", e);
  }
}
```

- [ ] **Step 2: Add trial markers to onActivityData**

Change `session.onActivityData` (line 65-70):

From:
```js
session.onActivityData((ev) => {
  allTrialData.push(ev.newData);
  if (debugMode) {
    console.log("[Prices debug] trial data:", ev.newData);
  }
});
```

To:
```js
session.onActivityData((ev) => {
  if (webgazerModule) webgazerModule.markTrialEnd();
  if (webgazerModule) webgazerModule.markTrialStart();
  allTrialData.push(ev.newData);
  if (debugMode) {
    console.log("[Prices debug] trial data:", ev.newData);
  }
});
```

- [ ] **Step 3: Add gaze export to onEnd**

Change `session.onEnd` (line 72):

From:
```js
session.onEnd(async () => {
  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "prices");
  }
```

To:
```js
session.onEnd(async () => {
  if (webgazerModule) {
    try {
      await webgazerModule.stopAndExportGaze("prices");
    } catch (e) {
      console.warn("[Prices] Gaze export failed:", e);
    }
  }

  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "prices");
  }
```

- [ ] **Step 4: Add consent + calibration before session.initialize**

After the webcam consent/recording block (after line 163), add before `session.initialize();`:

```js
// WebGazer: consent → init → calibrate → start collection
if (webgazerEnabled && webgazerModule) {
  const accepted = await webgazerModule.showGazeConsentOverlay();
  if (accepted) {
    try {
      await webgazerModule.initWebGazer();
      await webgazerModule.runCalibration();
      webgazerModule.startGazeCollection();
      webgazerModule.markTrialStart();
    } catch (e) {
      console.warn("[Prices] Eye tracking unavailable, proceeding without it.", e);
    }
  }
}
```

- [ ] **Step 5: Test manually**

```
http://localhost:8000/?assessment=prices&webgazer=1
```

Verify same checklist as Task 5 Step 5.

- [ ] **Step 6: Commit**

```bash
git add assessments/prices/index.js
git commit -m "feat(webgazer): integrate eye tracking into Prices assessment"
```

---

### Task 7: Integrate into Symbol Search

**Files:**
- Modify: `assessments/@m2c2kit/assessment-symbol-search@0.8.33/index.js`

**Reference:** Current file (213 lines). Uses `context.urlParams` pattern. Webcam integration at lines 3, 52-62, 94-97, 196-209. Note the `../../webgazer/` import path (two levels deep).

- [ ] **Step 1: Add webgazer module loading**

After line 3 (`let webcamModule = null;`), add:
```js
let webgazerModule = null;
```

After the webcam loading block (after line 61), add:
```js
// webgazer=1 or webgazer=true enables the optional eye tracking feature
const webgazerParam = context.urlParams.get("webgazer");
const webgazerEnabled = webgazerParam === "1" || webgazerParam === "true";
if (webgazerEnabled) {
  try {
    webgazerModule = await import("../../webgazer/webgazer.js");
    webgazerModule.initGazeLogger(context.urlParams.get("token"), context.urlParams.get("callback_url"));
  } catch (e) {
    console.warn("[Symbol Search] Could not load webgazer module:", e);
  }
}
context.urlParams.delete("webgazer");
```

Note: `context.urlParams.delete("webgazer")` is required here because `setGameParametersFromUrlParams` forwards all remaining URL params to the game engine.

- [ ] **Step 2: Add trial markers to onActivityData**

Change `session.onActivityData` (line 90-92):

From:
```js
session.onActivityData((ev) => {
  allTrialData.push(ev.newData);
});
```

To:
```js
session.onActivityData((ev) => {
  if (webgazerModule) webgazerModule.markTrialEnd();
  if (webgazerModule) webgazerModule.markTrialStart();
  allTrialData.push(ev.newData);
});
```

- [ ] **Step 3: Add gaze export to onEnd**

Change `session.onEnd` (line 94):

From:
```js
session.onEnd(async () => {
  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "symbol-search");
  }
```

To:
```js
session.onEnd(async () => {
  if (webgazerModule) {
    try {
      await webgazerModule.stopAndExportGaze("symbol-search");
    } catch (e) {
      console.warn("[Symbol Search] Gaze export failed:", e);
    }
  }

  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "symbol-search");
  }
```

- [ ] **Step 4: Add consent + calibration before session.initialize**

After the webcam consent/recording block (after line 209), add before `setGameParametersFromUrlParams(assessment, context.urlParams);`:

```js
// WebGazer: consent → init → calibrate → start collection
if (webgazerEnabled && webgazerModule) {
  const accepted = await webgazerModule.showGazeConsentOverlay();
  if (accepted) {
    try {
      await webgazerModule.initWebGazer();
      await webgazerModule.runCalibration();
      webgazerModule.startGazeCollection();
      webgazerModule.markTrialStart();
    } catch (e) {
      console.warn("[Symbol Search] Eye tracking unavailable, proceeding without it.", e);
    }
  }
}
```

- [ ] **Step 5: Test manually**

```
http://localhost:8000/?assessment=@m2c2kit/assessment-symbol-search@0.8.33&webgazer=1
```

Verify same checklist as Task 5 Step 5.

- [ ] **Step 6: Commit**

```bash
git add "assessments/@m2c2kit/assessment-symbol-search@0.8.33/index.js"
git commit -m "feat(webgazer): integrate eye tracking into Symbol Search assessment"
```

---

### Task 8: Integrate into Color Shapes

**Files:**
- Modify: `assessments/@m2c2kit/assessment-color-shapes@0.8.33/index.js`

**Reference:** Current file (213 lines). Same `context.urlParams` pattern as Symbol Search. Webcam at lines 3, 52-62, 94-97, 196-209. Same `../../webgazer/` path.

- [ ] **Step 1: Add webgazer module loading**

After line 3 (`let webcamModule = null;`), add:
```js
let webgazerModule = null;
```

After the webcam loading block (after line 61), add:
```js
// webgazer=1 or webgazer=true enables the optional eye tracking feature
const webgazerParam = context.urlParams.get("webgazer");
const webgazerEnabled = webgazerParam === "1" || webgazerParam === "true";
if (webgazerEnabled) {
  try {
    webgazerModule = await import("../../webgazer/webgazer.js");
    webgazerModule.initGazeLogger(context.urlParams.get("token"), context.urlParams.get("callback_url"));
  } catch (e) {
    console.warn("[Color Shapes] Could not load webgazer module:", e);
  }
}
context.urlParams.delete("webgazer");
```

- [ ] **Step 2: Add trial markers to onActivityData**

Change `session.onActivityData` (line 90-92):

From:
```js
session.onActivityData((ev) => {
  allTrialData.push(ev.newData);
});
```

To:
```js
session.onActivityData((ev) => {
  if (webgazerModule) webgazerModule.markTrialEnd();
  if (webgazerModule) webgazerModule.markTrialStart();
  allTrialData.push(ev.newData);
});
```

- [ ] **Step 3: Add gaze export to onEnd**

Change `session.onEnd` (line 94):

From:
```js
session.onEnd(async () => {
  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "color-shapes");
  }
```

To:
```js
session.onEnd(async () => {
  if (webgazerModule) {
    try {
      await webgazerModule.stopAndExportGaze("color-shapes");
    } catch (e) {
      console.warn("[Color Shapes] Gaze export failed:", e);
    }
  }

  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "color-shapes");
  }
```

- [ ] **Step 4: Add consent + calibration before session.initialize**

After the webcam consent/recording block (after line 209), add before `setGameParametersFromUrlParams(assessment, context.urlParams);`:

```js
// WebGazer: consent → init → calibrate → start collection
if (webgazerEnabled && webgazerModule) {
  const accepted = await webgazerModule.showGazeConsentOverlay();
  if (accepted) {
    try {
      await webgazerModule.initWebGazer();
      await webgazerModule.runCalibration();
      webgazerModule.startGazeCollection();
      webgazerModule.markTrialStart();
    } catch (e) {
      console.warn("[Color Shapes] Eye tracking unavailable, proceeding without it.", e);
    }
  }
}
```

- [ ] **Step 5: Test manually**

```
http://localhost:8000/?assessment=@m2c2kit/assessment-color-shapes@0.8.33&webgazer=1
```

Verify same checklist as Task 5 Step 5.

- [ ] **Step 6: Commit**

```bash
git add "assessments/@m2c2kit/assessment-color-shapes@0.8.33/index.js"
git commit -m "feat(webgazer): integrate eye tracking into Color Shapes assessment"
```

---

### Task 9: End-to-End Smoke Test

No file changes. Verification only.

- [ ] **Step 1: Test webgazer-only on all four assessments**

Test each URL (use a local server, e.g. `npx serve .`):

```
/?assessment=pvt-ba&webgazer=1
/?assessment=prices&webgazer=1
/?assessment=@m2c2kit/assessment-symbol-search@0.8.33&webgazer=1
/?assessment=@m2c2kit/assessment-color-shapes@0.8.33&webgazer=1
```

For each, verify:
- [ ] Consent overlay appears with eye tracking messaging
- [ ] Declining consent proceeds to task normally (no errors in console)
- [ ] Accepting → calibration runs (5 dots, each shrinks over 2s)
- [ ] Task runs normally during gaze collection
- [ ] CSV downloads on session end
- [ ] CSV contains header row + calibration rows + trial markers + gaze rows

- [ ] **Step 2: Test combined webcam + webgazer**

```
/?assessment=pvt-ba&webcam=1&webgazer=1
```

Verify:
- [ ] Webcam consent appears first, then eye tracking consent
- [ ] Both can be accepted independently
- [ ] Video recording AND CSV export both work on session end
- [ ] No camera permission errors from dual streams

- [ ] **Step 3: Test on mobile viewport**

Use Chrome DevTools → Device Mode (iPhone 14, Pixel 7). For each assessment:
- [ ] Calibration dots are visible and within screen bounds (15% inset)
- [ ] Dots are large enough to see (~40px minimum)
- [ ] No layout overflow or scroll during calibration

- [ ] **Step 4: Inspect CSV data quality**

Open a downloaded CSV. Verify:
- [ ] Header: `timestamp_ms,x,y,viewport_width,viewport_height,trial_number,event_type`
- [ ] Calibration rows: `event_type=calibration`, `trial_number=0`, x/y at expected dot positions
- [ ] `trial_start` row before first gaze row of each trial
- [ ] `trial_end` row after last gaze row of each trial
- [ ] Gaze rows have numeric x/y values (or empty for null predictions)
- [ ] `viewport_width`/`viewport_height` populated on every row
- [ ] Timestamps are monotonically increasing
