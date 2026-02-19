import { Session } from "@m2c2kit/session";
import { PvtBa } from "./pvt-ba.js";

const assessment = new PvtBa();

const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const callbackUrl = params.get("callback_url");

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
});

session.onEnd(async () => {
  if (!token || !callbackUrl) {
    document.body.innerHTML = `
      <div style="text-align:center;padding:40px;font-family:sans-serif;">
        <h2 style="color:#c62828;">Missing parameters</h2>
        <p>Please use the link provided in Telegram.</p>
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
