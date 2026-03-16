import { Session } from "@m2c2kit/session";
import { PvtBa } from "./pvt-ba.js";

const assessment = new PvtBa();

const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const callbackUrl = params.get("callback_url");
const debugMode = !token || !callbackUrl;

const paramOverrides = {};
for (const key of [
  "max_duration_seconds",
  "min_isi_ms",
  "max_isi_ms",
  "lapse_threshold_ms",
  "false_start_threshold_ms",
  "decision_threshold",
  "feedback_duration_ms",
]) {
  const val = params.get(key);
  if (val !== null) {
    paramOverrides[key] = parseFloat(val);
  }
}
const tutorialParam = params.get("tutorial");
if (tutorialParam !== null) {
  paramOverrides.show_tutorial = tutorialParam !== "false" && tutorialParam !== "0";
}
if (Object.keys(paramOverrides).length > 0) {
  assessment.setParameters(paramOverrides);
}

// webcam=1 or webcam=true enables the optional recording feature
const webcamParam = params.get("webcam");
const webcamEnabled = webcamParam === "1" || webcamParam === "true";

/**
 * Shows a full-screen consent overlay before the session starts.
 * Resolves true if the participant accepts, false if they decline.
 */
function showWebcamConsentOverlay() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "webcam-consent-overlay";
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

    overlay.innerHTML = `
      <div style="max-width: 420px; width: 100%;">
        <div style="font-size: 48px; margin-bottom: 16px;">📷</div>
        <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #111;">
          Optional Camera Recording
        </h2>
        <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #444;">
          The researcher has enabled an optional video recording for this session.
        </p>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #444;">
          If you agree, your front camera will record while you complete the task.
          <strong>The recording is saved only on your device</strong> — it is never
          uploaded or shared. You will be prompted to download it when the task ends.
        </p>
        <p style="margin: 0 0 28px; font-size: 14px; color: #666;">
          You can decline and still complete the task normally.
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="webcam-consent-accept" style="
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 10px;
            background: #2e7d32;
            color: #fff;
            cursor: pointer;
          ">Allow Recording</button>
          <button id="webcam-consent-decline" style="
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 500;
            border: 1.5px solid #bbb;
            border-radius: 10px;
            background: #fff;
            color: #555;
            cursor: pointer;
          ">No thanks, continue without recording</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("webcam-consent-accept").addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });

    document.getElementById("webcam-consent-decline").addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });
  });
}

/**
 * Picks the best supported MediaRecorder MIME type for the current browser.
 * Prefers MP4 (works on iOS Safari + Chrome) over WebM (Chrome/Firefox only).
 */
function pickMimeType() {
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

/**
 * Requests camera access and starts a MediaRecorder.
 * Returns the recorder, stream, chunks array, and the chosen mimeType.
 */
async function startWebcamRecording() {
  // facingMode: "user" requests the front-facing camera on mobile devices.
  // On desktop (single webcam), facingMode is ignored.
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false,
  });
  const mimeType = pickMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };
  recorder.start();
  return { recorder, stream, chunks, mimeType: recorder.mimeType };
}

const allTrialData = [];

const session = new Session({
  activities: [assessment],
});

session.onActivityData((ev) => {
  allTrialData.push(ev.newData);
  if (debugMode) {
    console.log("[PVT-BA debug] trial data:", ev.newData);
  }
});

session.onEnd(async () => {
  // Stop recording and trigger download before submitting results
  if (webcamRecording) {
    await new Promise((resolve) => {
      webcamRecording.recorder.onstop = () => {
        const mimeType = webcamRecording.mimeType || "video/webm";
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(webcamRecording.chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pvt-ba-recording-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        webcamRecording.stream.getTracks().forEach((t) => t.stop());
        resolve();
      };
      webcamRecording.recorder.stop();
    });
  }

  if (debugMode) {
    const lastTrial = allTrialData[allTrialData.length - 1];
    const totalDurationSeconds = lastTrial
      ? +(lastTrial.elapsed_test_time_ms / 1000).toFixed(1)
      : 0;
    const summary = {
      totalTrials: allTrialData.length,
      total_duration_seconds: totalDurationSeconds,
      trials: allTrialData,
    };
    console.log("[PVT-BA debug] all trial data:", summary);
    document.body.innerHTML = `
      <div style="text-align:center;padding:40px;font-family:sans-serif;color:#333;background:#fff;min-height:100vh;box-sizing:border-box;">
        <h1 style="color:#4CAF50;">Assessment Complete (Debug Mode)</h1>
        <p>No token/callback_url provided &mdash; results shown below instead of being submitted.</p>
        <p style="color:#555;">Total trials: ${allTrialData.length} &nbsp;|&nbsp; Session duration: ${totalDurationSeconds}s</p>
        <details open style="text-align:left;max-width:600px;margin:20px auto;">
          <summary style="cursor:pointer;color:#c68a00;font-size:16px;">Trial Data (JSON)</summary>
          <pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto;font-size:12px;color:#333;max-height:60vh;">${JSON.stringify(allTrialData, null, 2)}</pre>
        </details>
      </div>`;
    return;
  }

  try {
    const resp = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        data: {
          trials: allTrialData,
          total_duration_seconds: allTrialData.length > 0
            ? +(allTrialData[allTrialData.length - 1].elapsed_test_time_ms / 1000).toFixed(1)
            : 0,
        },
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: ${resp.status}`);
    }

    document.body.innerHTML = `
      <div style="text-align:center;padding:40px;font-family:sans-serif;color:#333;background:#fff;min-height:100vh;box-sizing:border-box;">
        <h1 style="color:#2e7d32;">Assessment Complete</h1>
        <p style="color:#2e7d32;">Your results have been recorded. Thank you!</p>
        <p>You can now close this window and return to Telegram.</p>
      </div>`;

    if (window.Telegram && window.Telegram.WebApp) {
      setTimeout(() => window.Telegram.WebApp.close(), 2000);
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

// Conditionally show consent and start recording before initializing the session
let webcamRecording = null;

if (webcamEnabled) {
  const accepted = await showWebcamConsentOverlay();
  if (accepted) {
    try {
      webcamRecording = await startWebcamRecording();
    } catch (_) {
      // Camera permission denied or getUserMedia unsupported — proceed without recording
      console.warn("[PVT-BA] Webcam recording unavailable, proceeding without it.");
    }
  }
}

session.initialize();
