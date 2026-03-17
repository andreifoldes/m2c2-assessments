/**
 * Shared eye tracking pipeline for m2c2kit cognitive assessments.
 *
 * Provides: consent overlay -> WebGazer.js initialization -> 5-point
 * calibration -> gaze data collection with trial markers -> CSV export.
 *
 * Usage in any assessment index.js:
 *   import { initGazeLogger, showGazeConsentOverlay, initWebGazer,
 *            runCalibration, startGazeCollection, markTrialStart,
 *            markTrialEnd, stopAndExportGaze }
 *     from "../webgazer/webgazer.js";   // adjust relative path as needed
 */

// -- Remote logging --------------------------------------------------------
// Call initGazeLogger(token, callbackUrl) early. All subsequent
// logGaze() calls send events to the server for debugging.
let _logEndpoint = null;
let _logToken = null;
let _source = null;

export function initGazeLogger(token, callbackUrl) {
  _logToken = token;
  // Read source parameter from URL (e.g. ?source=telegram)
  try {
    _source = new URLSearchParams(window.location.search).get("source");
  } catch (_) {}
  if (callbackUrl) {
    // Derive log endpoint from callback_url:
    // e.g. https://host/api/v1/cognitive/complete -> https://host/api/v1/webgazer/log
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
    }).catch(() => {}); // fire-and-forget
  }
}

// -- Gaze data storage -----------------------------------------------------
const _gazeData = [];
let _currentTrial = 0;
let _gazeListenerActive = false;
let _lastGazeTimestamp = null;
let _webgazer = null;

// -- Consent overlay -------------------------------------------------------

/**
 * Shows a full-screen consent overlay before the session starts.
 * Resolves true if the participant accepts, false if they decline.
 */
export function showGazeConsentOverlay() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "gaze-consent-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
      box-sizing: border-box;
      font-family: sans-serif;
      color: #222;
      text-align: center;
    `;

    const isTelegram = _source === "telegram";
    const storageMsg = isTelegram
      ? "If you agree, your eye movements will be tracked while you complete the task. " +
        "<strong>The gaze data will be sent to you in Telegram</strong> when the task ends."
      : "If you agree, your eye movements will be tracked while you complete the task. " +
        "<strong>The gaze data is saved only on your device</strong> — it is never " +
        "uploaded or shared. You will be prompted to download it when the task ends.";

    overlay.innerHTML = `
      <div style="max-width: 420px; width: 100%;">
        <div style="font-size: 48px; margin-bottom: 16px;">\u{1F441}\uFE0F</div>
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
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 10px;
            background: #2e7d32;
            color: #fff;
            cursor: pointer;
          ">Allow Eye Tracking</button>
          <button id="gaze-consent-decline" style="
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 500;
            border: 1.5px solid #bbb;
            border-radius: 10px;
            background: #fff;
            color: #555;
            cursor: pointer;
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

// -- WebGazer initialization -----------------------------------------------

/**
 * Loads WebGazer.js from CDN and initializes it with hidden preview.
 * Stores the instance in the module-level _webgazer variable.
 */
export async function initWebGazer() {
  logGaze("webgazer_loading");

  // Load WebGazer from CDN via script tag
  await new Promise((resolve, reject) => {
    if (window.webgazer) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/webgazer@2.1.3/dist/webgazer.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load WebGazer from CDN"));
    document.head.appendChild(script);
  });

  logGaze("webgazer_loaded");

  _webgazer = window.webgazer;

  // Configure before begin()
  _webgazer
    .setRegression("ridge")
    .saveDataAcrossSessions(false)
    .showVideo(false)
    .showPredictionPoints(false)
    .showFaceOverlay(false)
    .showFaceFeedbackBox(false)
    .applyKalmanFilter(true);

  await _webgazer.begin();

  // begin() creates DOM elements; hide them again
  _webgazer.showVideo(false);
  _webgazer.showPredictionPoints(false);

  logGaze("webgazer_initialized");
}

// -- 5-point calibration ---------------------------------------------------

