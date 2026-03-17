import {
  showWebcamConsentOverlay,
  getWebcamStream,
  startRecordingStream,
  showFacePositioningGuide,
  stopAndDownloadRecording,
} from "../../webcam/webcam.js";

let webgazerModule = null;

const context = {
  urlParams: new URLSearchParams(window.location.search),
  assessment: {
    name: "@m2c2kit/assessment-color-shapes",
    version: "0.8.33"
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

// webcam=1 or webcam=true enables the optional recording feature
// Must be read and stripped before setGameParametersFromUrlParams is called,
// otherwise the unknown param gets forwarded to the game engine.
const webcamParam = context.urlParams.get("webcam");
const webcamEnabled = webcamParam === "1" || webcamParam === "true";
context.urlParams.delete("webcam");

// webgazer=1 or webgazer=true enables the optional eye tracking feature
const webgazerParam = context.urlParams.get("webgazer");
const webgazerEnabled = webgazerParam === "1" || webgazerParam === "true";
if (webgazerEnabled) {
  try {
    webgazerModule = await import("../../webgazer/webgazer.js");
    webgazerModule.initGazeLogger(context.urlParams.get("token"), context.urlParams.get("callback_url"));
  } catch (e) {
    console.warn("[Color Shapes] Could not load webgazer module:", e);
  }
}
context.urlParams.delete("webgazer");

const [sessionModule, assessmentModule] = await loadModules(["@m2c2kit/session", "@m2c2kit/assessment-color-shapes"]);
const assessmentClassName = getAssessmentClassNameFromModule(assessmentModule);
const assessment = new assessmentModule[assessmentClassName]();
const session = new sessionModule.Session({
  activities: [assessment]
});
assessment.setParameters({
  "number_of_trials": 12,
  "show_quit_button": false,
  "show_trials_complete_scene": false
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
  if (webgazerModule) {
    webgazerModule.markTrialEnd();
    webgazerModule.markTrialStart();
  }
  allTrialData.push(ev.newData);
});

session.onEnd(async () => {
  if (webgazerModule) {
    try {
      await webgazerModule.stopAndExportGaze("color-shapes");
    } catch (e) {
      console.warn("[Color Shapes] Gaze export failed:", e);
    }
  }

  if (webcamRecording) {
    await stopAndDownloadRecording(webcamRecording, "color-shapes");
  }

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

assessment.onStart(() => {
  const skipBtn = document.createElement('div');
  skipBtn.textContent = 'Skip tutorial';
  Object.assign(skipBtn.style, {
    position: 'fixed',
    bottom: '4%',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    color: 'rgba(160, 160, 160, 1)',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'sans-serif',
    padding: '8px 16px',
    userSelect: 'none',
    webkitTapHighlightColor: 'transparent',
  });
  document.body.appendChild(skipBtn);

  const scenes = assessment.scenes;
  const lastInstructionIdx = scenes.reduce((acc, s, i) =>
    s.name.startsWith('instructions-') ? i : acc, -1);
  const targetScene = lastInstructionIdx >= 0 ? scenes[lastInstructionIdx + 1] : null;

  skipBtn.addEventListener('click', () => {
    if (targetScene) {
      assessment.presentScene(targetScene);
    }
    cleanup();
  });

  function cleanup() {
    skipBtn.remove();
    clearInterval(interval);
  }

  const interval = setInterval(() => {
    const cur = assessment.currentScene;
    if (cur && !cur.name.startsWith('instructions-')) {
      cleanup();
    }
  }, 200);
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
      console.warn("[Color Shapes] Webcam recording unavailable, proceeding without it.");
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
      console.warn("[Color Shapes] Eye tracking unavailable, proceeding without it.", e);
    }
  }
}

setGameParametersFromUrlParams(assessment, context.urlParams);
session.initialize();
