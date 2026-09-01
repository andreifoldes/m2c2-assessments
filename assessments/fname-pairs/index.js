import { Session } from "@m2c2kit/session";
// Version query strings on local module imports keep the whole chain
// cache-consistent: bump all "?v=" together (index.html, index.js,
// fname-pairs.js) when releasing changes, or browsers may mix stale and
// fresh modules.
import { FaceNamePairs } from "./fname-pairs.js?v=2";
import { selectSubset } from "./stimuli.js?v=2";

let webcamModule = null;
let webgazerModule = null;
let ambientLightModule = null;

// ---------------------------------------------------------------------------
// URL parameters
// ---------------------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const callbackUrl = params.get("callback_url");
const debugMode = !token || !callbackUrl;

const phase = params.get("phase") === "delayed" ? "delayed" : "learning";
const responseMode = params.get("response_mode") === "choice" ? "choice" : "typed";
const listId = Math.min(4, Math.max(1, parseInt(params.get("list") || "1", 10) || 1));
const subsetSize = parseInt(params.get("subset_size") || "20", 10) || 20;
const subsetSeed = parseInt(params.get("subset_seed") || "0", 10) || 0;
const subsetComplement =
  params.get("subset_complement") === "1" || params.get("subset_complement") === "true";

// The CFD images are not redistributed with this public repo. In production
// the scheduler passes stimuli_base_url pointing at a private host (unlisted
// path); locally the gitignored assets folder is used.
let stimuliBaseUrl = params.get("stimuli_base_url") || "assets/fname-pairs/images/";
if (!stimuliBaseUrl.endsWith("/")) {
  stimuliBaseUrl += "/";
}

// ---------------------------------------------------------------------------
// Stimulus loading
// ---------------------------------------------------------------------------

function showFatalError(title, detail) {
  document.body.innerHTML = `
    <div style="text-align:center;padding:40px;font-family:sans-serif;color:#c62828;">
      <h2>${title}</h2>
      <p>${detail}</p>
      <p>Please check your internet connection and try again, or contact the research team.</p>
    </div>`;
}

async function loadListAndImages() {
  const overlay = document.getElementById("loading-overlay");
  const barFill = document.getElementById("loading-bar-fill");
  const loadingText = document.getElementById("loading-text");

  const resp = await fetch("assets/fname-pairs/images/lists.json");
  if (!resp.ok) {
    throw new Error(`lists.json HTTP ${resp.status}`);
  }
  const manifest = await resp.json();
  const list = manifest.lists.find((l) => l.list_id === listId);
  if (!list) {
    throw new Error(`List ${listId} not found in lists.json`);
  }

  // Delayed phase tests only a deterministic subset (or its complement);
  // fetch just those images.
  const pairs =
    phase === "delayed"
      ? selectSubset(list.pairs, subsetSize, subsetSeed, subsetComplement)
      : [...list.pairs].sort((a, b) => a.pair_id - b.pair_id);
  if (pairs.length === 0) {
    throw new Error(
      "Subset selection left no pairs to test (subset_complement=1 with " +
        "subset_size covering the whole list?)",
    );
  }

  if (loadingText) loadingText.textContent = `0 / ${pairs.length}`;

  let loaded = 0;
  const failures = [];
  const withImages = await Promise.all(
    pairs.map(async (pair) => {
      let dataUrl = null;
      try {
        const imgResp = await fetch(`${stimuliBaseUrl}${pair.face_file}`);
        if (!imgResp.ok) throw new Error(`HTTP ${imgResp.status}`);
        const blob = await imgResp.blob();
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        failures.push(pair.face_file);
      }
      loaded++;
      if (barFill) barFill.style.width = `${(loaded / pairs.length) * 100}%`;
      if (loadingText) loadingText.textContent = `${loaded} / ${pairs.length}`;
      return { ...pair, dataUrl };
    }),
  );

  if (failures.length > 0) {
    // A memory task with missing faces is invalid — fail loudly.
    throw new Error(
      `Failed to load ${failures.length} face image(s) from ${stimuliBaseUrl} ` +
        `(e.g. ${failures[0]})`,
    );
  }

  if (overlay) overlay.classList.add("hidden");
  return { pairs: withImages, allNames: list.pairs.map((p) => ({
    pair_id: p.pair_id,
    name: p.name,
    gender: p.gender,
  })) };
}

