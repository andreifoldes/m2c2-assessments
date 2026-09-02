import { Session } from "@m2c2kit/session";
import { MVLT } from "./mvlt.js";
let webcamModule = null;
let webgazerModule = null;
let webcamRecording = null;

const assessment = new MVLT();
assessment.setParameters({
  show_trials_complete_scene: false,
});

const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const callbackUrl = params.get("callback_url");
// Optional participant identifier, echoed verbatim into every result output.
const pid = params.get("pid");
const debugMode = !token || !callbackUrl;

const paramOverrides = {};
for (const key of [
  "word_list_index",
  "number_of_trials",
  "study_duration_ms",
  "number_of_distractors",
  "recognition_timeout_ms",
  "inter_trial_delay_ms",
]) {
  const val = params.get(key);
  if (val !== null) {
    paramOverrides[key] = parseFloat(val);
  }
}
for (const key of ["show_feedback", "show_tutorial"]) {
  const val = params.get(key);
  if (val !== null) {
    paramOverrides[key] = val !== "false" && val !== "0";
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

// webcam=1 or webcam=true enables optional recording
const webcamParam = params.get("webcam");
const webcamEnabled = webcamParam === "1" || webcamParam === "true";
if (webcamEnabled) {
  try {
    webcamModule = await import("../webcam/webcam.js");
    webcamModule.initWebcamLogger(token, callbackUrl);
  } catch (e) {
    console.warn("[mVLT] Could not load webcam module:", e);
  }
}

// webgazer=1 or webgazer=true enables optional eye tracking
const webgazerParam = params.get("webgazer");
const webgazerEnabled = webgazerParam === "1" || webgazerParam === "true";
if (webgazerEnabled) {
  try {
    webgazerModule = await import("../webgazer/webgazer.js");
    webgazerModule.initGazeLogger(token, callbackUrl);
  } catch (e) {
    console.warn("[mVLT] Could not load webgazer module:", e);
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
    console.log("[mVLT debug] trial data:", ev.newData);
  }
});

/**
 * Compute d-prime with log-linear correction for floor/ceiling.
 * Hautus (1995) correction: add 0.5 to both hits and false alarms,
 * add 1 to both signal and noise totals.
 */
function computeDPrime(hits, falseAlarms, nTargets, nDistractors) {
  const hitRate = (hits + 0.5) / (nTargets + 1);
  const faRate = (falseAlarms + 0.5) / (nDistractors + 1);
  // Probit (inverse normal CDF) approximation — Abramowitz & Stegun
  const probit = (p) => {
    const a1 = -3.969683028665376e1;
    const a2 = 2.209460984245205e2;
    const a3 = -2.759285104469687e2;
    const a4 = 1.383577518672690e2;
    const a5 = -3.066479806614716e1;
    const a6 = 2.506628277459239e0;
    const b1 = -5.447609879822406e1;
    const b2 = 1.615858368580409e2;
    const b3 = -1.556989798598866e2;
    const b4 = 6.680131188771972e1;
    const b5 = -1.328068155288572e1;
    const c1 = -7.784894002430293e-3;
    const c2 = -3.223964580411365e-1;
    const c3 = -2.400758277161838e0;
    const c4 = -2.549732539343734e0;
    const c5 = 4.374664141464968e0;
    const c6 = 2.938163982698783e0;
    const d1 = 7.784695709041462e-3;
    const d2 = 3.224671290700398e-1;
    const d3 = 2.445134137142996e0;
    const d4 = 3.754408661907416e0;
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
      );
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (
        ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
        (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
      );
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return (
        -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
      );
    }
  };
  return probit(hitRate) - probit(faRate);
}

