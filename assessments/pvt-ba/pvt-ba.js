import {
  Game,
  Action,
  Scene,
  Shape,
  Label,
  Timer,
  WebColors,
  RandomDraws,
  Transition,
} from "@m2c2kit/core";
import { AdaptiveAlgorithm, Classification } from "./adaptive-algorithm.js";

// m2c2kit standard palette (light background)
const SCENE_BG = [255, 255, 255, 1];
const TEXT_PRIMARY = [0, 0, 0, 1];
const TEXT_SECONDARY = [100, 100, 100, 1];
const TEXT_TERTIARY = [140, 140, 140, 1];
const BUTTON_BG = [0, 0, 0, 1];
const BUTTON_TEXT = [255, 255, 255, 1];
const START_BUTTON_BG = [0, 128, 0, 1];

// Stimulus / feedback colors
const STIMULUS_BOX_BG = [230, 230, 240, 1];
const STIMULUS_BOX_BORDER = [180, 180, 200, 1];
const GREEN = [76, 175, 80, 1];
const YELLOW = [200, 160, 0, 1];
const RED = [244, 67, 54, 1];

export class PvtBa extends Game {
  constructor() {
    const defaultParameters = {
      max_duration_seconds: {
        default: 180,
        type: "number",
        description: "Maximum test duration in seconds",
      },
      min_isi_ms: {
        default: 1000,
        type: "number",
        description: "Minimum inter-stimulus interval in ms",
      },
      max_isi_ms: {
        default: 4000,
        type: "number",
        description: "Maximum inter-stimulus interval in ms",
      },
      lapse_threshold_ms: {
        default: 355,
        type: "number",
        description: "Reaction time threshold for a lapse in ms",
      },
      false_start_threshold_ms: {
        default: 100,
        type: "number",
        description: "Reaction time threshold for a false start in ms",
      },
      decision_threshold: {
        default: 0.99619,
        type: "number",
        description: "Posterior probability threshold to stop the test",
      },
      feedback_duration_ms: {
        default: 1000,
        type: "number",
        description: "Duration of feedback display in ms",
      },
      show_quit_button: {
        default: false,
        type: "boolean",
        description: "Whether to show a quit button",
      },
      show_tutorial: {
        default: true,
        type: "boolean",
        description:
          "Whether to show the multi-screen tutorial before the test",
      },
      show_results: {
        default: false,
        type: "boolean",
        description:
          "Whether to show the detailed results page with High/Medium/Low classification. When false, participants see a simple completion message.",
      },
    };

    super({
      name: "PVT-BA",
      id: "pvt-ba",
      publishUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      version: "1.0.0",
      shortDescription:
        "Adaptive Psychomotor Vigilance Test measuring sustained attention and reaction time",
      width: 400,
      height: 800,
      stretch: true,
      fonts: [
        {
          fontName: "roboto",
          url: "fonts/roboto/Roboto-Regular.ttf",
        },
      ],
      images: [],
      trialSchema: {
        trial_index: { type: "integer", description: "0-based trial index" },
        rt_ms: {
          type: ["number", "null"],
          description: "Reaction time in milliseconds, null if no response",
        },
        isi_ms: {
          type: "number",
          description: "Inter-stimulus interval for this trial in ms",
        },
        stimulus_onset_timestamp: {
          type: "number",
          description: "performance.now() when stimulus appeared",
        },
        response_timestamp: {
          type: ["number", "null"],
          description: "performance.now() when response occurred",
        },
        is_lapse: {
          type: "boolean",
          description: "Whether RT >= lapse threshold",
        },
        is_false_start: {
          type: "boolean",
          description: "Whether RT < false start threshold or no stimulus",
        },
        cumulative_lpfs: {
          type: "integer",
          description: "Running total of lapses + false starts",
        },
        elapsed_test_time_ms: {
          type: "number",
          description: "Time since first trial started in ms",
        },
        time_bin: {
          type: "integer",
          description: "30-second time bin (0-5)",
        },
        posterior_high: {
          type: "number",
          description: "Posterior probability of HIGH performance",
        },
        posterior_medium: {
          type: "number",
          description: "Posterior probability of MEDIUM performance",
        },
        posterior_low: {
          type: "number",
          description: "Posterior probability of LOW performance",
        },
        classification: {
          type: ["string", "null"],
          description:
            "Final classification (HIGH/MEDIUM/LOW), only on last trial",
        },
      },
      parameters: defaultParameters,
    });
  }

