import { Session } from "@m2c2kit/session";
import { FaceNameOccupation } from "./fname.js";

let webcamModule = null;
let webgazerModule = null;

// ---------------------------------------------------------------------------
// URL parameters
// ---------------------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const callbackUrl = params.get("callback_url");
const debugMode = !token || !callbackUrl;

// ---------------------------------------------------------------------------
// Face image loading — two modes:
// 1. Bundled (default): load from selected-faces.json + local image files
// 2. API: fetch random faces from 100k-faces (if face_source=api)
// ---------------------------------------------------------------------------

async function loadBundledFaces() {
  const overlay = document.getElementById("loading-overlay");
  const barFill = document.getElementById("loading-bar-fill");
  const loadingText = document.getElementById("loading-text");
  if (loadingText) loadingText.textContent = "Loading face database...";

  try {
    const resp = await fetch("assets/fname/images/selected-faces.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const metadata = await resp.json();

    const pool = [];
    let loaded = 0;

    // Load each image file as a data URL
    const promises = metadata.map(async (face) => {
      try {
        const imgResp = await fetch(`assets/fname/images/${face.filename}`);
        if (!imgResp.ok) throw new Error(`HTTP ${imgResp.status}`);
        const blob = await imgResp.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        pool.push({
          id: face.id,
          dataUrl,
          demographics: {
            age: face.age,
            gender: face.gender,
            skinToneGroup: face.skin_tone_group,
          },
        });
      } catch (_) {
        // skip failed loads
      }
      loaded++;
      if (barFill) barFill.style.width = `${(loaded / metadata.length) * 100}%`;
      if (loadingText) loadingText.textContent = `${loaded} / ${metadata.length}`;
    });

    await Promise.all(promises);
    if (overlay) overlay.classList.add("hidden");

    if (debugMode) {
      console.log(`[FNAME] Loaded ${pool.length} bundled faces`);
    }
    return pool;
  } catch (e) {
    console.warn("[FNAME] Could not load bundled faces, falling back to API:", e);
    if (overlay) overlay.classList.add("hidden");
    return null;
  }
}

async function loadApiFaces(count) {
  const overlay = document.getElementById("loading-overlay");
  const barFill = document.getElementById("loading-bar-fill");
  const loadingText = document.getElementById("loading-text");
  if (loadingText) loadingText.textContent = `0 / ${count}`;

  const pool = [];
  let loaded = 0;

  const targets = Array.from({ length: count }, () => {
    const id = Math.floor(Math.random() * 10000);
    const padded = String(id).padStart(6, "0");
    const dir1 = Math.floor(id / 10000);
    const dir2 = Math.floor((id % 10000) / 1000);
    return {
      url: `https://ozgrozer.github.io/100k-faces/${dir1}/${dir2}/${padded}.jpg`,
      id: padded,
    };
  });

  const promises = targets.map(async (target) => {
    try {
      const resp = await fetch(target.url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      pool.push({ id: target.id, dataUrl, demographics: null });
    } catch (_) {
      // silently skip
    }
    loaded++;
    if (barFill) barFill.style.width = `${(loaded / count) * 100}%`;
    if (loadingText) loadingText.textContent = `${loaded} / ${count}`;
  });

  await Promise.all(promises);
  if (overlay) overlay.classList.add("hidden");
  return pool;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const faceSource = params.get("face_source") || "bundled";
const numApiFaces = parseInt(params.get("number_of_faces_to_prefetch") || "100", 10);

let facePool;
if (faceSource === "api") {
  facePool = await loadApiFaces(numApiFaces);
} else {
  facePool = await loadBundledFaces();
  if (!facePool || facePool.length === 0) {
    // Fallback to API if bundled faces not found
    facePool = await loadApiFaces(numApiFaces);
  }
}

const numPairs = parseInt(params.get("number_of_pairs") || "6", 10);
if (facePool.length < numPairs) {
  document.body.innerHTML = `
    <div style="text-align:center;padding:40px;font-family:sans-serif;color:#c62828;">
      <h2>Loading Error</h2>
      <p>Only ${facePool.length} face images loaded, but ${numPairs} are required.</p>
      <p>Please check your internet connection and try again.</p>
    </div>`;
  throw new Error(`Insufficient faces: ${facePool.length} < ${numPairs}`);
}

const assessment = new FaceNameOccupation();
assessment.setParameters({
  show_trials_complete_scene: false,
});

// Apply URL parameter overrides
const paramOverrides = {};
for (const key of [
  "number_of_pairs",
  "number_of_distractors",
  "learning_duration_ms",
  "delay_seconds",
]) {
  const val = params.get(key);
  if (val !== null) {
    paramOverrides[key] = parseFloat(val);
  }
}
const grayscaleParam = params.get("grayscale_faces");
if (grayscaleParam !== null) {
  paramOverrides.grayscale_faces =
    grayscaleParam !== "false" && grayscaleParam !== "0";
}
const lineDrawingParam = params.get("line_drawing_faces");
if (lineDrawingParam !== null) {
  paramOverrides.line_drawing_faces =
    lineDrawingParam !== "false" && lineDrawingParam !== "0";
}
const tutorialParam = params.get("show_tutorial");
if (tutorialParam !== null) {
  paramOverrides.show_tutorial =
    tutorialParam !== "false" && tutorialParam !== "0";
}
// Pass the face pool as a JSON string parameter
paramOverrides.face_image_pool = JSON.stringify(facePool);

if (Object.keys(paramOverrides).length > 0) {
  assessment.setParameters(paramOverrides);
}

// webcam / webgazer
const webcamParam = params.get("webcam");
const webcamEnabled = webcamParam === "1" || webcamParam === "true";
if (webcamEnabled) {
  try {
    webcamModule = await import("../webcam/webcam.js");
    webcamModule.initWebcamLogger(token, callbackUrl);
  } catch (e) {
    console.warn("[FNAME] Could not load webcam module:", e);
  }
}

const webgazerParam = params.get("webgazer");
const webgazerEnabled = webgazerParam === "1" || webgazerParam === "true";
if (webgazerEnabled) {
  try {
    webgazerModule = await import("../webgazer/webgazer.js");
    webgazerModule.initGazeLogger(token, callbackUrl);
  } catch (e) {
    console.warn("[FNAME] Could not load webgazer module:", e);
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
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
    console.log("[FNAME debug] trial data:", ev.newData);
  }
});

session.onEnd(async () => {
  if (webgazerModule) {
    try {
      await webgazerModule.stopAndExportGaze("fname");
    } catch (e) {
      console.warn("[FNAME] Gaze export failed:", e);
    }
  }

  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "fname");
  }

  if (debugMode) {
    const inferenceTrials = allTrialData.filter(
      (t) => t.phase === "inference",
    );
    const recognitionTrials = allTrialData.filter(
      (t) => t.phase === "recognition",
    );
    const infCorrect = inferenceTrials.filter((t) => t.is_correct).length;
    const recCorrect = recognitionTrials.filter((t) => t.is_correct).length;

    console.log("[FNAME debug] all trial data:", {
      inference: `${infCorrect}/${inferenceTrials.length}`,
      recognition: `${recCorrect}/${recognitionTrials.length}`,
      trials: allTrialData,
    });

    const showEndScreen =
      params.get("show_end_screen") !== "false" &&
      params.get("show_end_screen") !== "0";
    if (showEndScreen) {
      document.body.innerHTML = `
        <div style="text-align:center;padding:40px;font-family:sans-serif;color:#333;background:#fff;min-height:100vh;box-sizing:border-box;">
          <h1 style="color:#4CAF50;">Assessment Complete (Debug Mode)</h1>
          <p>No token/callback_url provided &mdash; results shown below.</p>
          <p style="color:#555;">Inference: ${infCorrect}/${inferenceTrials.length} &nbsp;|&nbsp; Recognition: ${recCorrect}/${recognitionTrials.length}</p>
          <details open style="text-align:left;max-width:600px;margin:20px auto;">
            <summary style="cursor:pointer;color:#3F51B5;font-size:16px;">Trial Data (JSON)</summary>
            <pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto;font-size:12px;color:#333;max-height:60vh;">${JSON.stringify(allTrialData, null, 2)}</pre>
          </details>
        </div>`;
    }
    return;
  }

  try {
    const inferenceTrials = allTrialData.filter(
      (t) => t.phase === "inference",
    );
    const recognitionTrials = allTrialData.filter(
      (t) => t.phase === "recognition",
    );
    const resp = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        data: {
          trials: allTrialData,
          inference_correct: inferenceTrials.filter((t) => t.is_correct)
            .length,
          inference_total: inferenceTrials.length,
          recognition_correct: recognitionTrials.filter((t) => t.is_correct)
            .length,
          recognition_total: recognitionTrials.length,
        },
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: ${resp.status}`);
    }

    const showEndScreen =
      params.get("show_end_screen") !== "false" &&
      params.get("show_end_screen") !== "0";
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

// Webcam consent + recording
let webcamRecording = null;
if (webcamEnabled && webcamModule) {
  const accepted = await webcamModule.showWebcamConsentOverlay();
  if (accepted) {
    try {
      const stream = await webcamModule.getWebcamStream();
      await webcamModule.showFacePositioningGuide(stream);
      webcamRecording = webcamModule.startRecordingStream(stream);
    } catch (_) {
      console.warn("[FNAME] Webcam recording unavailable, proceeding without it.");
    }
  }
}

// WebGazer consent + calibration
if (webgazerEnabled && webgazerModule) {
  const accepted = await webgazerModule.showGazeConsentOverlay();
  if (accepted) {
    try {
      await webgazerModule.initWebGazer();
      await webgazerModule.runCalibration();
      webgazerModule.startGazeCollection();
      webgazerModule.markTrialStart();
    } catch (e) {
      console.warn("[FNAME] Eye tracking unavailable, proceeding without it.", e);
    }
  }
}

session.initialize();
