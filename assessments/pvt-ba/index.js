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
 * Requests the front-facing camera stream.
 * facingMode: "user" targets the selfie camera on mobile; ignored on desktop.
 */
async function getWebcamStream() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false,
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
 * Starts a MediaRecorder on an existing stream.
 * Returns the recorder, stream, chunks array, and the chosen mimeType.
 */
function startRecordingStream(stream) {
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

/**
 * Dynamically loads the MediaPipe Face Detector (Tasks Vision API) from CDN.
 * Runs entirely on-device — no data leaves the browser.
 */
async function loadFaceDetector() {
  const { FaceDetector, FilesetResolver } = await import(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs"
  );
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm"
  );
  return FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    minDetectionConfidence: 0.5,
  });
}

/**
 * Evaluates the detected face bounding box (in video pixel coordinates) and
 * returns a status ("none" | "adjust" | "good") and a human-readable message.
 * Coordinates are normalized to 0-1 before comparison to be resolution-agnostic.
 */
function getFacePositionFeedback(detection, videoW, videoH) {
  if (!detection) {
    return { status: "none", message: "Position your face in the oval" };
  }

  const box = detection.boundingBox;
  const normH = box.height / videoH;
  const normCx = (box.originX + box.width / 2) / videoW;
  const normCy = (box.originY + box.height / 2) / videoH;

  // Face should fill 35–75% of the frame height
  if (normH < 0.35) return { status: "adjust", message: "Move closer" };
  if (normH > 0.75) return { status: "adjust", message: "Move further back" };

  // Face must not be clipped at any edge
  if (
    box.originX < videoW * 0.03 ||
    box.originY < videoH * 0.03 ||
    box.originX + box.width > videoW * 0.97 ||
    box.originY + box.height > videoH * 0.97
  ) {
    return { status: "adjust", message: "Move back — face partially cut off" };
  }

  // Face center should be within ~20% of frame center horizontally and 15% vertically.
  // The oval guide is placed at 42% height (slightly above mid) to look natural.
  // Horizontal direction is flipped here because the video is mirrored for display.
  const dx = Math.abs(normCx - 0.5);
  const dy = Math.abs(normCy - 0.42);
  if (dx > 0.18 || dy > 0.14) {
    return { status: "adjust", message: "Center your face in the oval" };
  }

  return { status: "good", message: "Hold still…" };
}

/**
 * Draws the oval positioning guide on the canvas.
 * A dark mask surrounds a clear oval cutout through which the live video shows.
 * The oval border turns green and thickens as the participant holds position.
 */
function drawPositioningOverlay(ctx, w, h, status, progress) {
  ctx.clearRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.42;
  const rx = Math.min(w * 0.30, 130);
  const ry = Math.min(h * 0.38, 200);

  // Semi-transparent dark mask with oval cutout (even-odd fill rule)
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.50)";
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill("evenodd");
  ctx.restore();

  // Oval border: white when adjusting, green (intensifying) when good
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  if (status === "good") {
    ctx.strokeStyle = `rgba(76, 175, 80, ${0.5 + progress * 0.5})`;
    ctx.lineWidth = 3 + progress * 3;
  } else {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 3;
  }
  ctx.stroke();
}

/**
 * Shows a full-screen camera preview with a real-time face positioning guide.
 * Uses MediaPipe Face Detection to check size, centering, and clipping.
 * Resolves once the participant holds a good position for 1.5 s, or when they
 * tap "Skip". Falls back gracefully if the detector fails to load.
 */