  async initialize() {
    await super.initialize();

    // State
    this._algorithm = new AdaptiveAlgorithm(
      this.getParameter("decision_threshold"),
    );
    this._testStartTime = 0;
    this._stimulusOnsetTime = 0;
    this._stimulusActive = false;
    this._waitingForISI = false;
    this._responded = false;
    this._counterInterval = null;
    this._currentISI = 0;
    this._testEnded = false;

    if (this.getParameter("show_tutorial")) {
      this._buildTutorialScenes();
    } else {
      this._buildInstructionsScene();
    }
    this._buildTrialScene();
    if (this.getParameter("show_results")) {
      this._buildResultsScene();
    } else {
      this._buildEndScene();
    }
  }

  _addSkipTutorialButton(scene, zPos = 20) {
    const skipLabel = new Label({
      text: "Skip tutorial",
      fontSize: 14,
      fontColor: TEXT_TERTIARY,
      position: { x: 200, y: 740 },
      isUserInteractionEnabled: true,
      zPosition: zPos,
    });
    scene.addChild(skipLabel);

    skipLabel.onTapDown(() => {
      this.presentScene("trial", Transition.none());
    });
  }

  _buildTutorialScenes() {
    // --- Screen 1: Welcome ---
    const scene1 = new Scene({
      name: "tutorial_1",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene1);
    this._addSkipTutorialButton(scene1);

    const welcome = new Label({
      text: "Psychomotor\nVigilance Test",
      fontSize: 32,
      fontColor: TEXT_PRIMARY,
      position: { x: 200, y: 200 },
      preferredMaxLayoutWidth: 340,
    });
    scene1.addChild(welcome);

    const desc = new Label({
      text: "This is a brief test of your\nreaction time and attention.",
      fontSize: 20,
      fontColor: TEXT_SECONDARY,
      position: { x: 200, y: 340 },
      preferredMaxLayoutWidth: 340,
    });
    scene1.addChild(desc);

    const desc2 = new Label({
      text: "It will take about 3 minutes\nor less.",
      fontSize: 18,
      fontColor: TEXT_TERTIARY,
      position: { x: 200, y: 430 },
      preferredMaxLayoutWidth: 340,
    });
    scene1.addChild(desc2);

    const nextBtn1 = new Shape({
      rect: { width: 200, height: 56 },
      cornerRadius: 28,
      fillColor: BUTTON_BG,
      position: { x: 200, y: 670 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene1.addChild(nextBtn1);

    const nextLabel1 = new Label({
      text: "NEXT",
      fontSize: 22,
      fontColor: BUTTON_TEXT,
      position: { x: 200, y: 670 },
      zPosition: 11,
    });
    scene1.addChild(nextLabel1);

    nextBtn1.onTapDown(() => {
      this.presentScene("tutorial_2", Transition.none());
    });

    // --- Screen 2: Thumb positioning ---
    const scene2 = new Scene({
      name: "tutorial_2",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene2);
    this._addSkipTutorialButton(scene2);

    const thumbTitle = new Label({
      text: "Get Ready",
      fontSize: 28,
      fontColor: TEXT_PRIMARY,
      position: { x: 200, y: 120 },
    });
    scene2.addChild(thumbTitle);

    const thumbBox = new Shape({
      rect: { width: 220, height: 90 },
      cornerRadius: 12,
      fillColor: STIMULUS_BOX_BG,
      strokeColor: STIMULUS_BOX_BORDER,
      lineWidth: 2,
      position: { x: 200, y: 300 },
    });
    scene2.addChild(thumbBox);

    const thumbInstr = new Label({
      text: "Hover the thumb of your\ndominant hand over the\nscreen and watch the box.",
      fontSize: 20,
      fontColor: TEXT_SECONDARY,
      position: { x: 200, y: 460 },
      preferredMaxLayoutWidth: 340,
    });
    scene2.addChild(thumbInstr);

    const thumbHint = new Label({
      text: "Keep your thumb close to the\nscreen so you can tap quickly.",
      fontSize: 16,
      fontColor: TEXT_TERTIARY,
      position: { x: 200, y: 570 },
      preferredMaxLayoutWidth: 340,
    });
    scene2.addChild(thumbHint);

    const nextBtn2 = new Shape({
      rect: { width: 200, height: 56 },
      cornerRadius: 28,
      fillColor: BUTTON_BG,
      position: { x: 200, y: 670 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene2.addChild(nextBtn2);

    const nextLabel2 = new Label({
      text: "NEXT",
      fontSize: 22,
      fontColor: BUTTON_TEXT,
      position: { x: 200, y: 670 },
      zPosition: 11,
    });
    scene2.addChild(nextLabel2);

    nextBtn2.onTapDown(() => {
      this.presentScene("tutorial_3", Transition.none());
    });

    // --- Screen 3: How it works ---
    const scene3 = new Scene({
      name: "tutorial_3",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene3);
    this._addSkipTutorialButton(scene3);

    const howTitle = new Label({
      text: "How It Works",
      fontSize: 28,
      fontColor: TEXT_PRIMARY,
      position: { x: 200, y: 100 },
    });
    scene3.addChild(howTitle);

    const demoBox = new Shape({
      rect: { width: 220, height: 90 },
      cornerRadius: 12,
      fillColor: STIMULUS_BOX_BG,
      strokeColor: STIMULUS_BOX_BORDER,
      lineWidth: 2,
      position: { x: 200, y: 240 },
    });
    scene3.addChild(demoBox);

    const demoCounter = new Label({
      text: "325",
      fontSize: 48,
      fontColor: GREEN,
      position: { x: 200, y: 240 },
    });
    scene3.addChild(demoCounter);

    const howInstr1 = new Label({
      text: "A counter will appear in the box.",
      fontSize: 18,
      fontColor: TEXT_SECONDARY,
      position: { x: 200, y: 360 },
      preferredMaxLayoutWidth: 340,
    });
    scene3.addChild(howInstr1);

    const howInstr2 = new Label({
      text: "Tap the screen as quickly as\npossible when the counter appears.",
      fontSize: 18,
      fontColor: TEXT_SECONDARY,
      position: { x: 200, y: 430 },
      preferredMaxLayoutWidth: 340,
    });
    scene3.addChild(howInstr2);

    const howInstr3 = new Label({
      text: "Do NOT tap when the box is empty.",
      fontSize: 18,
      fontColor: RED,
      position: { x: 200, y: 510 },
      preferredMaxLayoutWidth: 340,
    });
    scene3.addChild(howInstr3);

    const beginBtn = new Shape({
      rect: { width: 200, height: 56 },
      cornerRadius: 28,
      fillColor: START_BUTTON_BG,
      position: { x: 200, y: 670 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene3.addChild(beginBtn);

    const beginLabel = new Label({
      text: "BEGIN",
      fontSize: 22,
      fontColor: BUTTON_TEXT,
      position: { x: 200, y: 670 },
      zPosition: 11,
    });
    scene3.addChild(beginLabel);

    beginBtn.onTapDown(() => {
      this.presentScene("trial", Transition.none());
    });
  }

  _buildInstructionsScene() {
    const scene = new Scene({ name: "instructions", backgroundColor: SCENE_BG });
    this.addScene(scene);

    const title = new Label({
      text: "Psychomotor Vigilance Test",
      fontSize: 28,
      fontColor: TEXT_PRIMARY,
      position: { x: 200, y: 140 },
    });
    scene.addChild(title);

    const box = new Shape({
      rect: { width: 220, height: 90 },
      cornerRadius: 12,
      fillColor: STIMULUS_BOX_BG,
      strokeColor: STIMULUS_BOX_BORDER,
      lineWidth: 2,
      position: { x: 200, y: 300 },
    });
    scene.addChild(box);

    const exampleCounter = new Label({
      text: "325",
      fontSize: 48,
      fontColor: GREEN,
      position: { x: 200, y: 300 },
    });
    scene.addChild(exampleCounter);

    const instr1 = new Label({
      text: "A counter will appear in the box above.",
      fontSize: 18,
      fontColor: TEXT_SECONDARY,
      position: { x: 200, y: 420 },
      preferredMaxLayoutWidth: 340,
    });
    scene.addChild(instr1);

    const instr2 = new Label({
      text: "Tap the screen as quickly as possible\nwhen the counter appears.",
      fontSize: 18,
      fontColor: TEXT_SECONDARY,
      position: { x: 200, y: 490 },
      preferredMaxLayoutWidth: 340,
    });
    scene.addChild(instr2);

    const instr3 = new Label({
      text: "Do NOT tap when the box is empty.",
      fontSize: 18,
      fontColor: RED,
      position: { x: 200, y: 560 },
      preferredMaxLayoutWidth: 340,
    });
    scene.addChild(instr3);

    const tapHint = new Label({
      text: "Tap anywhere to begin",
      fontSize: 14,
      fontColor: TEXT_TERTIARY,
      position: { x: 200, y: 720 },
    });
    scene.addChild(tapHint);

    const startBtn = new Shape({
      rect: { width: 200, height: 56 },
      cornerRadius: 28,
      fillColor: START_BUTTON_BG,
      position: { x: 200, y: 670 },
    });
    scene.addChild(startBtn);

    const startLabel = new Label({
      text: "START",
      fontSize: 22,
      fontColor: BUTTON_TEXT,
      position: { x: 200, y: 670 },
    });
    scene.addChild(startLabel);

    // Full-screen overlay for cross-browser reliable tap detection.
    // Firefox computes offsetX/offsetY differently on stretched canvases,
    // so a small hit area can miss. A full-screen overlay avoids this.
    const tapOverlay = new Shape({
      rect: { width: 400, height: 800 },
      fillColor: [0, 0, 0, 0.01],
      position: { x: 200, y: 400 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(tapOverlay);

    tapOverlay.onTapDown(() => {
      console.log("[pvt-ba] scene:trial");
      this.presentScene("trial", Transition.none());
    });
  }

  _buildTrialScene() {
    const scene = new Scene({ name: "trial", backgroundColor: SCENE_BG });
    this.addScene(scene);

    const stimulusBox = new Shape({
      name: "stimulusBox",
      rect: { width: 260, height: 110 },
      cornerRadius: 14,
      fillColor: STIMULUS_BOX_BG,
      strokeColor: STIMULUS_BOX_BORDER,
      lineWidth: 2,
      position: { x: 200, y: 350 },
    });
    scene.addChild(stimulusBox);

    const counterLabel = new Label({
      name: "counterLabel",
      text: "",
      fontSize: 56,
      fontColor: GREEN,
      position: { x: 200, y: 350 },
    });
    scene.addChild(counterLabel);

    const feedbackLabel = new Label({
      name: "feedbackLabel",
      text: "",
      fontSize: 20,
      fontColor: TEXT_SECONDARY,
      position: { x: 200, y: 450 },
    });
    scene.addChild(feedbackLabel);

    const statusLabel = new Label({
      name: "statusLabel",
      text: "",
      fontSize: 14,
      fontColor: TEXT_TERTIARY,
      position: { x: 200, y: 750 },
    });
    scene.addChild(statusLabel);

    // Full-screen tap area (invisible, on top)
    const tapArea = new Shape({
      name: "tapArea",
      rect: { width: 400, height: 800 },
      fillColor: [0, 0, 0, 0.01],
      position: { x: 200, y: 400 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(tapArea);

    tapArea.onTapDown(() => {
      this._handleTap();
    });

    scene.onAppear(() => {
      console.log("[pvt-ba] trial:started");
      this._testStartTime = Timer.now();
      this._beginTrial();
    });
  }

  _buildEndScene() {
    const scene = new Scene({ name: "end", backgroundColor: SCENE_BG });
    this.addScene(scene);

    const title = new Label({
      text: "Test Complete",
      fontSize: 28,
      fontColor: TEXT_PRIMARY,
      position: { x: 200, y: 340 },
    });
    scene.addChild(title);

    const subtitle = new Label({
      text: "Thank you for participating.",
      fontSize: 18,
      fontColor: TEXT_SECONDARY,
      position: { x: 200, y: 400 },
      preferredMaxLayoutWidth: 340,
    });
    scene.addChild(subtitle);

    const self = this;
    scene.onAppear(() => {
      scene.run(
        Action.sequence([
          Action.wait({ duration: 3000 }),
          Action.custom({
            callback: () => {
              self.end();
            },
          }),
        ]),
      );
    });
  }

  _buildResultsScene() {
    const scene = new Scene({ name: "results", backgroundColor: SCENE_BG });
    this.addScene(scene);

    const resultTitle = new Label({
      name: "resultTitle",
      text: "Test Complete",
      fontSize: 28,
      fontColor: TEXT_PRIMARY,
      position: { x: 200, y: 120 },
    });
    scene.addChild(resultTitle);

    // Traffic light circles
    const lightGreen = new Shape({
      name: "lightGreen",
      circleOfRadius: 40,
      fillColor: [60, 60, 60, 1],
      position: { x: 200, y: 280 },
    });
    scene.addChild(lightGreen);

    const lightYellow = new Shape({
      name: "lightYellow",
      circleOfRadius: 40,
      fillColor: [60, 60, 60, 1],
      position: { x: 200, y: 390 },
    });
    scene.addChild(lightYellow);

    const lightRed = new Shape({
      name: "lightRed",
      circleOfRadius: 40,
      fillColor: [60, 60, 60, 1],
      position: { x: 200, y: 500 },
    });
    scene.addChild(lightRed);

    const lightLabelGreen = new Label({
      text: "HIGH",
      fontSize: 16,
      fontColor: TEXT_TERTIARY,
      position: { x: 300, y: 280 },
    });
    scene.addChild(lightLabelGreen);

    const lightLabelYellow = new Label({
      text: "MEDIUM",
      fontSize: 16,
      fontColor: TEXT_TERTIARY,
      position: { x: 300, y: 390 },
    });
    scene.addChild(lightLabelYellow);

    const lightLabelRed = new Label({
      text: "LOW",
      fontSize: 16,
      fontColor: TEXT_TERTIARY,
      position: { x: 300, y: 500 },
    });
    scene.addChild(lightLabelRed);

    const classLabel = new Label({
      name: "classificationLabel",
      text: "",
      fontSize: 24,
      fontColor: TEXT_PRIMARY,
      position: { x: 200, y: 600 },
    });
    scene.addChild(classLabel);

    const statsLabel = new Label({
      name: "statsLabel",
      text: "",
      fontSize: 16,
      fontColor: TEXT_TERTIARY,
      position: { x: 200, y: 670 },
      preferredMaxLayoutWidth: 340,
    });
    scene.addChild(statsLabel);

    scene.onAppear(() => {
      const classification = this._algorithm.getClassification();
      const posteriors = this._algorithm.getPosteriors();

      const classLabelNode = scene.descendants.filter(
        (n) => n.name === "classificationLabel",
      )[0];
      const statsNode = scene.descendants.filter(
        (n) => n.name === "statsLabel",
      )[0];
      const greenNode = scene.descendants.filter(
        (n) => n.name === "lightGreen",
      )[0];
      const yellowNode = scene.descendants.filter(
        (n) => n.name === "lightYellow",
      )[0];
      const redNode = scene.descendants.filter(
        (n) => n.name === "lightRed",
      )[0];

      if (classification === Classification.HIGH) {
        greenNode.fillColor = GREEN;
        classLabelNode.fontColor = GREEN;
        classLabelNode.text = "Vigilance: HIGH";
      } else if (classification === Classification.MEDIUM) {
        yellowNode.fillColor = YELLOW;
        classLabelNode.fontColor = YELLOW;
        classLabelNode.text = "Vigilance: MEDIUM";
      } else {
        redNode.fillColor = RED;
        classLabelNode.fontColor = RED;
        classLabelNode.text = "Vigilance: LOW";
      }

      const elapsed = Timer.now() - this._testStartTime;
      const secs = (elapsed / 1000).toFixed(1);
      statsNode.text =
        `Trials: ${this._algorithm.getTrialCount()}  |  ` +
        `LpFS: ${this._algorithm.getLpfsCount()}  |  ` +
        `Time: ${secs}s`;

      // End the game after a brief viewing period
      const self = this;
      scene.run(
        Action.sequence([
          Action.wait({ duration: 4000 }),
          Action.custom({
            callback: () => {
              self.end();
            },
          }),
        ]),
      );
    });
  }

  /**
   * @param {number} feedbackConsumedMs - time already consumed by feedback
   *   display (part of the ISI per the paper). 0 for the first trial.
   */
  _beginTrial(feedbackConsumedMs = 0) {
    if (this._testEnded) return;

    const maxDuration = this.getParameter("max_duration_seconds") * 1000;
    const elapsed = Timer.now() - this._testStartTime;
    if (elapsed >= maxDuration) {
      this._endTest();
      return;
    }

    this._stimulusActive = false;
    this._waitingForISI = true;
    this._responded = false;
    this._stimulusOnsetTime = 0;

    const counterLabel = this._getNode("counterLabel");
    const feedbackLabel = this._getNode("feedbackLabel");
    counterLabel.text = "";
    feedbackLabel.text = "";

    const minISI = this.getParameter("min_isi_ms");
    const maxISI = this.getParameter("max_isi_ms");
    this._currentISI = RandomDraws.singleFromRange(minISI, maxISI);

    // Per the paper, ISI (1-4s) INCLUDES the feedback interval (1s).
    // Subtract time already consumed by feedback display.
    const waitMs = Math.max(0, this._currentISI - feedbackConsumedMs);

    const self = this;
    const trialScene = this._getScene("trial");
    trialScene.removeAllActions();

    trialScene.run(
      Action.sequence([
        Action.wait({ duration: waitMs }),
        Action.custom({
          callback: () => {
            self._showStimulus();
          },
        }),
      ]),
      "isi-wait",
    );
  }

  _showStimulus() {
    if (this._testEnded || this._responded) return;

    this._waitingForISI = false;
    this._stimulusActive = true;

    Timer.startNew("trialRT");
    this._stimulusOnsetTime = Timer.now();

    this._startCounter();

    // Set a max response window (30s) — if no response, treat as lapse
    const self = this;
    const trialScene = this._getScene("trial");
    trialScene.run(
      Action.sequence([
        Action.wait({ duration: 30000 }),
        Action.custom({
          callback: () => {
            if (self._stimulusActive && !self._responded) {
              self._recordTrial(null);
            }
          },
        }),
      ]),
      "timeout",
    );
  }

  _startCounter() {
    const counterLabel = this._getNode("counterLabel");
    const self = this;

    if (this._counterInterval) {
      clearInterval(this._counterInterval);
    }

    const updateCounter = () => {
      if (!self._stimulusActive || self._responded || self._testEnded) {
        clearInterval(self._counterInterval);
        self._counterInterval = null;
        return;
      }
      const ms = Math.round(Timer.now() - self._stimulusOnsetTime);
      counterLabel.text = String(ms);
    };

    updateCounter();
    this._counterInterval = setInterval(updateCounter, 16);
  }

  _handleTap() {
    if (this._testEnded || this._responded) return;

    if (this._waitingForISI) {
      // False start — tapped before stimulus appeared
      this._responded = true;
      const trialScene = this._getScene("trial");
      trialScene.removeAllActions();
      this._recordTrial(-1);
      return;
    }

    if (this._stimulusActive) {
      this._responded = true;
      Timer.stop("trialRT");
      const rt = Timer.elapsed("trialRT");
      Timer.remove("trialRT");

      if (this._counterInterval) {
        clearInterval(this._counterInterval);
        this._counterInterval = null;
      }

      const trialScene = this._getScene("trial");
      try {
        trialScene.removeAction("timeout");
      } catch (_) {
        /* already removed */
      }

      this._recordTrial(rt);
    }
  }

  /**
   * @param {number|null} rt - reaction time in ms, null for timeout, -1 for false start
   */
  _recordTrial(rt) {
    const lapseThreshold = this.getParameter("lapse_threshold_ms");
    const falseStartThreshold = this.getParameter("false_start_threshold_ms");
    const elapsed = Timer.now() - this._testStartTime;
    const timeBin = AdaptiveAlgorithm.timeBinFromElapsed(elapsed);

    let isFalseStart = false;
    let isLapse = false;
    let isTimeout = false;
    let rtValue = rt;

    if (rt === -1) {
      // Tapped during ISI (response without stimulus)
      isFalseStart = true;
      rtValue = null;
    } else if (rt === null) {
      // No response within 30s — counted as lapse with 30s RT per paper
      isLapse = true;
      isTimeout = true;
      rtValue = 30000;
    } else if (rt < falseStartThreshold) {
      isFalseStart = true;
    } else if (rt >= lapseThreshold) {
      isLapse = true;
    }

    const isLpfs = isFalseStart || isLapse;
    this._algorithm.update(isLpfs, timeBin);
    const posteriors = this._algorithm.getPosteriors();

    const isFinal =
      this._algorithm.shouldStop() ||
      elapsed >= this.getParameter("max_duration_seconds") * 1000;

    this.addTrialData("trial_index", this.trialIndex);
    this.addTrialData("rt_ms", rtValue);
    this.addTrialData("isi_ms", this._currentISI);
    this.addTrialData("stimulus_onset_timestamp", this._stimulusOnsetTime || 0);
    this.addTrialData(
      "response_timestamp",
      rtValue !== null && !isTimeout
        ? this._stimulusOnsetTime + rtValue
        : null,
    );
    this.addTrialData("is_lapse", isLapse);
    this.addTrialData("is_false_start", isFalseStart);
    this.addTrialData("cumulative_lpfs", this._algorithm.getLpfsCount());
    this.addTrialData("elapsed_test_time_ms", Math.round(elapsed));
    this.addTrialData("time_bin", timeBin);
    this.addTrialData("posterior_high", +posteriors.HIGH.toFixed(6));
    this.addTrialData("posterior_medium", +posteriors.MEDIUM.toFixed(6));
    this.addTrialData("posterior_low", +posteriors.LOW.toFixed(6));
    this.addTrialData(
      "classification",
      isFinal ? this._algorithm.getClassification() : null,
    );
    this.trialComplete();

    this._showFeedback(rtValue, isFalseStart, isLapse, isFinal, isTimeout);
  }

  _showFeedback(rt, isFalseStart, isLapse, isFinal, isTimeout = false) {
    this._stimulusActive = false;

    const counterLabel = this._getNode("counterLabel");
    const feedbackLabel = this._getNode("feedbackLabel");
    const stimulusBox = this._getNode("stimulusBox");

    if (isFalseStart) {
      counterLabel.text = "TOO EARLY";
      counterLabel.fontSize = 32;
      counterLabel.fontColor = RED;
      feedbackLabel.text = "Wait for the counter";
      feedbackLabel.fontColor = RED;
      stimulusBox.strokeColor = RED;
    } else if (isLapse) {
      const displayRT = isTimeout ? "---" : String(Math.round(rt));
      counterLabel.text = displayRT;
      counterLabel.fontSize = 56;
      counterLabel.fontColor = RED;
      feedbackLabel.text = isTimeout ? "" : "ms";
      feedbackLabel.fontColor = RED;
      stimulusBox.strokeColor = RED;
    } else {
      const lapseThreshold = this.getParameter("lapse_threshold_ms");
      const displayRT = Math.round(rt);
      counterLabel.text = String(displayRT);
      counterLabel.fontSize = 56;

      if (rt < lapseThreshold * 0.7) {
        counterLabel.fontColor = GREEN;
        feedbackLabel.fontColor = GREEN;
        stimulusBox.strokeColor = GREEN;
        feedbackLabel.text = "ms";
      } else {
        counterLabel.fontColor = YELLOW;
        feedbackLabel.fontColor = YELLOW;
        stimulusBox.strokeColor = YELLOW;
        feedbackLabel.text = "ms";
      }
    }

    const statusLabel = this._getNode("statusLabel");
    statusLabel.text = `Trial ${this._algorithm.getTrialCount()} | LpFS: ${this._algorithm.getLpfsCount()}`;

    const self = this;
    const feedbackDuration = this.getParameter("feedback_duration_ms");
    const trialScene = this._getScene("trial");

    trialScene.run(
      Action.sequence([
        Action.wait({ duration: feedbackDuration }),
        Action.custom({
          callback: () => {
            counterLabel.fontSize = 56;
            counterLabel.fontColor = GREEN;
            stimulusBox.strokeColor = STIMULUS_BOX_BORDER;
            feedbackLabel.text = "";

            if (isFinal) {
              self._endTest();
            } else {
              // Feedback is part of the ISI per the paper
              self._beginTrial(feedbackDuration);
            }
          },
        }),
      ]),
      "feedback",
    );
  }

  _endTest() {
    if (this._testEnded) return;
    this._testEnded = true;

    if (this._counterInterval) {
      clearInterval(this._counterInterval);
      this._counterInterval = null;
    }

    const endScene = this.getParameter("show_results") ? "results" : "end";
    this.presentScene(endScene, Transition.none());
  }

  _getNode(name) {
    const found = this.nodes.filter((n) => n.name === name);
    if (found.length === 0) {
      throw new Error(`Node not found: ${name}`);
    }
    return found[0];
  }

  _getScene(name) {
    return this.sceneManager.scenes.filter((s) => s.name === name)[0];
  }
}
