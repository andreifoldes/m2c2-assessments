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
    const summary = {
      totalTrials: allTrialData.length,
      trials: allTrialData,
    };
    console.log("[PVT-BA debug] all trial data:", summary);
    document.body.innerHTML = `
      <div style="text-align:center;padding:40px;font-family:sans-serif;color:#e0e0e0;background:#1a1a2e;min-height:100vh;box-sizing:border-box;">
        <h1 style="color:#4CAF50;">Assessment Complete (Debug Mode)</h1>
        <p>No token/callback_url provided &mdash; results shown below instead of being submitted.</p>
        <p style="color:#90CAF9;">Total trials: ${allTrialData.length}</p>
        <details open style="text-align:left;max-width:600px;margin:20px auto;">
          <summary style="cursor:pointer;color:#FFC107;font-size:16px;">Trial Data (JSON)</summary>
          <pre style="background:#0d0d1a;padding:16px;border-radius:8px;overflow-x:auto;font-size:12px;color:#ccc;max-height:60vh;">${JSON.stringify(allTrialData, null, 2)}</pre>
        </details>
      </div>`;
    return;
  }

  try {
    const resp = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, data: { trials: allTrialData } }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: ${resp.status}`);
    }

    document.body.innerHTML = `
      <div style="text-align:center;padding:40px;font-family:sans-serif;">
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
      <div style="text-align:center;padding:40px;font-family:sans-serif;">
        <h2 style="color:#c62828;">Submission Error</h2>
        <p>Failed to submit results. Please contact the research team.</p>
      </div>`;
  }
});

session.initialize();
