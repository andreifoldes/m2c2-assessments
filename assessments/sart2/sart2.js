import {
  Game,
  Action,
  Scene,
  Shape,
  Label,
  Timer,
  Transition,
} from "@m2c2kit/core";

// Palette follows the original PsyToolkit SART2 (black screen, cream text)
const SCENE_BG = [0, 0, 0, 1];
const TEXT = [255, 250, 225, 1];
const PROMPT = [255, 90, 20, 1];
const MASK_WHITE = [255, 255, 255, 1];
const MASK_GREEN = [124, 252, 0, 1];
const RED = [235, 30, 30, 1];

const GAME_WIDTH = 400;
const GAME_HEIGHT = 800;
const CENTER_X = GAME_WIDTH / 2;
const CENTER_Y = GAME_HEIGHT / 2;

// Digit font sizes of the original study, picked at random per trial
const DIGIT_FONT_SIZES = [48, 72, 94, 100, 120];
// Whole stimulus onset to next onset is 250 + 900 ms in the original
const TRIAL_MS = 1150;
const PRESS_LOCKOUT_MS = 350;

export class Sart2 extends Game {
  constructor() {
    const defaultParameters = {
      training_trials: {
        default: 18,
        type: "integer",
        description: "Number of trials in the training block",
      },
      test_trials: {
        default: 225,
        type: "integer",
        description: "Number of trials in the real test block",
      },
      no_go_digit: {
        default: 3,
        type: "integer",
        description: "The digit (1-9) the participant must withhold a response to",
      },
      digit_duration_ms: {
        default: 250,
        type: "number",
        description: "How long the digit is shown before the mask appears in ms",
      },
      error_feedback_ms: {
        default: 3000,
        type: "number",
        description: "How long the 'MISTAKE' message is shown after an error in ms",
      },
      post_error_blank_ms: {
        default: 500,
        type: "number",
        description: "Blank screen after the error message in ms",
      },
      show_tutorial: {
        default: true,
        type: "boolean",
        description: "Whether to show the instruction and training block",
      },
      show_quit_button: {
        default: false,
        type: "boolean",
        description: "Whether to show a quit button",
      },
    };

    super({
      name: "SART2",
      id: "sart2",
      publishUuid: "5f0c2d3e-7a41-4b8e-9c63-2d1e8b7a4f10",
      version: "1.0.0",
      shortDescription:
        "Sustained Attention to Response Task with feedback (SART2): respond to every digit except 3",
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      stretch: true,
      fonts: [
        { fontName: "roboto", url: "fonts/roboto/Roboto-Regular.ttf" },
      ],
      trialSchema: {
        trial_index: { type: "integer", description: "0-based trial index within the session" },
        block: { type: "string", description: "'training' or 'test'" },
        block_trial_index: { type: "integer", description: "0-based trial index within the block" },
        digit: { type: "integer", description: "Digit shown (1-9)" },
        digit_size_level: { type: "integer", description: "Font size level 1-5 (as 'digit_size' in the original)" },
        digit_font_px: { type: "integer", description: "Digit font size in px" },
        is_go: { type: "boolean", description: "True when a response was required (digit is not the no-go digit)" },
        responded: { type: "boolean", description: "Whether a response (space bar or tap) was made" },
        rt_ms: {
          type: ["number", "null"],
          description: "Reaction time from digit onset in ms, null if no response",
        },
        correct: { type: "boolean", description: "Go: responded; no-go: withheld" },
        error_type: {
          type: ["string", "null"],
          description: "'commission' (pressed on no-go), 'omission' (missed a go), or null",
        },
        digit_onset_timestamp: { type: "number", description: "performance.now() at digit onset" },
        elapsed_test_time_ms: { type: "number", description: "Time since the first trial of the session in ms" },
      },
      parameters: defaultParameters,
    });
  }

