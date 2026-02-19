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

session.initialize();