function showFacePositioningGuide(stream) {
  return new Promise((resolve) => {
    // --- Build overlay DOM ---
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: #000;
      display: flex; flex-direction: column;
      align-items: center; justify-content: flex-end;
    `;

    // Live camera feed (mirrored so it acts like a selfie mirror)
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    video.style.cssText = `
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    `;

    // Canvas for the oval guide drawn on top of the video
    const canvas = document.createElement("canvas");
    canvas.style.cssText = `
      position: absolute; inset: 0;
      width: 100%; height: 100%;
    `;

    // Bottom bar: status message + skip button
    const statusBar = document.createElement("div");
    statusBar.style.cssText = `
      position: relative; z-index: 1;
      width: 100%; padding: 20px 24px 16px;
      display: flex; flex-direction: column; align-items: center; gap: 14px;
      background: linear-gradient(transparent, rgba(0,0,0,0.65));
    `;

    const statusText = document.createElement("div");
    statusText.style.cssText = `
      font-family: sans-serif; font-size: 17px; font-weight: 500;
      color: #fff; text-align: center;
      text-shadow: 0 1px 4px rgba(0,0,0,0.7);
    `;
    statusText.textContent = "Loading face detection…";

    const skipBtn = document.createElement("button");
    skipBtn.textContent = "Skip";
    skipBtn.style.cssText = `
      padding: 10px 28px; font-size: 14px; font-weight: 500;
      border: 1.5px solid rgba(255,255,255,0.5); border-radius: 20px;
      background: transparent; color: rgba(255,255,255,0.8); cursor: pointer;
      margin-bottom: 16px;
    `;
    skipBtn.addEventListener("click", () => { cleanup(); resolve(); });

    statusBar.appendChild(statusText);
    statusBar.appendChild(skipBtn);
    overlay.appendChild(video);
    overlay.appendChild(canvas);
    overlay.appendChild(statusBar);
    document.body.appendChild(overlay);

    // --- State ---
    const ctx = canvas.getContext("2d");
    let detector = null;
    let detectorLoaded = false;
    let animFrameId = null;
    let goodSince = null;
    let initStarted = false;
    let isCleanedUp = false;

    function cleanup() {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (detector) { try { detector.close(); } catch (_) {} }
      overlay.remove();
    }

    function resizeCanvas() {
      canvas.width = overlay.offsetWidth || window.innerWidth;
      canvas.height = overlay.offsetHeight || window.innerHeight;
    }

    // --- Detection loop (runs every animation frame) ---
    function detect(timestamp) {
      if (isCleanedUp) return;
      resizeCanvas();

      let detection = null;
      if (detectorLoaded && video.videoWidth > 0 && video.readyState >= 2) {
        try {
          const result = detector.detectForVideo(video, timestamp);
          detection = result.detections[0] || null;
        } catch (_) {}
      }

      const { status, message } = detectorLoaded
        ? getFacePositionFeedback(detection, video.videoWidth, video.videoHeight)
        : { status: "loading", message: statusText.textContent };

      const now = performance.now();
      let progress = 0;

      if (status === "good") {
        if (!goodSince) goodSince = now;
        progress = Math.min((now - goodSince) / 1500, 1);
        if (progress >= 1) {
          statusText.textContent = "✓ Perfect!";
          drawPositioningOverlay(ctx, canvas.width, canvas.height, "good", 1);
          // Brief pause so the green oval is visible before proceeding
          setTimeout(() => { if (!isCleanedUp) { cleanup(); resolve(); } }, 400);
          return;
        }
      } else {
        goodSince = null;
      }

      statusText.textContent = message;
      drawPositioningOverlay(ctx, canvas.width, canvas.height, status, progress);
      animFrameId = requestAnimationFrame(detect);
    }

    // --- Detector initialisation ---
    async function init() {
      if (initStarted || isCleanedUp) return;
      initStarted = true;

      // Draw static guide immediately while the model loads
      resizeCanvas();
      drawPositioningOverlay(ctx, canvas.width, canvas.height, "loading", 0);
      animFrameId = requestAnimationFrame(detect);

      try {
        detector = await loadFaceDetector();
        detectorLoaded = true;
      } catch (e) {
        console.warn("[PVT-BA] Face detector could not load — showing static guide:", e);
        // Fall back to a timed auto-advance after 8 s so the participant can
        // still position themselves manually before the task starts.
        statusText.textContent = "Position your face in the oval, then tap Skip";
        setTimeout(() => { if (!isCleanedUp) { cleanup(); resolve(); } }, 8000);
      }
    }

    // Kick off once the video has metadata (so offsetWidth/Height are available)
    if (video.readyState >= 1) {
      init();
    } else {
      video.addEventListener("loadedmetadata", init, { once: true });
      // Safety fallback: start anyway after 1 s even if event never fires
      setTimeout(() => { if (!initStarted) init(); }, 1000);
    }
  });
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

// Conditionally show consent, then face positioning guide, then start recording
let webcamRecording = null;

if (webcamEnabled) {
  const accepted = await showWebcamConsentOverlay();
  if (accepted) {
    try {
      const stream = await getWebcamStream();
      await showFacePositioningGuide(stream);
      webcamRecording = startRecordingStream(stream);
    } catch (_) {
      // Camera permission denied or getUserMedia unsupported — proceed without recording
      console.warn("[PVT-BA] Webcam recording unavailable, proceeding without it.");
    }
  }
}

session.initialize();
