const context = {
  urlParams: new URLSearchParams(window.location.search),
  assessment: {
    name: "@m2c2kit/assessment-color-dots",
    version: "0.8.29"
  }
};
async function loadModules(moduleNames) {
  const modules = await Promise.all(
    moduleNames.map((moduleName) => import(moduleName))
  );
  return modules;
}

function getAssessmentClassNameFromModule(assessmentModule) {
  const assessments = Object.keys(assessmentModule).filter((key) => {
    const obj = assessmentModule[key];
    if (typeof obj === "function" &&
      obj.prototype &&
      obj.prototype.constructor === obj) {
      // assessments should always inherit from Game
      const parentClass = Object.getPrototypeOf(obj.prototype).constructor;
      const parentProps = Object.getOwnPropertyNames(parentClass.prototype);
      // if the parent is Game, it should have the following properties
      return (parentProps.includes("loop") &&
        parentProps.includes("update") &&
        parentProps.includes("draw"));
    }
    return false;
  });
  if (assessments.length === 0) {
    throw new Error("could not determine assessment in module");
  }
  if (assessments.length > 1) {
    throw new Error("there is more than one assessment exported in the module");
  }
  return assessments[0];
}

function setGameParametersFromUrlParams(game, urlParams) {
  const gameParameters = Object.fromEntries(urlParams.entries());
  game.setParameters(gameParameters);
}

const [sessionModule, assessmentModule] = await loadModules(["@m2c2kit/session", "@m2c2kit/assessment-color-dots"]);
const assessmentClassName = getAssessmentClassNameFromModule(assessmentModule);
const assessment = new assessmentModule[assessmentClassName]();
const session = new sessionModule.Session({
  activities: [assessment]
});
assessment.setParameters({
  "number_of_trials": 12,
  "show_quit_button": false
});

const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const callbackUrl = params.get("callback_url");
const numberOfTrials = params.get("number_of_trials");

// Override number_of_trials from URL param if provided
if (numberOfTrials) {
  assessment.setParameters({
    number_of_trials: parseInt(numberOfTrials, 10)
  });
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token,
        data: {
          trials: allTrialData
        }
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

setGameParametersFromUrlParams(assessment, context.urlParams);
session.initialize();