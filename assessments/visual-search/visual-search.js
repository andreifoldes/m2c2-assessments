import {
  Game,
  Action,
  Scene,
  Shape,
  Label,
  Timer,
  Transition,
} from "@m2c2kit/core";

// m2c2kit standard palette (light background)
const SCENE_BG = [255, 255, 255, 1];
const TEXT_PRIMARY = [0, 0, 0, 1];
const TEXT_SECONDARY = [100, 100, 100, 1];
const BUTTON_BG = [0, 0, 0, 1];
const BUTTON_TEXT = [255, 255, 255, 1];
const START_BUTTON_BG = [0, 128, 0, 1];
const GREEN = [46, 125, 50, 1];
const RED_FEEDBACK = [198, 40, 40, 1];

// Search-array colors
const COLORS = {
  black: [0, 0, 0, 1],
  red: [220, 30, 30, 1],
};

const GAME_WIDTH = 400;
const GAME_HEIGHT = 800;

// Search field: a 5x5 grid of cells centered on the screen.
const FIELD_CENTER = { x: 200, y: 400 };
const GRID_SIZE = 5;
const CELL_SPACING = 66;
const JITTER = 13;
const MIN_DISTANCE = 50;
const MAX_PLACEMENT_ATTEMPTS = 1000;
const LETTER_FONT_SIZE = 44;
// Half-width of the square within which a tap counts as hitting the target.
const TARGET_HIT_HALF = 28;
const ORIENTATIONS = [0, 90, 180, 270];
const MAX_SET_SIZE = GRID_SIZE * GRID_SIZE - 1;

// Conditions from the original PsychoPy design (conditions.xlsx). A distractor
// color of "red" means exactly one distractor is red and the rest are black.
const CONDITIONS = [
  { target_color: "red", distractor_color: "black", mixed_orientations: true, set_size: 10 },
  { target_color: "black", distractor_color: "black", mixed_orientations: true, set_size: 10 },
  { target_color: "red", distractor_color: "black", mixed_orientations: true, set_size: 20 },
  { target_color: "black", distractor_color: "black", mixed_orientations: true, set_size: 20 },
];

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomOrientation(mixed) {
  return mixed
    ? ORIENTATIONS[Math.floor(Math.random() * ORIENTATIONS.length)]
    : 0;
}

export class VisualSearch extends Game {
  constructor() {
    const defaultParameters = {
      number_of_trials: {
        default: 20,
        type: "integer",
        description:
          "Number of search trials. Conditions are drawn in equal proportion and shuffled.",
      },
      feedback_duration_ms: {
        default: 1000,
        type: "number",
        description: "Duration of the post-response feedback in ms",
      },
      iti_ms: {
        default: 500,
        type: "number",
        description: "Blank inter-trial interval in ms",
      },
      show_feedback: {
        default: true,
        type: "boolean",
        description: "Whether to show accuracy and speed feedback after each trial",
      },
      show_quit_button: {
        default: false,
        type: "boolean",
        description: "Whether to show a quit button",
      },
      show_tutorial: {
        default: true,
        type: "boolean",
        description: "Whether to show the instruction screen before the task",
      },
    };

    super({
      name: "Visual Search",
      id: "visual-search",
      publishUuid: "5f0d6c1e-3b7a-4c29-9a54-8e1f2d7b6a30",
      version: "1.0.0",
      shortDescription:
        "Classic visual search task: find and click the letter L among rotated Ts",
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      stretch: true,
      fonts: [
        {
          fontName: "roboto",
          url: "fonts/roboto/Roboto-Regular.ttf",
        },
      ],
      trialSchema: {
        trial_index: { type: "integer", description: "0-based trial index" },
        target_color: { type: "string", description: "Color of the target L (red or black)" },
        distractor_color: {
          type: "string",
          description:
            "Distractor color condition. 'red' means one distractor is red; 'black' means all are black.",
        },
        mixed_orientations: {
          type: "boolean",
          description: "Whether letters have random 0/90/180/270 degree orientations",
        },
        set_size: { type: "integer", description: "Number of distractor Ts" },
        target_x: { type: "number", description: "Target center x in game coordinates" },
        target_y: { type: "number", description: "Target center y in game coordinates" },
        target_orientation: { type: "integer", description: "Target orientation in degrees" },
        response_x: { type: "number", description: "Tap x in game coordinates" },
        response_y: { type: "number", description: "Tap y in game coordinates" },
        rt_ms: { type: "number", description: "Time from array onset to first tap in ms" },
        correct: { type: "boolean", description: "Whether the tap landed on the target" },
        stimulus_onset_timestamp: {
          type: "number",
          description: "performance.now() when the search array was shown",
        },
        response_timestamp: {
          type: "number",
          description: "performance.now() when the tap occurred",
        },
        elapsed_test_time_ms: {
          type: "number",
          description: "Time since the first array onset in ms",
        },
      },
      parameters: defaultParameters,
    });
  }