  async initialize() {
    await super.initialize();

    this._block = "training";
    this._blockDigits = [];
    this._blockTrial = 0;
    this._trialIndex = 0;
    this._sessionStart = 0;
    this._onPress = null;
    this._lockUntil = 0;
    this._listenersAttached = false;
    this._results = { training: this._emptyStats(), test: this._emptyStats() };

    const tutorial = this.getParameter("show_tutorial");
    if (!tutorial) this._buildRealInstruction();
    this._buildTextScene("title", [
      { text: "SART", size: 56, y: 180 },
      { text: "Sustained Attention to Response Task", size: 20, y: 240 },
      { text: "Press the space bar or tap the screen to read the instructions", size: 18, y: 640, color: PROMPT },
    ], () => this._go("instructions1"));
    this._buildTextScene("instructions1", [
      { text: "Instructions (page 1)", size: 26, y: 120 },
      {
        text: "In this experiment you will be presented with the digits 1 to 9 in the center of the screen.\n\nYour task is to press the SPACE BAR (or tap the screen) in response to each digit, except for when the digit is a '{N}'.\n\nEach digit is followed by a circle with a cross, which you can ignore.",
        size: 20, y: 400, wrap: 340,
      },
      { text: "Press the space bar or tap to read more…", size: 18, y: 700, color: PROMPT },
    ], () => this._go("instructions2"));
    this._buildTextScene("instructions2", [
      { text: "Instructions (page 2)", size: 26, y: 120 },
      {
        text: "For example, if you see the digit '1', press. If you see a '4', press. If you see a '{N}', DO NOT press. If you see a '7', press. And so on.\n\nPlease give equal importance to both the speed and accuracy of your responses.\n\nWhen you press correctly, the circle turns green.",
        size: 20, y: 400, wrap: 340,
      },
      { text: "Press the space bar or tap to start the training block", size: 18, y: 700, color: PROMPT },
    ], () => this._startBlock("training"));
    this._buildCountdownScene();
    this._buildTrialScene();
    this._buildTextScene("summary-training", this._summaryItems("training"), () => this._go("instruction-real"));
    if (tutorial) this._buildRealInstruction();
    this._buildTextScene("end", [
      { text: "WELL DONE", size: 40, y: 200 },
      { text: "You have completed the real test.", size: 22, y: 270, wrap: 340 },
    ], null, { autoEndMs: 3000 });
  }

  _buildRealInstruction() {
    this._buildTextScene("instruction-real", [
      { text: "Now you will start the real test block.", size: 24, y: 220, wrap: 340 },
      { text: "The same rules apply.\n\nPlease give equal importance to both the speed and accuracy of your responses.", size: 20, y: 400, wrap: 340 },
      { text: "Press the space bar or tap to start the real test block", size: 18, y: 700, color: PROMPT },
    ], () => this._startBlock("test"));
  }

  _emptyStats() {
    return { go: 0, goMistakes: 0, noGo: 0, noGoMistakes: 0 };
  }

  _summaryItems(block) {
    // Filled in at show time (see _go), these are placeholders
    return [
      { text: block === "training" ? "WELL DONE" : "", size: 36, y: 100, name: "sumTitle" },
      { text: "", size: 20, y: 400, wrap: 340, name: "sumBody" },
      { text: "Press the space bar or tap to continue", size: 18, y: 700, color: PROMPT },
    ];
  }

  // ---------- scene helpers ----------

  _go(sceneName) {
    this._onPress = null;
    this._lockUntil = Timer.now() + PRESS_LOCKOUT_MS;
    if (sceneName === "summary-training") this._fillSummary("training");
    this.presentScene(sceneName, Transition.none());
  }

  _fillSummary(block) {
    const s = this._results[block];
    const pct = (a, b) => (b > 0 ? Math.round((100 * a) / b) : 0);
    const scene = this._getScene("summary-training");
    const title = scene.children.find((c) => c.name === "sumTitle");
    const body = scene.children.find((c) => c.name === "sumBody");
    title.text = "WELL DONE";
    body.text =
      `You have completed the training block.\n\n` +
      `Results in training block:\n` +
      `Go trials: ${s.go}\nGo mistakes: ${s.goMistakes} (${pct(s.goMistakes, s.go)}%)\n` +
      `No-go trials: ${s.noGo}\nNo-go mistakes: ${s.noGoMistakes} (${pct(s.noGoMistakes, s.noGo)}%)`;
  }

  _buildTextScene(name, items, onAdvance, opts = {}) {
    const scene = new Scene({ name, backgroundColor: SCENE_BG });
    this.addScene(scene);
    const nogo = String(this.getParameter("no_go_digit"));
    for (const it of items) {
      scene.addChild(
        new Label({
          name: it.name,
          text: it.text.replace(/\{N\}/g, nogo),
          fontSize: it.size,
          fontColor: it.color ?? TEXT,
          position: { x: CENTER_X, y: it.y },
          preferredMaxLayoutWidth: it.wrap,
        }),
      );
    }
    scene.onAppear(() => {
      this._attachListeners();
      this._onPress = onAdvance;
      if (opts.autoEndMs) {
        scene.run(
          Action.sequence([
            Action.wait({ duration: opts.autoEndMs }),
            Action.custom({ callback: () => this.end() }),
          ]),
        );
      }
    });
  }