let stimuli;
try {
  stimuli = await loadListAndImages();
} catch (e) {
  console.error("[FNAME-PAIRS] stimulus loading failed:", e);
  showFatalError("Loading Error", String(e.message || e));
  throw e;
}

// ---------------------------------------------------------------------------
// Assessment configuration
// ---------------------------------------------------------------------------
const assessment = new FaceNamePairs();

const paramOverrides = {
  phase,
  response_mode: responseMode,
  list_id: listId,
  subset_size: subsetSize,
  subset_seed: subsetSeed,
  subset_complement: subsetComplement,
  pairs_json: JSON.stringify(stimuli.pairs),
  all_names_json: JSON.stringify(stimuli.allNames),
};

for (const key of [
  "learning_duration_ms",
  "isi_ms",
  "typed_lenient_distance",
  "criterion_prop",
  "max_learning_rounds",
]) {
  const val = params.get(key);
  if (val !== null) {
    paramOverrides[key] = parseFloat(val);
  }
}
const restudyScope = params.get("restudy_scope");
if (restudyScope === "all" || restudyScope === "missed") {
  paramOverrides.restudy_scope = restudyScope;
}
for (const key of [
  "immediate_test",
  "feedback_enabled",
  "allow_tap_advance",
  "allow_skip",
  "show_trials_complete_scene",
]) {
  const val = params.get(key);
  if (val !== null) {
    paramOverrides[key] = val !== "false" && val !== "0";
  }
}
const tutorialParam = params.get("tutorial");
if (tutorialParam !== null) {
  paramOverrides.show_tutorial = tutorialParam !== "false" && tutorialParam !== "0";
}

assessment.setParameters(paramOverrides);

// ---------------------------------------------------------------------------
// Optional modules (webcam recording, eye tracking, ambient light)
// ---------------------------------------------------------------------------
const webcamParam = params.get("webcam");
const webcamEnabled = webcamParam === "1" || webcamParam === "true";
if (webcamEnabled) {
  try {
    webcamModule = await import("../webcam/webcam.js");
    webcamModule.initWebcamLogger(token, callbackUrl);
  } catch (e) {
    console.warn("[FNAME-PAIRS] Could not load webcam module:", e);
  }
}

const webgazerParam = params.get("webgazer");
const webgazerEnabled = webgazerParam === "1" || webgazerParam === "true";
if (webgazerEnabled) {
  try {
    webgazerModule = await import("../webgazer/webgazer.js");
    webgazerModule.initGazeLogger(token, callbackUrl);
  } catch (e) {
    console.warn("[FNAME-PAIRS] Could not load webgazer module:", e);
  }
}

const lightParam = params.get("light");
const lightEnabled = lightParam === "1" || lightParam === "true";
if (lightEnabled) {
  try {
    ambientLightModule = await import("../ambient-light/ambient-light.js");
    if (ambientLightModule.isAmbientLightSupported(true)) {
      ambientLightModule.initLightLogger(token, callbackUrl);
    } else {
      ambientLightModule = null;
    }
  } catch (e) {
    console.warn("[FNAME-PAIRS] Could not load ambient light module:", e);
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
  if (ambientLightModule) {
    ambientLightModule.markTrialEnd();
    ambientLightModule.markTrialStart();
  }
  allTrialData.push(ev.newData);
  if (debugMode) {
    console.log("[FNAME-PAIRS debug] trial data:", ev.newData);
  }
});