/**
 * Runs a 5-point gaze-based calibration UI.
 * Shows dots at known viewport positions and dispatches synthetic clicks
 * to train the WebGazer regression model.
 * Returns a Promise that resolves when calibration is complete.
 */
export function runCalibration() {
  return new Promise((resolve) => {
    logGaze("calibration_start");

    const overlay = document.createElement("div");
    overlay.id = "gaze-calibration-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
      color: #fff;
    `;

    // Instruction text
    const instruction = document.createElement("div");
    instruction.style.cssText = `
      position: absolute;
      top: 10%;
      font-size: 18px;
      font-weight: 500;
      text-align: center;
      padding: 0 24px;
    `;
    instruction.textContent = "Look at each dot until it disappears";
    overlay.appendChild(instruction);

    // Progress indicator
    const progress = document.createElement("div");
    progress.style.cssText = `
      position: absolute;
      bottom: 10%;
      font-size: 16px;
      color: rgba(255, 255, 255, 0.7);
    `;
    overlay.appendChild(progress);

    document.body.appendChild(overlay);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dotSize = Math.max(40, Math.min(vw, vh) * 0.06);

    // 5 calibration points: center first, then corners
    const points = [
      { fx: 0.5, fy: 0.5 },
      { fx: 0.15, fy: 0.15 },
      { fx: 0.85, fy: 0.15 },
      { fx: 0.15, fy: 0.85 },
      { fx: 0.85, fy: 0.85 },
    ];

    let pointIndex = 0;

    function showNextPoint() {
      if (pointIndex >= points.length) {
        logGaze("calibration_complete", { points: points.length });
        overlay.remove();
        resolve();
        return;
      }

      const { fx, fy } = points[pointIndex];
      const px = fx * vw;
      const py = fy * vh;

      progress.textContent = `${pointIndex + 1} / ${points.length}`;

      // Create calibration dot
      const dot = document.createElement("div");
      dot.style.cssText = `
        position: absolute;
        left: ${px - dotSize / 2}px;
        top: ${py - dotSize / 2}px;
        width: ${dotSize}px;
        height: ${dotSize}px;
        border-radius: 50%;
        background: #4caf50;
        transition: transform 2s linear;
      `;
      overlay.appendChild(dot);

      // Shrink dot as visual timer feedback
      requestAnimationFrame(() => {
        dot.style.transform = "scale(0.3)";
      });

      // Dispatch synthetic clicks every 100ms to train WebGazer
      const duration = 2000;
      const interval = 100;
      let elapsed = 0;

      const clickTimer = setInterval(() => {
        elapsed += interval;

        // Record calibration sample
        _gazeData.push({
          timestamp_ms: Date.now(),
          x: px.toFixed(1),
          y: py.toFixed(1),
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          trial_number: 0,
          event_type: "calibration",
          sample_interval_ms: "",
        });

        // Dispatch click event at dot position to train WebGazer
        const clickEvent = new MouseEvent("click", {
          clientX: px,
          clientY: py,
          bubbles: true,
        });
        document.dispatchEvent(clickEvent);

        if (elapsed >= duration) {
          clearInterval(clickTimer);
          dot.remove();
          pointIndex++;
          // Brief pause between points
          setTimeout(showNextPoint, 300);
        }
      }, interval);
    }

    // Start calibration after a short delay for participant to read instructions
    setTimeout(showNextPoint, 1500);
  });
}

// -- Gaze data collection --------------------------------------------------

/**
 * Begins recording gaze data via WebGazer's setGazeListener.
 * Each gaze sample is pushed to the _gazeData array.
 */
export function startGazeCollection() {
  if (_gazeListenerActive) return;
  _gazeListenerActive = true;
  logGaze("collection_start");

  _webgazer.setGazeListener((data, _timestamp) => {
    const now = Date.now();
    const interval = _lastGazeTimestamp != null ? now - _lastGazeTimestamp : "";
    _lastGazeTimestamp = now;
    _gazeData.push({
      timestamp_ms: now,
      x: data && data.x != null ? data.x.toFixed(1) : "",
      y: data && data.y != null ? data.y.toFixed(1) : "",
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      trial_number: _currentTrial,
      event_type: "gaze",
      sample_interval_ms: interval,
    });
  });
}

// -- Trial markers ---------------------------------------------------------

/**
 * Inserts a trial_start marker and increments the trial counter.
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
    sample_interval_ms: "",
  });
  logGaze("trial_start", { trial: _currentTrial });
}

/**
 * Inserts a trial_end marker for the current trial.
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
    sample_interval_ms: "",
  });
  logGaze("trial_end", { trial: _currentTrial });
}

// -- CSV export & delivery -------------------------------------------------

/**
 * Stops gaze collection, builds a CSV from collected data, and delivers
 * the file using the same cascade as webcam.js: Telegram postMessage ->
 * Web Share API -> postMessage fallback -> desktop <a download>.
 * Cleans up WebGazer resources after delivery.
 */
export async function stopAndExportGaze(filenamePrefix) {
  logGaze("export_start", { samples: _gazeData.length });

  // Stop the gaze listener and pause prediction
  if (_webgazer) {
    try { _webgazer.clearGazeListener(); } catch (_) {}
    try { _webgazer.pause(); } catch (_) {}
  }
  _gazeListenerActive = false;

  // Insert final trial_end marker if a trial is in progress
  if (_currentTrial > 0) {
    const lastEntry = _gazeData[_gazeData.length - 1];
    if (!lastEntry || lastEntry.event_type !== "trial_end") {
      markTrialEnd();
    }
  }

  // Build CSV
  const header = "timestamp_ms,x,y,viewport_width,viewport_height,trial_number,event_type,sample_interval_ms";
  const rows = _gazeData.map((r) =>
    `${r.timestamp_ms},${r.x},${r.y},${r.viewport_width},${r.viewport_height},${r.trial_number},${r.event_type},${r.sample_interval_ms}`
  );
  const csv = [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const filename = `${filenamePrefix}-gaze-${Date.now()}.csv`;
  const mimeType = "text/csv";
  const file = new File([blob], filename, { type: mimeType });

  logGaze("export_ready", {
    samples: _gazeData.length,
    blobSize: blob.size,
    filename,
  });

  const isTelegram = _source === "telegram";
  const hasShare = typeof navigator.share === "function";
  const canShareFiles = hasShare && typeof navigator.canShare === "function"
    ? navigator.canShare({ files: [file] })
    : false;
  logGaze("download_attempt", {
    hasShare,
    canShareFiles,
    source: _source,
    inIframe: window.parent !== window,
  });

  // 1. Telegram: send blob to parent frame for server upload
  if (isTelegram && window.parent !== window) {
    try {
      logGaze("postMessage_to_parent", { blobSize: blob.size });
      window.parent.postMessage({
        type: "webgazer-gaze-data",
        blob: blob,
        filename: filename,
        mimeType: mimeType,
      }, "*");
      logGaze("postMessage_sent");
      cleanup();
      return;
    } catch (e) {
      logGaze("postMessage_error", { name: e.name, message: e.message });
    }
  }

  // 2. Web Share API (works on mobile when not in iframe)
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

  // 3. postMessage fallback (non-Telegram iframe contexts)
  if (window.parent !== window) {
    try {
      logGaze("postMessage_to_parent", { blobSize: blob.size });
      window.parent.postMessage({
        type: "webgazer-gaze-data",
        blob: blob,
        filename: filename,
        mimeType: mimeType,
      }, "*");
      logGaze("postMessage_sent");
      cleanup();
      return;
    } catch (e) {
      logGaze("postMessage_error", { name: e.name, message: e.message });
    }
  }

  // 4. Desktop <a download> fallback (non-mobile)
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

  logGaze("download_failed", "No supported download method available");
  cleanup();

  function cleanup() {
    if (_webgazer) {
      try { _webgazer.end(); } catch (_) {}
    }
    logGaze("export_complete");
  }
}
