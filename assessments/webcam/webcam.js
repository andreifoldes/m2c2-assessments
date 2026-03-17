/**
 * Shared webcam recording pipeline for m2c2kit assessments.
 *
 * Provides: consent overlay → face positioning guide (MediaPipe) →
 * MediaRecorder start → download on session end.
 *
 * Usage in any assessment index.js:
 *   import { showWebcamConsentOverlay, getWebcamStream,
 *            startRecordingStream, showFacePositioningGuide,
 *            stopAndDownloadRecording, initWebcamLogger }
 *     from "../webcam/webcam.js";   // adjust relative path as needed
 */

// ── Remote logging ──────────────────────────────────────────────
// Call initWebcamLogger(token, callbackUrl) early. All subsequent
// logWebcam() calls send events to the server for debugging.
let _logEndpoint = null;
let _logToken = null;
let _source = null;

export function initWebcamLogger(token, callbackUrl) {
  _logToken = token;
  // Read source parameter from URL (e.g. ?source=telegram)
  try {
    _source = new URLSearchParams(window.location.search).get("source");
  } catch (_) {}
  if (callbackUrl) {
    // Derive log endpoint from callback_url:
    // e.g. https://host/api/v1/cognitive/complete → https://host/api/v1/webcam/log
    try {
      const url = new URL(callbackUrl);
      url.pathname = url.pathname.replace(/\/cognitive\/complete$/, "/webcam/log");
      _logEndpoint = url.toString();
    } catch (_) {
      _logEndpoint = null;
    }
  }
}

function logWebcam(event, detail) {
  const entry = { token: _logToken, event, detail: typeof detail === "string" ? detail : JSON.stringify(detail) };
  console.log(`[webcam] ${event}`, detail || "");
  if (_logEndpoint) {
    fetch(_logEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {}); // fire-and-forget
  }
}

/**
 * Shows a full-screen consent overlay before the session starts.
 * Resolves true if the participant accepts, false if they decline.
 */
export function showWebcamConsentOverlay() {
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

    const isTelegram = _source === "telegram";
    const storageMsg = isTelegram
      ? "If you agree, your front camera will record while you complete the task. " +
        "<strong>The recording will be sent to you in Telegram</strong> when the task ends."
      : "If you agree, your front camera will record while you complete the task. " +
        "<strong>The recording is saved only on your device</strong> — it is never " +
        "uploaded or shared. You will be prompted to download it when the task ends.";

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
          ${storageMsg}
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
    logWebcam("consent_shown");

    document.getElementById("webcam-consent-accept").addEventListener("click", () => {
      logWebcam("consent_accepted");
      overlay.remove();
      resolve(true);
    });

    document.getElementById("webcam-consent-decline").addEventListener("click", () => {
      logWebcam("consent_declined");
      overlay.remove();
      resolve(false);
    });
  });
}

/**
 * Requests the front-facing camera stream.
 * facingMode: "user" targets the selfie camera on mobile; ignored on desktop.
 */
export async function getWebcamStream() {
  logWebcam("getUserMedia_requested");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    const settings = track ? track.getSettings() : {};
    logWebcam("getUserMedia_success", {
      label: track?.label,
      width: settings.width,
      height: settings.height,
      facingMode: settings.facingMode,
    });
    return stream;
  } catch (e) {
    logWebcam("getUserMedia_error", { name: e.name, message: e.message });
    throw e;
  }
}

/**
 * Picks the best supported MediaRecorder MIME type for the current browser.
 * Prefers MP4 (works on iOS Safari + Chrome) over WebM (Chrome/Firefox only).
 */
export function pickMimeType() {
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
 * Returns { recorder, stream, chunks, mimeType }.
 */
export function startRecordingStream(stream) {
  const mimeType = pickMimeType();
  logWebcam("recording_start", { selectedMimeType: mimeType || "(default)" });
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };
  recorder.onerror = (e) => {
    logWebcam("recorder_error", { error: e?.error?.message || e?.message || "unknown" });
  };
  recorder.start();
  logWebcam("recorder_started", { state: recorder.state, mimeType: recorder.mimeType });
  return { recorder, stream, chunks, mimeType: recorder.mimeType };
}

/**
 * Stops an active recording and triggers a download of the video to the
 * participant's device. Returns a Promise that resolves once the download
 * has been triggered and all camera tracks are stopped.
 */