function computeSummary(trials) {
  const trialNumbers = [...new Set(trials.map((t) => t.trial_number))].sort();
  const nTargets = trials.filter(
    (t) => t.trial_number === trialNumbers[0] && t.word_type === "target",
  ).length;
  const nDistractors = trials.filter(
    (t) => t.trial_number === trialNumbers[0] && t.word_type === "distractor",
  ).length;

  const perTrial = trialNumbers.map((tn) => {
    const trialData = trials.filter((t) => t.trial_number === tn);
    const hits = trialData.filter(
      (t) => t.word_type === "target" && t.response === "yes",
    ).length;
    const falseAlarms = trialData.filter(
      (t) => t.word_type === "distractor" && t.response === "yes",
    ).length;
    const misses = trialData.filter(
      (t) => t.word_type === "target" && t.response !== "yes",
    ).length;
    const correctRejections = trialData.filter(
      (t) => t.word_type === "distractor" && t.response !== "yes",
    ).length;
    const totalCorrect = hits + correctRejections;
    const dPrime = computeDPrime(hits, falseAlarms, nTargets, nDistractors);
    return {
      trial_number: tn,
      hits,
      false_alarms: falseAlarms,
      misses,
      correct_rejections: correctRejections,
      total_correct: totalCorrect,
      d_prime: Math.round(dPrime * 100) / 100,
    };
  });

  const totalCorrectAll = perTrial.reduce((s, t) => s + t.total_correct, 0);
  const learningCurve = perTrial.map((t) => t.total_correct);

  return {
    per_trial: perTrial,
    total_correct: totalCorrectAll,
    mean_total_correct:
      Math.round((totalCorrectAll / trialNumbers.length) * 100) / 100,
    learning_curve: learningCurve,
  };
}

session.onEnd(async () => {
  if (webgazerModule) {
    try {
      await webgazerModule.stopAndExportGaze("mvlt");
    } catch (e) {
      console.warn("[mVLT] Gaze export failed:", e);
    }
  }

  if (webcamRecording && webcamModule) {
    await webcamModule.stopAndDownloadRecording(webcamRecording, "mvlt");
  }

  const summary = computeSummary(allTrialData);

  if (debugMode) {
    console.log("[mVLT debug] all trial data:", {
      ...summary,
      trials: allTrialData,
    });
    const showEndScreen =
      params.get("show_end_screen") !== "false" &&
      params.get("show_end_screen") !== "0";
    if (showEndScreen) {
      const perTrialHtml = summary.per_trial
        .map(
          (t) =>
            `Trial ${t.trial_number}: ${t.total_correct}/${t.hits + t.misses + t.false_alarms + t.correct_rejections} correct (hits=${t.hits}, FA=${t.false_alarms}, d'=${t.d_prime})`,
        )
        .join("<br>");

      document.body.innerHTML = `
        <div style="text-align:center;padding:40px;font-family:sans-serif;color:#333;background:#fff;min-height:100vh;box-sizing:border-box;">
          <h1 style="color:#388E3C;">mVLT Complete (Debug Mode)</h1>
          <p>No token/callback_url provided &mdash; results shown below.</p>
          <div style="margin:20px auto;max-width:500px;text-align:left;background:#f5f5f5;padding:16px;border-radius:8px;">
            <p style="font-size:14px;color:#555;">${perTrialHtml}</p>
            <p style="font-size:14px;color:#555;">Learning curve: [${summary.learning_curve.join(", ")}]</p>
            <p style="font-size:14px;color:#555;">Mean correct: ${summary.mean_total_correct}</p>
          </div>
          <details open style="text-align:left;max-width:600px;margin:20px auto;">
            <summary style="cursor:pointer;color:#388E3C;font-size:16px;">Trial Data (JSON)</summary>
            <pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto;font-size:12px;color:#333;max-height:60vh;">${JSON.stringify(allTrialData, null, 2)}</pre>
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
        pid,
        data: {
          pid,
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
      setTimeout(
        () => window.Telegram.WebApp.close(),
        showEndScreen ? 2000 : 0,
      );
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

// Conditionally show consent, then start webcam recording
if (webcamEnabled && webcamModule) {
  const accepted = await webcamModule.showWebcamConsentOverlay();
  if (accepted) {
    try {
      const stream = await webcamModule.getWebcamStream();
      await webcamModule.showFacePositioningGuide(stream);
      webcamRecording = webcamModule.startRecordingStream(stream);
    } catch (_) {
      console.warn(
        "[mVLT] Webcam recording unavailable, proceeding without it.",
      );
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
      console.warn(
        "[mVLT] Eye tracking unavailable, proceeding without it.",
        e,
      );
    }
  }
}

session.initialize();