  _buildCountdownScene() {
    const scene = new Scene({ name: "countdown", backgroundColor: SCENE_BG });
    this.addScene(scene);
    const label = new Label({
      name: "countLabel",
      text: "3",
      fontSize: 90,
      fontColor: TEXT,
      position: { x: CENTER_X, y: CENTER_Y },
    });
    scene.addChild(label);
    scene.onAppear(() => {
      this._attachListeners();
      this._onPress = null;
      label.text = "3";
      scene.run(
        Action.sequence([
          Action.wait({ duration: 1000 }),
          Action.custom({ callback: () => { label.text = "2"; } }),
          Action.wait({ duration: 1000 }),
          Action.custom({ callback: () => { label.text = "1"; } }),
          Action.wait({ duration: 1000 }),
          Action.custom({ callback: () => { label.text = ""; } }),
          Action.wait({ duration: 1000 }),
          Action.custom({ callback: () => this.presentScene("trial", Transition.none()) }),
        ]),
      );
    });
  }

  _buildTrialScene() {
    const scene = new Scene({ name: "trial", backgroundColor: SCENE_BG });
    this.addScene(scene);

    const digit = new Label({
      name: "digit",
      text: "",
      fontSize: 100,
      fontColor: TEXT,
      position: { x: CENTER_X, y: CENTER_Y },
    });
    scene.addChild(digit);

    // Mask: circle with a cross, drawn natively
    const mask = new Shape({
      name: "mask",
      circleOfRadius: 56,
      fillColor: [0, 0, 0, 0],
      strokeColor: MASK_WHITE,
      lineWidth: 8,
      position: { x: CENTER_X, y: CENTER_Y },
      hidden: true,
    });
    scene.addChild(mask);
    const bars = [45, -45].map(
      (deg, i) =>
        new Shape({
          name: `maskBar${i}`,
          rect: { width: 8, height: 112 },
          fillColor: MASK_WHITE,
          position: { x: 0, y: 0 },
          zRotation: (deg * Math.PI) / 180,
        }),
    );
    bars.forEach((b) => mask.addChild(b));

    const mistakeTitle = new Label({
      name: "mistakeTitle",
      text: "MISTAKE",
      fontSize: 44,
      fontColor: RED,
      position: { x: CENTER_X, y: 280 },
      hidden: true,
    });
    const mistakeBody = new Label({
      name: "mistakeBody",
      text: "",
      fontSize: 22,
      fontColor: TEXT,
      position: { x: CENTER_X, y: 420 },
      preferredMaxLayoutWidth: 340,
      hidden: true,
    });
    scene.addChild(mistakeTitle);
    scene.addChild(mistakeBody);

    scene.onAppear(() => {
      this._attachListeners();
      this._onPress = () => this._handlePress();
      this._lockUntil = 0;
      if (!this._sessionStart) this._sessionStart = Timer.now();
      this._nextTrial();
    });
  }

  _setMaskColor(color) {
    const mask = this._getNode("mask");
    mask.strokeColor = color;
    mask.children.forEach((b) => { b.fillColor = color; });
  }

  // ---------- input ----------