function computeSummary(trials) {
  const tests = trials.filter((t) => t.trial_type === "test");
  const study = trials.filter((t) => t.trial_type === "study");

  // Criterion mode can produce multiple study-test rounds; headline accuracy
  // is the FINAL round (the state the participant left the session in).
  const rounds = [...new Set(tests.map((t) => t.learning_round ?? 1))].sort(
    (a, b) => a - b,
  );
  const roundProps = rounds.map((r) => {
    const rt = tests.filter((t) => (t.learning_round ?? 1) === r);
    return +(
      rt.filter((t) => t.is_correct_lenient === true).length / (rt.length || 1)
    ).toFixed(3);
  });
  const finalRound = rounds.length ? rounds[rounds.length - 1] : 1;
  const finalTests = tests.filter((t) => (t.learning_round ?? 1) === finalRound);
  const strict = finalTests.filter((t) => t.is_correct_strict === true).length;
  const lenient = finalTests.filter((t) => t.is_correct_lenient === true).length;

  const criterionProp = parseFloat(params.get("criterion_prop") || "0") || 0;
  const rts = finalTests
    .map((t) => t.rt_ms)
    .filter((v) => typeof v === "number")
    .sort((a, b) => a - b);
  const meanRt = rts.length
    ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length)
    : null;
  const medianRt = rts.length
    ? rts.length % 2
      ? rts[(rts.length - 1) / 2]
      : Math.round((rts[rts.length / 2 - 1] + rts[rts.length / 2]) / 2)
    : null;
  return {
    phase,
    list_id: listId,
    response_mode: responseMode,
    subset_size: subsetSize,
    subset_seed: subsetSeed,
    subset_complement: subsetComplement,
    n_skipped: finalTests.filter((t) => t.skipped === true).length,
    n_study_trials: study.length,
    n_test_trials: finalTests.length,
    n_test_trials_total: tests.length,
    n_learning_rounds: rounds.length || 1,
    round_prop_correct_lenient: roundProps,
    criterion_prop: criterionProp,
    criterion_met:
      criterionProp > 0 && phase === "learning"
        ? (roundProps[roundProps.length - 1] ?? 0) >= criterionProp
        : null,
    n_correct_strict: strict,
    n_correct_lenient: lenient,
    prop_correct_strict: finalTests.length
      ? +(strict / finalTests.length).toFixed(3)
      : null,
    prop_correct_lenient: finalTests.length
      ? +(lenient / finalTests.length).toFixed(3)
      : null,
    mean_rt_ms: meanRt,
    median_rt_ms: medianRt,
  };
}

session.onEnd(async () => {
  if (webgazerModule) {
    try {
      await webgazerModule.stopAndExportGaze("fname-pairs");
    } catch (e) {
      console.warn("[FNAME-PAIRS] Gaze export failed:", e);
    }
  }

  if (ambientLightModule) {
    try {
      await ambientLightModule.stopAndExportLight("fname-pairs");
    } catch (e) {
      console.warn("[FNAME-PAIRS] Light export failed:", e);
    }
  }

  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "fname-pairs");
  }

  const summary = computeSummary(allTrialData);

  // Embedded mode (e.g. ESMira PWA iframe): post results to the parent window
  // so the host app can capture them and close the overlay. No HTTP callback.
  if (new URLSearchParams(window.location.search).get("embed") === "1") {
    try {
      if (window.parent && window.parent !== window)
        window.parent.postMessage(
          {
            type: "m2c2:complete",
            assessment: "fname-pairs",
            summary,
            data: { trials: allTrialData },
          },
          "*",
        );
    } catch (e) {
      console.warn("[m2c2] parent postMessage failed", e);
    }
    return;
  }

  if (debugMode) {
    console.log("[FNAME-PAIRS debug] all trial data:", {
      summary,
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
          <p style="color:#555;">Phase: ${summary.phase} &nbsp;|&nbsp; Recall: ${summary.n_correct_strict}/${summary.n_test_trials} strict, ${summary.n_correct_lenient}/${summary.n_test_trials} lenient</p>
          <details open style="text-align:left;max-width:600px;margin:20px auto;">
            <summary style="cursor:pointer;color:#3F51B5;font-size:16px;">Trial Data (JSON)</summary>
            <pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto;font-size:12px;color:#333;max-height:60vh;">${JSON.stringify({ summary, trials: allTrialData }, null, 2)}</pre>
          </details>
        </div>`;
    }
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
          summary,
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
          <p>You can now close this window.</p>
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
      console.warn(
        "[FNAME-PAIRS] Webcam recording unavailable, proceeding without it.",
      );
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
      console.warn(
        "[FNAME-PAIRS] Eye tracking unavailable, proceeding without it.",
        e,
      );
    }
  }
}

session.initialize();