  async initialize() {
    await super.initialize();

    this._trialList = [];
    this._trialCursor = 0;
    this._testStartTime = 0;
    this._stimulusNodes = [];
    this._currentTrial = null;
    this._awaitingResponse = false;
    this._testEnded = false;

    if (this.getParameter("show_tutorial")) {
      this._buildInstructionsScene();
    }
    this._buildCountdownScene();
    this._buildTrialScene();
    this._buildEndScene();
  }

  /** Balanced, shuffled list of conditions with length number_of_trials. */
  _buildTrialList() {
    const n = this.getParameter("number_of_trials");
    const list = [];
    for (let i = 0; i < n; i++) {
      list.push(CONDITIONS[i % CONDITIONS.length]);
    }
    return shuffle(list);
  }

  _addQuitButton(scene) {
    if (!this.getParameter("show_quit_button")) return;
    const quit = new Label({
      text: "Quit",
      fontSize: 14,
      fontColor: TEXT_SECONDARY,
      position: { x: 360, y: 30 },
      isUserInteractionEnabled: true,
      zPosition: 50,
    });
    quit.onTapDown(() => {
      this._testEnded = true;
      this.end();
    });
    scene.addChild(quit);
  }

  _buildInstructionsScene() {
    const scene = new Scene({ name: "instructions", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Visual Search",
        fontSize: 32,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 150 },
      }),
    );
    scene.addChild(
      new Label({
        text:
          "You will see a field of letters.\n\n" +
          "Find the letter L\nand tap it as quickly\nas you can.\n\n" +
          "The other letters are Ts.\nLetters can be turned\nin any direction.\n\n" +
          "Some Ls will be red.",
        fontSize: 20,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 330 },
        horizontalAlignmentMode: 1,
        preferredMaxLayoutWidth: 340,
      }),
    );

    // Illustrations of the target and a distractor
    const ex = [
      { text: "L", x: 150, color: COLORS.red, rot: 90 },
      { text: "T", x: 250, color: COLORS.black, rot: 180 },
    ];
    for (const e of ex) {
      scene.addChild(
        new Label({
          text: e.text,
          fontSize: LETTER_FONT_SIZE,
          fontColor: e.color,
          position: { x: e.x, y: 540 },
          zRotation: (e.rot * Math.PI) / 180,
        }),
      );
    }

    const btnBg = new Shape({
      rect: { width: 240, height: 56 },
      cornerRadius: 12,
      fillColor: START_BUTTON_BG,
      position: { x: 200, y: 680 },
      isUserInteractionEnabled: true,
      name: "startButton",
    });
    btnBg.addChild(
      new Label({ text: "Start", fontSize: 24, fontColor: BUTTON_TEXT }),
    );
    scene.addChild(btnBg);
    btnBg.onTapDown(() => this.presentScene("countdown", Transition.none()));
    this._addQuitButton(scene);
  }

  _buildCountdownScene() {
    const scene = new Scene({ name: "countdown", backgroundColor: SCENE_BG });
    this.addScene(scene);

    const numberLabel = new Label({
      text: "3",
      fontSize: 96,
      fontColor: TEXT_PRIMARY,
      position: { x: 200, y: 380 },
    });
    scene.addChild(numberLabel);
    scene.addChild(
      new Label({
        text: "GET READY",
        fontSize: 32,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 470 },
      }),
    );

    const self = this;
    scene.onAppear(() => {
      numberLabel.text = "3";
      scene.run(
        Action.sequence([
          Action.wait({ duration: 1000 }),
          Action.custom({ callback: () => { numberLabel.text = "2"; } }),
          Action.wait({ duration: 1000 }),
          Action.custom({ callback: () => { numberLabel.text = "1"; } }),
          Action.wait({ duration: 1000 }),
          Action.custom({
            callback: () => self.presentScene("trial", Transition.none()),
          }),
        ]),
      );
    });
  }

  _buildTrialScene() {
    const scene = new Scene({ name: "trial", backgroundColor: SCENE_BG });
    this.addScene(scene);
    this._trialScene = scene;

    // Full-screen tap surface: any tap is a response, as in the original
    // mouse-click design.
    const surface = new Shape({
      rect: { width: GAME_WIDTH, height: GAME_HEIGHT },
      fillColor: SCENE_BG,
      position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
      isUserInteractionEnabled: true,
      zPosition: 0,
      name: "tapSurface",
    });
    scene.addChild(surface);

    this._feedbackLabel = new Label({
      text: "",
      fontSize: 22,
      fontColor: TEXT_PRIMARY,
      position: { x: 200, y: 130 },
      hidden: true,
      zPosition: 10,
    });
    scene.addChild(this._feedbackLabel);

    surface.onTapDown((e) => this._handleTap(e.point));
    this._addQuitButton(scene);

    scene.onAppear(() => {
      this._trialList = this._buildTrialList();
      this._trialCursor = 0;
      this._testStartTime = Timer.now();
      this._beginTrial();
    });
  }

  /** Candidate letter centers: shuffled grid cells, jittered, with a minimum gap. */
  _placeStimuli(count) {
    const cells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        cells.push({
          x: FIELD_CENTER.x + (i - (GRID_SIZE - 1) / 2) * CELL_SPACING,
          y: FIELD_CENTER.y + (j - (GRID_SIZE - 1) / 2) * CELL_SPACING,
        });
      }
    }
    const shuffled = shuffle(cells);
    const placed = [];
    for (let k = 0; k < count; k++) {
      const base = shuffled[k];
      let position = null;
      for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && !position; attempt++) {
        const candidate = {
          x: base.x + (Math.random() * 2 - 1) * JITTER,
          y: base.y + (Math.random() * 2 - 1) * JITTER,
        };
        const clear = placed.every(
          (p) => Math.hypot(candidate.x - p.x, candidate.y - p.y) >= MIN_DISTANCE,
        );
        if (clear) position = candidate;
      }
      // Unjittered grid centers are always CELL_SPACING apart, so this cannot fail
      placed.push(position ?? base);
    }
    return placed;
  }

  _clearStimuli() {
    for (const node of this._stimulusNodes) {
      this._trialScene.removeChild(node);
    }
    this._stimulusNodes = [];
  }

  _beginTrial() {
    if (this._testEnded) return;
    if (this._trialCursor >= this._trialList.length) {
      this._finish();
      return;
    }

    const condition = this._trialList[this._trialCursor];
    // Positions: index 0 is the target, the rest are distractors.
    const setSize = Math.min(condition.set_size, MAX_SET_SIZE);
    const positions = this._placeStimuli(setSize + 1);
    const redDistractor =
      condition.distractor_color === "red"
        ? Math.floor(Math.random() * setSize)
        : -1;

    this._clearStimuli();
    this._feedbackLabel.hidden = true;

    const targetOrientation = randomOrientation(condition.mixed_orientations);
    const letters = [
      {
        text: "L",
        pos: positions[0],
        color: COLORS[condition.target_color],
        ori: targetOrientation,
      },
    ];
    for (let d = 0; d < setSize; d++) {
      letters.push({
        text: "T",
        pos: positions[d + 1],
        color: d === redDistractor ? COLORS.red : COLORS[
          condition.distractor_color === "red" ? "black" : condition.distractor_color
        ],
        ori: randomOrientation(condition.mixed_orientations),
      });
    }

    for (const l of letters) {
      const node = new Label({
        text: l.text,
        fontSize: LETTER_FONT_SIZE,
        fontColor: l.color,
        position: l.pos,
        zRotation: (l.ori * Math.PI) / 180,
        zPosition: 5,
      });
      this._trialScene.addChild(node);
      this._stimulusNodes.push(node);
    }

    this._currentTrial = {
      condition,
      setSize,
      target: { x: positions[0].x, y: positions[0].y, ori: targetOrientation },
      onset: Timer.now(),
    };
    this._awaitingResponse = true;
  }

  _handleTap(point) {
    if (!this._awaitingResponse || this._testEnded) return;
    const now = Timer.now();
    this._awaitingResponse = false;

    const t = this._currentTrial;
    const correct =
      Math.abs(point.x - t.target.x) <= TARGET_HIT_HALF &&
      Math.abs(point.y - t.target.y) <= TARGET_HIT_HALF;
    const rt = now - t.onset;

    this.addTrialData("trial_index", this.trialIndex);
    this.addTrialData("target_color", t.condition.target_color);
    this.addTrialData("distractor_color", t.condition.distractor_color);
    this.addTrialData("mixed_orientations", t.condition.mixed_orientations);
    this.addTrialData("set_size", t.setSize);
    this.addTrialData("target_x", +t.target.x.toFixed(2));
    this.addTrialData("target_y", +t.target.y.toFixed(2));
    this.addTrialData("target_orientation", t.target.ori);
    this.addTrialData("response_x", +point.x.toFixed(2));
    this.addTrialData("response_y", +point.y.toFixed(2));
    this.addTrialData("rt_ms", Math.round(rt));
    this.addTrialData("correct", correct);
    this.addTrialData("stimulus_onset_timestamp", t.onset);
    this.addTrialData("response_timestamp", now);
    this.addTrialData("elapsed_test_time_ms", Math.round(now - this._testStartTime));
    this.trialComplete();
    this._trialCursor++;

    this._clearStimuli();
    const showFeedback = this.getParameter("show_feedback");
    if (showFeedback) {
      this._feedbackLabel.text = correct
        ? `Target found!\nSpeed: ${(rt / 1000).toFixed(3)} seconds`
        : `Oops, that wasn't the target.\nSpeed: ${(rt / 1000).toFixed(3)} seconds`;
      this._feedbackLabel.fontColor = correct ? GREEN : RED_FEEDBACK;
      this._feedbackLabel.hidden = false;
    }

    const feedbackMs = showFeedback ? this.getParameter("feedback_duration_ms") : 0;
    const itiMs = this.getParameter("iti_ms");
    const self = this;
    this._trialScene.run(
      Action.sequence([
        Action.wait({ duration: Math.max(feedbackMs, 1) }),
        Action.custom({ callback: () => { self._feedbackLabel.hidden = true; } }),
        Action.wait({ duration: Math.max(itiMs, 1) }),
        Action.custom({ callback: () => self._beginTrial() }),
      ]),
    );
  }

  _finish() {
    if (this._testEnded) return;
    this._testEnded = true;
    this.presentScene("end", Transition.none());
  }

  _buildEndScene() {
    const scene = new Scene({ name: "end", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "The end!",
        fontSize: 32,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 340 },
      }),
    );
    scene.addChild(
      new Label({
        text: "Thanks for taking part!",
        fontSize: 22,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 400 },
      }),
    );

    const doneBg = new Shape({
      rect: { width: 240, height: 56 },
      cornerRadius: 12,
      fillColor: BUTTON_BG,
      position: { x: 200, y: 520 },
      isUserInteractionEnabled: true,
      name: "doneButton",
    });
    doneBg.addChild(
      new Label({ text: "Done", fontSize: 24, fontColor: BUTTON_TEXT }),
    );
    scene.addChild(doneBg);
    doneBg.onTapDown(() => this.end());
  }
}
