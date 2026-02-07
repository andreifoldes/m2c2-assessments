/**
 * m2c2kit static site configuration for EMA bot cognitive assessments.
 *
 * URL parameters expected from the bot:
 *   ?token=<uuid>&callback_url=<bot_api_url>&number_of_trials=<n>
 *
 * On completion, results are POSTed to the callback_url with the token.
 */

/** @typedef {import("@m2c2kit/schematics").StaticSiteConfig} StaticSiteConfig */
/** @type {StaticSiteConfig} */
export default {
  configVersion: "0.1.34",
  outDir: "./dist",
  demo: {
    enabled: false,
  },
  includeSchemasJson: false,
  assessments: [
    {
      name: "@m2c2kit/assessment-symbol-search",
      versions: ">=0.8.26",
      parameters: {
        number_of_trials: 12,
        show_quit_button: false,
      },
    },
    {
      name: "@m2c2kit/assessment-color-dots",
      versions: ">=0.8.26",
      parameters: {
        number_of_trials: 12,
        show_quit_button: false,
      },
    },
    {
      name: "@m2c2kit/assessment-color-shapes",
      versions: ">=0.8.26",
      parameters: {
        number_of_trials: 12,
        show_quit_button: false,
      },
    },
    {
      name: "@m2c2kit/assessment-grid-memory",
      versions: ">=0.8.26",
      parameters: {
        number_of_trials: 12,
        show_quit_button: false,
      },
    },
  ],
  configure: (context, session, assessment) => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const callbackUrl = params.get("callback_url");
    const numberOfTrials = params.get("number_of_trials");

    // Override number_of_trials from URL param if provided
    if (numberOfTrials) {
      assessment.setParameters({ number_of_trials: parseInt(numberOfTrials, 10) });
    }

    const allTrialData = [];

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

        // If running inside Telegram Mini App, close the WebView
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
  },
};
