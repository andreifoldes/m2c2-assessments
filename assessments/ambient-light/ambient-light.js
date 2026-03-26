/**
 * Ambient light sensor pipeline for m2c2kit cognitive assessments.
 *
 * Records continuous illuminance (lux) readings from the browser's
 * AmbientLightSensor API with trial markers, then exports as CSV.
 *
 * The AmbientLightSensor API requires:
 *   - A secure context (HTTPS)
 *   - Chrome/Edge 56+ (behind flag in some versions)
 *   - The 'ambient-light-sensor' permission policy
 *
 * Usage in any assessment index.js:
 *   import { initLightLogger, showLightConsentOverlay,
 *            startLightCollection, markTrialStart, markTrialEnd,
 *            stopAndExportLight, isAmbientLightSupported }
 *     from "../ambient-light/ambient-light.js";
 */

// -- Remote logging --------------------------------------------------------
let _logEndpoint = null;
let _logToken = null;
let _source = null;

export function initLightLogger(token, callbackUrl) {
  _logToken = token;
  try {
    _source = new URLSearchParams(window.location.search).get("source");
  } catch (_) {}
  if (callbackUrl) {
    try {
      const url = new URL(callbackUrl);
      url.pathname = url.pathname.replace(
        /\/cognitive\/complete$/,
        "/ambient-light/log"
      );
      _logEndpoint = url.toString();
    } catch (_) {
      _logEndpoint = null;
    }
  }
}

function logLight(event, detail) {
  const entry = {
    token: _logToken,
    event,
    detail: typeof detail === "string" ? detail : JSON.stringify(detail),
  };
  console.log(`[ambient-light] ${event}`, detail || "");
  if (_logEndpoint) {
    fetch(_logEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {}); // fire-and-forget
  }
}

// -- Light data storage ----------------------------------------------------
const _lightData = [];
let _currentTrial = 0;
let _sensor = null;
let _collecting = false;
let _lastSampleTimestamp = null;

// Sampling interval in ms (~10 Hz is sufficient for ambient light changes)
const SAMPLING_INTERVAL_MS = 100;

// -- Feature detection -----------------------------------------------------

/**
 * Checks whether the AmbientLightSensor API is available in this browser.
 */
export function isAmbientLightSupported() {
  return "AmbientLightSensor" in window;
}

// -- Consent overlay -------------------------------------------------------

/**
 * Shows a full-screen consent overlay before starting light data collection.
 * Resolves true if the participant accepts, false if they decline.
 */
