import { Session } from "@m2c2kit/session";
import { Prices } from "./prices.js";

const assessment = new Prices();

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

const allTrialData = [];

const session = new Session({
  activities: [assessment],
});

session.onActivityData((ev) => {
  allTrialData.push(ev.newData);
  if (debugMode) {
    console.log("[Prices debug] trial data:", ev.newData);
  }
});

session.onEnd(async () => {
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
    document.body.innerHTML = `
      <div style="text-align:center;padding:40px;font-family:sans-serif;color:#e0e0e0;background:#1a1a2e;min-height:100vh;box-sizing:border-box;">
        <h1 style="color:#FFC107;">Assessment Complete (Debug Mode)</h1>
        <p>No token/callback_url provided &mdash; results shown below instead of being submitted.</p>
        <p style="color:#90CAF9;">Correct: ${correct}/${total} &nbsp;|&nbsp; Error rate: ${errorRate.toFixed(1)}%</p>
        <details open style="text-align:left;max-width:600px;margin:20px auto;">
          <summary style="cursor:pointer;color:#FFC107;font-size:16px;">Trial Data (JSON)</summary>
          <pre style="background:#0d0d1a;padding:16px;border-radius:8px;overflow-x:auto;font-size:12px;color:#ccc;max-height:60vh;">${JSON.stringify(allTrialData, null, 2)}</pre>
        </details>
      </div>`;
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
