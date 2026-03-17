import { Session } from "@m2c2kit/session";
import { Prices } from "./prices.js";
let webcamModule = null;
let webgazerModule = null;

const assessment = new Prices();
assessment.setParameters({
  show_trials_complete_scene: false,
});

const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const callbackUrl = params.get("callback_url");
const debugMode = !token || !callbackUrl;

const paramOverrides = {};
for (const key of [
  "number_of_items",
  "learning_duration_ms",
  "show_good_price_question",
  "min_price_distance_usd",
]) {
  const val = params.get(key);
  if (val !== null) {
    paramOverrides[key] = parseFloat(val);
  }
}
for (const key of [
  "locale",
  "currency",
  "excluded_items",
  "used_item_prices",
]) {
  const val = params.get(key);
  if (val !== null) {
    paramOverrides[key] = val;
  }
}
const tutorialParam = params.get("tutorial");
if (tutorialParam !== null) {
  paramOverrides.show_tutorial =
    tutorialParam !== "false" && tutorialParam !== "0";
}
if (Object.keys(paramOverrides).length > 0) {
  assessment.setParameters(paramOverrides);
}

// webcam=1 or webcam=true enables the optional recording feature
const webcamParam = params.get("webcam");
const webcamEnabled = webcamParam === "1" || webcamParam === "true";
if (webcamEnabled) {
  try {
    webcamModule = await import("../webcam/webcam.js");
    webcamModule.initWebcamLogger(token, callbackUrl);
  } catch (e) {
    console.warn("[Prices] Could not load webcam module:", e);
  }
}

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

const allTrialData = [];

const session = new Session({
  activities: [assessment],
});

session.onActivityData((ev) => {
  if (webgazerModule) {
    webgazerModule.markTrialEnd();
    webgazerModule.markTrialStart();
  }
  allTrialData.push(ev.newData);
  if (debugMode) {
    console.log("[Prices debug] trial data:", ev.newData);
  }
});

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

  if (debugMode) {
    const correct = allTrialData.filter((t) => t.is_correct).length;
    const total = allTrialData.length;
    const errorRate = total > 0 ? ((total - correct) / total) * 100 : 0;
    const summary = {
      totalTrials: total,
      correctCount: correct,
      errorRate: errorRate.toFixed(1) + "%",
      trials: allTrialData,
    };
    console.log("[Prices debug] all trial data:", summary);
    const showEndScreen = params.get("show_end_screen") !== "false" && params.get("show_end_screen") !== "0";
    if (showEndScreen) {
      document.body.innerHTML = `
        <div style="text-align:center;padding:40px;font-family:sans-serif;color:#333;background:#fff;min-height:100vh;box-sizing:border-box;">
          <h1 style="color:#4CAF50;">Assessment Complete (Debug Mode)</h1>
          <p>No token/callback_url provided &mdash; results shown below instead of being submitted.</p>
          <p style="color:#555;">Correct: ${correct}/${total} &nbsp;|&nbsp; Error rate: ${errorRate.toFixed(1)}%</p>
          <details open style="text-align:left;max-width:600px;margin:20px auto;">
            <summary style="cursor:pointer;color:#c68a00;font-size:16px;">Trial Data (JSON)</summary>
            <pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto;font-size:12px;color:#333;max-height:60vh;">${JSON.stringify(allTrialData, null, 2)}</pre>
          </details>
        </div>`;
    }
    return;
  }

  try {
    const correct = allTrialData.filter((t) => t.is_correct).length;
    const total = allTrialData.length;
    const resp = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        data: {
          trials: allTrialData,
          correct_count: correct,
          total_count: total,
          error_rate: total > 0 ? (total - correct) / total : 0,
        },
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: ${resp.status}`);
    }

    const showEndScreen = params.get("show_end_screen") !== "false" && params.get("show_end_screen") !== "0";
    if (showEndScreen) {
      document.body.innerHTML = `
      <div style="text-align:center;padding:40px;font-family:sans-serif;color:#333;background:#fff;min-height:100vh;box-sizing:border-box;">
      <h1 style="color:#2e7d32;">Assessment Complete</h1>
      <p style="color:#2e7d32;">Your results have been recorded. Thank you!</p>
      <p>You can now close this window and return to Telegram.</p>
      </div>`;
    }

    if (window.Telegram && window.Telegram.WebApp) {
      setTimeout(() => window.Telegram.WebApp.close(), showEndScreen ? 2000 : 0);
    }
  } catch (err) {
    console.error("Failed to submit results:", err);
    document.body.innerHTML = `
      <div style="text-align:center;padding:40px;font-family:sans-serif;color:#333;background:#fff;min-height:100vh;box-sizing:border-box;">
        <h2 style="color:#c62828;">Submission Error</h2>
        <p>Failed to submit results. Please contact the research team.</p>
      </div>`;
  }
});

// Conditionally show consent, then face positioning guide, then start recording
let webcamRecording = null;

if (webcamEnabled && webcamModule) {
  const accepted = await webcamModule.showWebcamConsentOverlay();
  if (accepted) {
    try {
      const stream = await webcamModule.getWebcamStream();
      await webcamModule.showFacePositioningGuide(stream);
      webcamRecording = webcamModule.startRecordingStream(stream);
    } catch (_) {
      console.warn("[Prices] Webcam recording unavailable, proceeding without it.");
    }
  }
}

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

session.initialize();