export function showLightConsentOverlay() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "light-consent-overlay";
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
      ? "If you agree, your device's ambient light level will be recorded while " +
        "you complete the task. <strong>The light data will be sent to you in " +
        "Telegram</strong> when the task ends."
      : "If you agree, your device's ambient light level will be recorded while " +
        "you complete the task. <strong>The light data is saved only on your " +
        "device</strong> \u2014 it is never uploaded or shared. You will be " +
        "prompted to download it when the task ends.";

    overlay.innerHTML = `
      <div style="max-width: 420px; width: 100%;">
        <div style="font-size: 48px; margin-bottom: 16px;">\u2600\uFE0F</div>
        <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #111;">
          Optional Light Sensing
        </h2>
        <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #444;">
          The researcher has enabled optional ambient light recording for this session.
        </p>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #444;">
          ${storageMsg}
        </p>
        <p style="margin: 0 0 28px; font-size: 14px; color: #666;">
          You can decline and still complete the task normally.
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="light-consent-accept" style="
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 10px;
            background: #e65100;
            color: #fff;
            cursor: pointer;
          ">Allow Light Sensing</button>
          <button id="light-consent-decline" style="
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 500;
            border: 1.5px solid #bbb;
            border-radius: 10px;
            background: #fff;
            color: #555;
            cursor: pointer;
          ">No thanks, continue without light sensing</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    logLight("consent_shown");

    document
      .getElementById("light-consent-accept")
      .addEventListener("click", () => {
        logLight("consent_accepted");
        overlay.remove();
        resolve(true);
      });

    document
      .getElementById("light-consent-decline")
      .addEventListener("click", () => {
        logLight("consent_declined");
        overlay.remove();
        resolve(false);
      });
  });
}

// -- Sensor initialization & collection ------------------------------------

/**
 * Creates the AmbientLightSensor and begins recording illuminance values.
 * Readings are throttled to ~10 Hz (one sample per SAMPLING_INTERVAL_MS).
 * Throws if the sensor cannot be created (permission denied, not supported).
 */
export function startLightCollection() {
  if (_collecting) return;

  logLight("collection_start", { sampling_interval_ms: SAMPLING_INTERVAL_MS });

  try {
    _sensor = new AmbientLightSensor({ frequency: 10 });
  } catch (err) {
    logLight("sensor_create_error", {
      name: err.name,
      message: err.message,
    });
    throw err;
  }

  _sensor.addEventListener("reading", () => {
    const now = Date.now();
    // Throttle: skip if less than SAMPLING_INTERVAL_MS since last sample
    if (
      _lastSampleTimestamp != null &&
      now - _lastSampleTimestamp < SAMPLING_INTERVAL_MS
    ) {
      return;
    }
    const interval =
      _lastSampleTimestamp != null ? now - _lastSampleTimestamp : "";
    _lastSampleTimestamp = now;

    _lightData.push({
      timestamp_ms: now,
      illuminance_lux: _sensor.illuminance,
      trial_number: _currentTrial,
      event_type: "reading",
      sample_interval_ms: interval,
    });
  });

  _sensor.addEventListener("error", (event) => {
    logLight("sensor_error", {
      name: event.error.name,
      message: event.error.message,
    });
  });

  _sensor.start();
  _collecting = true;
  logLight("sensor_started");
}

// -- Trial markers ---------------------------------------------------------

/**
 * Inserts a trial_start marker and increments the trial counter.
 */
export function markTrialStart() {
  _currentTrial++;
  _lightData.push({
    timestamp_ms: Date.now(),
    illuminance_lux: _sensor ? _sensor.illuminance : "",
    trial_number: _currentTrial,
    event_type: "trial_start",
    sample_interval_ms: "",
  });
  logLight("trial_start", { trial: _currentTrial });
}

/**
 * Inserts a trial_end marker for the current trial.
 */
export function markTrialEnd() {
  _lightData.push({
    timestamp_ms: Date.now(),
    illuminance_lux: _sensor ? _sensor.illuminance : "",
    trial_number: _currentTrial,
    event_type: "trial_end",
    sample_interval_ms: "",
  });
  logLight("trial_end", { trial: _currentTrial });
}

// -- CSV export & delivery -------------------------------------------------

/**
 * Stops the sensor, builds a CSV from collected data, and delivers
 * the file using the same cascade as webgazer.js: Telegram postMessage ->
 * Web Share API -> postMessage fallback -> desktop <a download>.
 */
export async function stopAndExportLight(filenamePrefix) {
  logLight("export_start", { samples: _lightData.length });

  // Stop the sensor
  if (_sensor) {
    try {
      _sensor.stop();
    } catch (_) {}
  }
  _collecting = false;

  // Insert final trial_end marker if a trial is in progress
  if (_currentTrial > 0) {
    const lastEntry = _lightData[_lightData.length - 1];
    if (!lastEntry || lastEntry.event_type !== "trial_end") {
      markTrialEnd();
    }
  }

  // Build CSV
  const header =
    "timestamp_ms,illuminance_lux,trial_number,event_type,sample_interval_ms";
  const rows = _lightData.map(
    (r) =>
      `${r.timestamp_ms},${r.illuminance_lux},${r.trial_number},${r.event_type},${r.sample_interval_ms}`
  );
  const csv = [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const filename = `${filenamePrefix}-light-${Date.now()}.csv`;
  const mimeType = "text/csv";
  const file = new File([blob], filename, { type: mimeType });

  logLight("export_ready", {
    samples: _lightData.length,
    blobSize: blob.size,
    filename,
  });

  const isTelegram = _source === "telegram";
  const hasShare = typeof navigator.share === "function";
  const canShareFiles =
    hasShare && typeof navigator.canShare === "function"
      ? navigator.canShare({ files: [file] })
      : false;
  logLight("download_attempt", {
    hasShare,
    canShareFiles,
    source: _source,
    inIframe: window.parent !== window,
  });

  // 1. Telegram: send blob to parent frame for server upload
  if (isTelegram && window.parent !== window) {
    try {
      logLight("postMessage_to_parent", { blobSize: blob.size });
      window.parent.postMessage(
        {
          type: "ambient-light-data",
          blob: blob,
          filename: filename,
          mimeType: mimeType,
        },
        "*"
      );
      logLight("postMessage_sent");
      return;
    } catch (e) {
      logLight("postMessage_error", { name: e.name, message: e.message });
    }
  }

  // 2. Web Share API (works on mobile when not in iframe)
  if (hasShare && canShareFiles) {
    try {
      logLight("share_api_called");
      await navigator.share({ files: [file] });
      logLight("share_api_success");
      return;
    } catch (e) {
      logLight("share_api_error", { name: e.name, message: e.message });
      if (e.name === "AbortError") {
        return;
      }
    }
  }

  // 3. postMessage fallback (non-Telegram iframe contexts)
  if (window.parent !== window) {
    try {
      logLight("postMessage_to_parent", { blobSize: blob.size });
      window.parent.postMessage(
        {
          type: "ambient-light-data",
          blob: blob,
          filename: filename,
          mimeType: mimeType,
        },
        "*"
      );
      logLight("postMessage_sent");
      return;
    } catch (e) {
      logLight("postMessage_error", { name: e.name, message: e.message });
    }
  }

  // 4. Desktop <a download> fallback (non-mobile)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) {
    logLight("fallback_a_download");
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
    return;
  }

  logLight("download_failed", "No supported download method available");
}