  _attachListeners() {
    if (this._listenersAttached) return;
    const div = document.getElementById("m2c2kit-canvas-div");
    if (!div) return;
    this._listenersAttached = true;
    const fire = () => {
      if (Timer.now() < this._lockUntil || !this._onPress) return;
      this._onPress();
    };
    div.addEventListener("pointerdown", fire);
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (!e.repeat) fire();
      }
    });
  }

  // ---------- trial flow ----------

  _startBlock(block) {
    this._block = block;
    this._blockTrial = 0;
    const n = this.getParameter(block === "training" ? "training_trials" : "test_trials");
    this._blockDigits = this._makeDigits(n);
    this._go("countdown");
  }

  /** Balanced digits 1-9, shuffled so that no digit repeats back-to-back. */
  _makeDigits(n) {
    const pool = [];
    while (pool.length < n) for (let d = 1; d <= 9; d++) pool.push(d);
    pool.length = n === 0 ? 0 : Math.ceil(n / 9) * 9;
    for (let attempt = 0; attempt < 1000; attempt++) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      if (pool.every((d, i) => i === 0 || d !== pool[i - 1])) break;
    }
    return pool.slice(0, n);
  }

  _nextTrial() {
    if (this._blockTrial >= this._blockDigits.length) {
      this._endBlock();
      return;
    }
    const scene = this._getScene("trial");
    scene.removeAllActions();
    this._getNode("mistakeTitle").hidden = true;
    this._getNode("mistakeBody").hidden = true;

    const d = this._blockDigits[this._blockTrial];
    const level = 1 + Math.floor(Math.random() * DIGIT_FONT_SIZES.length);
    this._cur = {
      digit: d,
      level,
      fontPx: DIGIT_FONT_SIZES[level - 1],
      responded: false,
      rt: null,
      onset: Timer.now(),
    };
    const digitLabel = this._getNode("digit");
    digitLabel.fontSize = this._cur.fontPx;
    digitLabel.text = String(d);
    digitLabel.hidden = false;
    this._getNode("mask").hidden = true;
    this._setMaskColor(MASK_WHITE);
    this._trialActive = true;

    scene.run(
      Action.sequence([
        Action.wait({ duration: this.getParameter("digit_duration_ms") }),
        Action.custom({ callback: () => this._showMask() }),
        Action.wait({ duration: TRIAL_MS - this.getParameter("digit_duration_ms") }),
        Action.custom({ callback: () => this._finishTrial() }),
      ]),
      "trial-timer",
    );
  }

  _showMask() {
    this._getNode("digit").hidden = true;
    this._getNode("mask").hidden = false;
  }

  _handlePress() {
    if (!this._trialActive || this._cur.responded) return;
    this._cur.responded = true;
    this._cur.rt = Math.round(Timer.now() - this._cur.onset);
    // As in the original, a press ends the digit immediately and the mask
    // turns green; the trial still lasts the full interval.
    this._showMask();
    this._setMaskColor(MASK_GREEN);
  }

  _finishTrial() {
    this._trialActive = false;
    const c = this._cur;
    const noGo = this.getParameter("no_go_digit");
    const isGo = c.digit !== noGo;
    let errorType = null;
    if (!isGo && c.responded) errorType = "commission";
    if (isGo && !c.responded) errorType = "omission";
    const correct = errorType === null;

    const stats = this._results[this._block];
    if (isGo) {
      stats.go++;
      if (!correct) stats.goMistakes++;
    } else {
      stats.noGo++;
      if (!correct) stats.noGoMistakes++;
    }

    this.addTrialData("trial_index", this._trialIndex++);
    this.addTrialData("block", this._block);
    this.addTrialData("block_trial_index", this._blockTrial++);
    this.addTrialData("digit", c.digit);
    this.addTrialData("digit_size_level", c.level);
    this.addTrialData("digit_font_px", c.fontPx);
    this.addTrialData("is_go", isGo);
    this.addTrialData("responded", c.responded);
    this.addTrialData("rt_ms", c.rt);
    this.addTrialData("correct", correct);
    this.addTrialData("error_type", errorType);
    this.addTrialData("digit_onset_timestamp", c.onset);
    this.addTrialData("elapsed_test_time_ms", Math.round(Timer.now() - this._sessionStart));
    this.trialComplete();

    if (correct) {
      this._nextTrial();
      return;
    }
    this._showMistake(errorType, noGo);
  }

  _showMistake(errorType, noGo) {
    const scene = this._getScene("trial");
    this._getNode("mask").hidden = true;
    this._getNode("digit").hidden = true;
    this._getNode("mistakeTitle").hidden = false;
    const body = this._getNode("mistakeBody");
    body.text =
      errorType === "commission"
        ? `Do not press the space bar when you see a '${noGo}'!`
        : `Press the space bar when you see any digit, apart from '${noGo}'!`;
    body.hidden = false;
    scene.run(
      Action.sequence([
        Action.wait({ duration: this.getParameter("error_feedback_ms") }),
        Action.custom({
          callback: () => {
            this._getNode("mistakeTitle").hidden = true;
            body.hidden = true;
          },
        }),
        Action.wait({ duration: this.getParameter("post_error_blank_ms") }),
        Action.custom({ callback: () => this._nextTrial() }),
      ]),
      "mistake-timer",
    );
  }

  _endBlock() {
    this._onPress = null;
    if (this._block === "training") {
      this._go("summary-training");
    } else {
      this._go("end");
    }
  }

  _getNode(name) {
    const found = this.nodes.filter((n) => n.name === name);
    if (found.length === 0) throw new Error(`Node not found: ${name}`);
    return found[0];
  }

  _getScene(name) {
    return this.sceneManager.scenes.filter((s) => s.name === name)[0];
  }
}