export function stopAndDownloadRecording(webcamRecording, filenamePrefix) {
  return new Promise((resolve) => {
    webcamRecording.recorder.onstop = async () => {
      const mimeType = webcamRecording.mimeType || "video/webm";
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(webcamRecording.chunks, { type: mimeType });
      const filename = `${filenamePrefix}-recording-${Date.now()}.${ext}`;
      const file = new File([blob], filename, { type: mimeType });

      logWebcam("recording_stopped", {
        chunks: webcamRecording.chunks.length,
        blobSize: blob.size,
        mimeType,
        filename,
      });

      webcamRecording.stream.getTracks().forEach((t) => t.stop());

      const isTelegram = _source === "telegram";
      const hasShare = typeof navigator.share === "function";
      const canShareFiles = hasShare && typeof navigator.canShare === "function"
        ? navigator.canShare({ files: [file] })
        : false;
      logWebcam("download_attempt", {
        hasShare,
        canShareFiles,
        source: _source,
        inIframe: window.parent !== window,
      });

      // When source=telegram, send blob to parent frame for server upload.
      // The parent (cognitive_webapp.html) uploads it and the server sends
      // the recording back to the user as a Telegram message.
      if (isTelegram && window.parent !== window) {
        try {
          logWebcam("postMessage_to_parent", { blobSize: blob.size });
          window.parent.postMessage({
            type: "webcam-recording",
            blob: blob,
            filename: filename,
            mimeType: mimeType,
          }, "*");
          logWebcam("postMessage_sent");
          resolve();
          return;
        } catch (e) {
          logWebcam("postMessage_error", { name: e.name, message: e.message });
        }
      }

      // Non-Telegram: try Web Share API (works on mobile when not in iframe)
      if (hasShare && canShareFiles) {
        try {
          logWebcam("share_api_called");
          await navigator.share({ files: [file] });
          logWebcam("share_api_success");
          resolve();
          return;
        } catch (e) {
          logWebcam("share_api_error", { name: e.name, message: e.message });
          if (e.name === "AbortError") {
            resolve();
            return;
          }
        }
      }

      // Fallback: postMessage to parent frame (non-Telegram iframe contexts)
      if (window.parent !== window) {
        try {
          logWebcam("postMessage_to_parent", { blobSize: blob.size });
          window.parent.postMessage({
            type: "webcam-recording",
            blob: blob,
            filename: filename,
            mimeType: mimeType,
          }, "*");
          logWebcam("postMessage_sent");
          resolve();
          return;
        } catch (e) {
          logWebcam("postMessage_error", { name: e.name, message: e.message });
        }
      }

      // Fallback: <a download> (works on desktop browsers outside Telegram)
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!isMobile) {
        logWebcam("fallback_a_download");
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
        resolve();
        return;
      }

      logWebcam("download_failed", "No supported download method available");
      resolve();
    };
    logWebcam("recorder_stop_requested");
    webcamRecording.recorder.stop();
  });
}

/**
 * Dynamically loads the MediaPipe Face Detector (Tasks Vision API) from CDN.
 * Runs entirely on-device — no data leaves the browser.
 */
export async function loadFaceDetector() {
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
 */
export function getFacePositionFeedback(detection, videoW, videoH) {
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

  // Face center should be near the oval guide center (horizontal flipped for mirror)
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
 *
 * w and h are the LOGICAL (CSS) pixel dimensions of the overlay.
 * The canvas context must already be scaled by devicePixelRatio before this call.
 */
export function drawPositioningOverlay(ctx, w, h, status, progress) {
  ctx.clearRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.42;

  // Derive the oval from viewport fractions with no hard pixel cap.
  // ry drives the size; rx enforces a portrait face aspect ratio (~3:4).
  // Using the minimum of width/height fractions keeps the oval on-screen on
  // both portrait phones and wide desktop viewports.
  const ry = Math.min(w * 0.38, h * 0.42);
  const rx = ry * 0.72;

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
export function showFacePositioningGuide(stream) {
  return new Promise((resolve) => {
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
    skipBtn.addEventListener("click", () => { logWebcam("face_guide_skipped"); cleanup(); resolve(); });

    statusBar.appendChild(statusText);
    statusBar.appendChild(skipBtn);
    overlay.appendChild(video);
    overlay.appendChild(canvas);
    overlay.appendChild(statusBar);
    document.body.appendChild(overlay);

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

    // Returns the logical (CSS) dimensions after syncing the canvas resolution.
    // The canvas pixel buffer is scaled by devicePixelRatio so drawing is sharp
    // on Retina / high-DPI screens; all drawing coordinates remain in CSS pixels.
    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const w = overlay.offsetWidth || window.innerWidth;
      const h = overlay.offsetHeight || window.innerHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    }

    function detect(timestamp) {
      if (isCleanedUp) return;
      const { w, h } = resizeCanvas();

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
          logWebcam("face_position_locked");
          drawPositioningOverlay(ctx, w, h, "good", 1);
          setTimeout(() => { if (!isCleanedUp) { cleanup(); resolve(); } }, 400);
          return;
        }
      } else {
        goodSince = null;
      }

      statusText.textContent = message;
      drawPositioningOverlay(ctx, w, h, status, progress);
      animFrameId = requestAnimationFrame(detect);
    }

    async function init() {
      if (initStarted || isCleanedUp) return;
      initStarted = true;

      const { w, h } = resizeCanvas();
      drawPositioningOverlay(ctx, w, h, "loading", 0);
      animFrameId = requestAnimationFrame(detect);

      try {
        detector = await loadFaceDetector();
        detectorLoaded = true;
        logWebcam("face_detector_loaded");
      } catch (e) {
        logWebcam("face_detector_error", { name: e.name, message: e.message });
        statusText.textContent = "Position your face in the oval, then tap Skip";
        setTimeout(() => { if (!isCleanedUp) { cleanup(); resolve(); } }, 8000);
      }
    }

    if (video.readyState >= 1) {
      init();
    } else {
      video.addEventListener("loadedmetadata", init, { once: true });
      setTimeout(() => { if (!initStarted) init(); }, 1000);
    }
  });
}
