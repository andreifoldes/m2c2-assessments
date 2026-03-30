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

import {
  getWordList,
  buildRecognitionSequence,
} from "./stimuli.js";

// m2c2kit standard palette
const SCENE_BG = [255, 255, 255, 1];
const TEXT_PRIMARY = [0, 0, 0, 1];
const TEXT_SECONDARY = [100, 100, 100, 1];
const TEXT_TERTIARY = [140, 140, 140, 1];
const BUTTON_BG = [0, 0, 0, 1];
const BUTTON_TEXT = [255, 255, 255, 1];
const START_BUTTON_BG = [0, 128, 0, 1];

// mVLT-specific colors (matching Moore et al. Figure 1 green cards)
const ACCENT = [56, 142, 60, 1];
const WORD_CARD_BG = [56, 142, 60, 1];
const WORD_CARD_TEXT = [255, 255, 255, 1];
const PROGRESS_BG = [220, 220, 230, 1];
const GREEN = [76, 175, 80, 1];
const RED = [211, 47, 47, 1];
const YES_BTN_BG = [232, 245, 233, 1];
const YES_BTN_BORDER = [76, 175, 80, 1];
const NO_BTN_BG = [253, 237, 237, 1];
const NO_BTN_BORDER = [211, 47, 47, 1];
const TRANSPARENT = [0, 0, 0, 0];

export class MVLT extends Game {
  constructor() {
    const defaultParameters = {
      word_list_index: {
        default: 0,
        type: "number",
        description: "Which of the 14 pre-built word lists to use (0-13, wraps via modulo)",
      },
      number_of_trials: {
        default: 3,
        type: "number",
        description: "Number of study-recognition cycles",
      },
      study_duration_ms: {
        default: 30000,
        type: "number",
        description: "How long the word list is displayed in the study phase (ms)",
      },
      number_of_distractors: {
        default: 12,
        type: "number",
        description: "Number of lure words in the recognition phase",
      },
      show_tutorial: {
        default: true,
        type: "boolean",
        description: "Show tutorial/instruction screens before the test",
      },
      show_feedback: {
        default: false,
        type: "boolean",
        description: "Show correct/incorrect feedback after each recognition response",
      },
      recognition_timeout_ms: {
        default: 0,
        type: "number",
        description: "Maximum time per recognition item in ms (0 = unlimited)",
      },
      inter_trial_delay_ms: {
        default: 3000,
        type: "number",
        description: "Pause duration between trials (ms)",
      },
      show_trials_complete_scene: {
        default: true,
        type: "boolean",
        description: "Show completion screen at end of all trials",
      },
    };

    super({
      name: "Verbal Learning Test",
      id: "mvlt",
      publishUuid: "a1b2c3d4-e5f6-7890-abcd-mvlt00000001",
      version: "1.0.0",
      shortDescription:
        "Mobile verbal learning and memory test with study-recognition paradigm",
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
        trial_number: {
          type: "integer",
          description: "Which study-recognition cycle (1-based)",
        },
        trial_index: {
          type: "integer",
          description: "Global 0-based counter across all recognition items",
        },
        item_index: {
          type: "integer",
          description: "Position within current recognition sequence (0-based)",
        },
        word: {
          type: "string",
          description: "The word shown in the recognition phase",
        },
        word_type: {
          type: "string",
          description: "target or distractor",
        },
        response: {
          type: "string",
          description: "yes, no, or none (timeout)",
        },
        is_correct: {
          type: "boolean",
          description: "Hit (target+yes) or correct rejection (distractor+no)",
        },
        response_time_ms: {
          type: "number",
          description: "Time from word display to response (ms)",
        },
        word_display_timestamp: {
          type: "number",
          description: "Timer.now() when the word appeared",
        },
        response_timestamp: {
          type: "number",
          description: "Timer.now() when participant responded",
        },
        study_display_timestamp: {
          type: "number",
          description: "Timer.now() when the study phase began for this trial",
        },
        list_index: {
          type: "integer",
          description: "Which word list was used",
        },
        timed_out: {
          type: "boolean",
          description: "Whether the response was a timeout",
        },
      },
      parameters: defaultParameters,
    });
  }

  async initialize() {
    await super.initialize();

    // Internal state
    this._currentTrial = 0;
    this._globalTrialIndex = 0;
    this._targets = [];
    this._distractors = [];
    this._recognitionSequence = [];
    this._recognitionIndex = 0;
    this._studyDisplayTimestamp = 0;
    this._currentRecogDisplayTime = 0;
    this._responded = false;
    this._studyShrinkTimer = null;
    this._countdownInterval = null;

    // Build scenes
    if (this.getParameter("show_tutorial")) {
      this._buildTutorialScenes();
    }
    this._buildInstructionsScene();
    this._buildStudyScene();
    this._buildRecognitionScene();
    this._buildInterTrialScene();
    this._buildEndScene();
  }

  // ─── Tutorial ──────────────────────────────────────────────

  _buildTutorialScenes() {
    // Screen 1: Welcome
    const s1 = new Scene({ name: "tut_1", backgroundColor: SCENE_BG });
    this.addScene(s1);

    s1.addChild(
      new Label({
        text: "Verbal Learning Test",
        fontSize: 32,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 160 },
      }),
    );

    s1.addChild(
      new Shape({
        rect: { width: 280, height: 3 },
        fillColor: ACCENT,
        position: { x: 200, y: 195 },
      }),
    );

    s1.addChild(
      new Label({
        text: "This test has two parts.\n\nFirst, you will see a list of words.\nTry to memorize as many as\nyou can.\n\nThen, you will see words one at\na time and decide if each word\nwas in the list.",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 380 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    const nextBtn1Bg = new Shape({
      rect: { width: 240, height: 54 },
      cornerRadius: 27,
      fillColor: BUTTON_BG,
      position: { x: 200, y: 640 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    s1.addChild(nextBtn1Bg);
    s1.addChild(
      new Label({
        text: "NEXT",
        fontSize: 20,
        fontColor: BUTTON_TEXT,
        position: { x: 200, y: 640 },
        zPosition: 11,
      }),
    );
    nextBtn1Bg.onTapDown(() =>
      this.presentScene("tut_2", Transition.none()),
    );

    this._addSkipTutorialButton(s1);

    // Screen 2: Study phase explanation
    const s2 = new Scene({ name: "tut_2", backgroundColor: SCENE_BG });
    this.addScene(s2);

    s2.addChild(
      new Label({
        text: "Part 1: Memorize",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 80 },
      }),
    );

    s2.addChild(
      new Label({
        text: "You will see 12 words for\n30 seconds. Try to remember\nas many as you can.",
        fontSize: 16,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 140 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    // Mock word list example
    const exampleWords = ["apple", "river", "chair"];
    for (let i = 0; i < exampleWords.length; i++) {
      const cardBg = new Shape({
        rect: { width: 260, height: 38 },
        cornerRadius: 8,
        fillColor: WORD_CARD_BG,
        position: { x: 200, y: 260 + i * 50 },
      });
      s2.addChild(cardBg);
      s2.addChild(
        new Label({
          text: exampleWords[i],
          fontSize: 20,
          fontColor: WORD_CARD_TEXT,
          position: { x: 200, y: 260 + i * 50 },
        }),
      );
    }

    // Hint
    s2.addChild(
      new Label({
        text: "...",
        fontSize: 22,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 420 },
      }),
    );

    const nextBtn2Bg = new Shape({
      rect: { width: 240, height: 54 },
      cornerRadius: 27,
      fillColor: BUTTON_BG,
      position: { x: 200, y: 640 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    s2.addChild(nextBtn2Bg);
    s2.addChild(
      new Label({
        text: "NEXT",
        fontSize: 20,
        fontColor: BUTTON_TEXT,
        position: { x: 200, y: 640 },
        zPosition: 11,
      }),
    );
    nextBtn2Bg.onTapDown(() =>
      this.presentScene("tut_3", Transition.none()),
    );

    this._addSkipTutorialButton(s2);

    // Screen 3: Recognition phase explanation
    const s3 = new Scene({ name: "tut_3", backgroundColor: SCENE_BG });
    this.addScene(s3);

    s3.addChild(
      new Label({
        text: "Part 2: Recognize",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 80 },
      }),
    );

    s3.addChild(
      new Label({
        text: "You will see words one at a time.\nFor each word, tap YES if it was\nin the list, or NO if it was not.",
        fontSize: 16,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 145 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    // Mock recognition example
    s3.addChild(
      new Label({
        text: "apple",
        fontSize: 34,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 290 },
      }),
    );

    s3.addChild(
      new Label({
        text: "Was this word in the list?",
        fontSize: 16,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 340 },
      }),
    );

    // Mock YES button
    const yesExBg = new Shape({
      rect: { width: 130, height: 50 },
      cornerRadius: 25,
      fillColor: YES_BTN_BG,
      strokeColor: YES_BTN_BORDER,
      lineWidth: 2,
      position: { x: 120, y: 410 },
    });
    s3.addChild(yesExBg);
    s3.addChild(
      new Label({
        text: "YES",
        fontSize: 20,
        fontColor: GREEN,
        position: { x: 120, y: 410 },
      }),
    );

    // Mock NO button
    const noExBg = new Shape({
      rect: { width: 130, height: 50 },
      cornerRadius: 25,
      fillColor: NO_BTN_BG,
      strokeColor: NO_BTN_BORDER,
      lineWidth: 2,
      position: { x: 280, y: 410 },
    });
    s3.addChild(noExBg);
    s3.addChild(
      new Label({
        text: "NO",
        fontSize: 20,
        fontColor: RED,
        position: { x: 280, y: 410 },
      }),
    );

    // Tooltip
    const tooltipBg = new Shape({
      rect: { width: 300, height: 50 },
      cornerRadius: 10,
      fillColor: ACCENT,
      position: { x: 200, y: 500 },
    });
    s3.addChild(tooltipBg);
    s3.addChild(
      new Label({
        text: "This repeats 3 times so you\ncan learn the words.",
        fontSize: 14,
        fontColor: [255, 255, 255, 1],
        position: { x: 200, y: 500 },
        preferredMaxLayoutWidth: 280,
      }),
    );

    const beginBtnBg = new Shape({
      rect: { width: 280, height: 56 },
      cornerRadius: 28,
      fillColor: START_BUTTON_BG,
      position: { x: 200, y: 640 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    s3.addChild(beginBtnBg);
    s3.addChild(
      new Label({
        text: "BEGIN TEST",
        fontSize: 20,
        fontColor: BUTTON_TEXT,
        position: { x: 200, y: 640 },
        zPosition: 11,
      }),
    );
    beginBtnBg.onTapDown(() => {
      this._startTest();
    });

    this._addSkipTutorialButton(s3);
  }

  _addSkipTutorialButton(scene) {
    const label = new Label({
      text: "Skip tutorial",
      fontSize: 14,
      fontColor: TEXT_TERTIARY,
      position: { x: 200, y: 760 },
      isUserInteractionEnabled: true,
      zPosition: 20,
    });
    scene.addChild(label);
    label.onTapDown(() =>
      this.presentScene("instructions", Transition.none()),
    );
  }

  // ─── Instructions ──────────────────────────────────────────

  _buildInstructionsScene() {
    const scene = new Scene({
      name: "instructions",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene);

    scene.addChild(
      new Shape({
        rect: { width: 400, height: 6 },
        fillColor: ACCENT,
        position: { x: 200, y: 3 },
      }),
    );

    scene.addChild(
      new Label({
        text: "Verbal Learning Test",
        fontSize: 34,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 160 },
      }),
    );

    scene.addChild(
      new Shape({
        rect: { width: 80, height: 3 },
        fillColor: ACCENT,
        position: { x: 200, y: 190 },
      }),
    );

    scene.addChild(
      new Label({
        text: "You will see a list of 12 words.\nMemorize as many as you can.\n\nThen, for each word shown,\ntap YES if it was in the list\nor NO if it was not.\n\nThis will repeat 3 times.",
        fontSize: 17,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 370 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    if (this.getParameter("show_tutorial")) {
      const tutLabel = new Label({
        text: "View Tutorial",
        fontSize: 16,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 560 },
        isUserInteractionEnabled: true,
        zPosition: 10,
      });
      scene.addChild(tutLabel);
      tutLabel.onTapDown(() =>
        this.presentScene("tut_1", Transition.none()),
      );
    }

    const startBtnBg = new Shape({
      rect: { width: 280, height: 56 },
      cornerRadius: 28,
      fillColor: START_BUTTON_BG,
      position: { x: 200, y: 660 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(startBtnBg);
    scene.addChild(
      new Label({
        text: "BEGIN TEST",
        fontSize: 20,
        fontColor: BUTTON_TEXT,
        position: { x: 200, y: 660 },
        zPosition: 11,
      }),
    );
    startBtnBg.onTapDown(() => {
      this._startTest();
    });
  }

  // ─── Study Scene ───────────────────────────────────────────

  _buildStudyScene() {
    const scene = new Scene({ name: "study", backgroundColor: SCENE_BG });
    this.addScene(scene);

    // Header
    scene.addChild(
      new Label({
        name: "studyHeader",
        text: "Memorize these words",
        fontSize: 20,
        fontColor: ACCENT,
        position: { x: 200, y: 40 },
      }),
    );

    // Trial indicator
    scene.addChild(
      new Label({
        name: "studyTrialLabel",
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 65 },
      }),
    );

    // Timer bar background
    scene.addChild(
      new Shape({
        name: "studyTimerBg",
        rect: { width: 320, height: 4 },
        cornerRadius: 2,
        fillColor: PROGRESS_BG,
        position: { x: 200, y: 88 },
      }),
    );

    // Timer bar fill (shrinks over time)
    scene.addChild(
      new Shape({
        name: "studyTimerFill",
        rect: { width: 320, height: 4 },
        cornerRadius: 2,
        fillColor: ACCENT,
        position: { x: 40, y: 88 },
        anchorPoint: { x: 0, y: 0.5 },
      }),
    );

    // Countdown label
    scene.addChild(
      new Label({
        name: "studyCountdown",
        text: "",
        fontSize: 13,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 108 },
      }),
    );

    // Word cards: 12 words in a single column
    // Starting at y=140, spacing 50px, ending at y=690
    for (let i = 0; i < 12; i++) {
      const yPos = 145 + i * 51;

      scene.addChild(
        new Shape({
          name: `studyCardBg_${i}`,
          rect: { width: 280, height: 40 },
          cornerRadius: 8,
          fillColor: WORD_CARD_BG,
          position: { x: 200, y: yPos },
        }),
      );

      scene.addChild(
        new Label({
          name: `studyWord_${i}`,
          text: "",
          fontSize: 20,
          fontColor: WORD_CARD_TEXT,
          position: { x: 200, y: yPos },
          zPosition: 1,
        }),
      );
    }

    // onAppear: populate words and start timer
    const self = this;
    scene.onAppear(() => {
      self._startStudyPhase();
    });
  }

  // ─── Recognition Scene ─────────────────────────────────────

  _buildRecognitionScene() {
    const scene = new Scene({ name: "recognition", backgroundColor: SCENE_BG });
    this.addScene(scene);

    // Progress bar background
    scene.addChild(
      new Shape({
        name: "recogProgressBg",
        rect: { width: 360, height: 4 },
        cornerRadius: 2,
        fillColor: PROGRESS_BG,
        position: { x: 200, y: 30 },
      }),
    );

    // Progress bar fill
    scene.addChild(
      new Shape({
        name: "recogProgressFill",
        rect: { width: 0, height: 4 },
        cornerRadius: 2,
        fillColor: ACCENT,
        position: { x: 20, y: 30 },
        anchorPoint: { x: 0, y: 0.5 },
      }),
    );

    // Item counter
    scene.addChild(
      new Label({
        name: "recogCounter",
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 55 },
      }),
    );

    // Trial indicator
    scene.addChild(
      new Label({
        name: "recogTrialLabel",
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 78 },
      }),
    );

    // The word, displayed large
    scene.addChild(
      new Label({
        name: "recogWord",
        text: "",
        fontSize: 40,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 300 },
      }),
    );

    // Prompt
    scene.addChild(
      new Label({
        name: "recogPrompt",
        text: "Was this word in the list?",
        fontSize: 17,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 370 },
      }),
    );

    // YES button
    const yesBtnBg = new Shape({
      name: "recogYesBtnBg",
      rect: { width: 140, height: 56 },
      cornerRadius: 28,
      fillColor: YES_BTN_BG,
      strokeColor: YES_BTN_BORDER,
      lineWidth: 2,
      position: { x: 120, y: 480 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(yesBtnBg);

    scene.addChild(
      new Label({
        name: "recogYesBtnLabel",
        text: "YES",
        fontSize: 22,
        fontColor: GREEN,
        position: { x: 120, y: 480 },
        zPosition: 11,
      }),
    );

    // NO button
    const noBtnBg = new Shape({
      name: "recogNoBtnBg",
      rect: { width: 140, height: 56 },
      cornerRadius: 28,
      fillColor: NO_BTN_BG,
      strokeColor: NO_BTN_BORDER,
      lineWidth: 2,
      position: { x: 280, y: 480 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(noBtnBg);

    scene.addChild(
      new Label({
        name: "recogNoBtnLabel",
        text: "NO",
        fontSize: 22,
        fontColor: RED,
        position: { x: 280, y: 480 },
        zPosition: 11,
      }),
    );

    // Feedback label (hidden by default)
    scene.addChild(
      new Label({
        name: "recogFeedback",
        text: "",
        fontSize: 18,
        fontColor: GREEN,
        position: { x: 200, y: 560 },
        hidden: true,
      }),
    );

    // Wire up button taps
    const self = this;
    yesBtnBg.onTapDown(() => self._handleResponse("yes"));
    noBtnBg.onTapDown(() => self._handleResponse("no"));

    scene.onAppear(() => {
      self._showRecognitionItem(0);
    });
  }

  // ─── Inter-Trial Scene ─────────────────────────────────────

  _buildInterTrialScene() {
    const scene = new Scene({ name: "inter_trial", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Label({
        name: "interTrialTitle",
        text: "",
        fontSize: 26,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 300 },
      }),
    );

    scene.addChild(
      new Label({
        name: "interTrialMsg",
        text: "Get ready to study the\nwords again.",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 380 },
        preferredMaxLayoutWidth: 300,
      }),
    );

    scene.addChild(
      new Label({
        name: "interTrialCountdown",
        text: "",
        fontSize: 16,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 450 },
      }),
    );

    const self = this;
    scene.onAppear(() => {
      scene.removeAllActions();

      const totalTrials = self.getParameter("number_of_trials");
      const title = self._getNode("interTrialTitle");
      title.text = `Trial ${self._currentTrial} of ${totalTrials} complete`;

      const delay = self.getParameter("inter_trial_delay_ms");
      const countdownLabel = self._getNode("interTrialCountdown");

      // Simple countdown
      let remaining = Math.ceil(delay / 1000);
      countdownLabel.text = `Next trial in ${remaining}...`;

      if (self._interTrialTickInterval) clearInterval(self._interTrialTickInterval);
      self._interTrialTickInterval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
          countdownLabel.text = `Next trial in ${remaining}...`;
        } else {
          clearInterval(self._interTrialTickInterval);
        }
      }, 1000);

      scene.run(
        Action.sequence([
          Action.wait({ duration: delay }),
          Action.custom({
            callback: () => {
              clearInterval(self._interTrialTickInterval);
              self._currentTrial++;
              self.presentScene("study", Transition.none());
            },
          }),
        ]),
      );
    });
  }

  // ─── End Scene ─────────────────────────────────────────────

  _buildEndScene() {
    const scene = new Scene({ name: "end", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Test Complete",
        fontSize: 30,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 340 },
      }),
    );

    scene.addChild(
      new Shape({
        rect: { width: 120, height: 3 },
        fillColor: ACCENT,
        position: { x: 200, y: 370 },
      }),
    );

    scene.addChild(
      new Label({
        text: "Thank you for participating.",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 420 },
      }),
    );

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

  // ─── Test Logic ────────────────────────────────────────────

  _startTest() {
    const listIndex = this.getParameter("word_list_index");
    const wordList = getWordList(listIndex);
    const numDistractors = this.getParameter("number_of_distractors");

    this._listIndex = listIndex % 14;
    this._targets = [...wordList.targets];
    this._distractors = wordList.distractors.slice(0, numDistractors);
    this._currentTrial = 1;
    this._globalTrialIndex = 0;

    this.presentScene("study", Transition.none());
  }

  // ─── Study Phase ───────────────────────────────────────────

  _startStudyPhase() {
    const totalTrials = this.getParameter("number_of_trials");
    const duration = this.getParameter("study_duration_ms");

    // Clear previous timers from prior trial
    if (this._countdownInterval) clearInterval(this._countdownInterval);
    if (this._studyShrinkTimer) clearInterval(this._studyShrinkTimer);

    // Update trial label
    const trialLabel = this._getNode("studyTrialLabel");
    trialLabel.text = `Trial ${this._currentTrial} of ${totalTrials}`;

    // Set word labels
    for (let i = 0; i < 12; i++) {
      const wordLabel = this._getNode(`studyWord_${i}`);
      wordLabel.text = i < this._targets.length ? this._targets[i] : "";
    }

    // Reset timer bar
    const timerFill = this._getNode("studyTimerFill");
    timerFill.size = { width: 320, height: 4 };

    // Update countdown text
    const countdownLabel = this._getNode("studyCountdown");
    let secondsLeft = Math.ceil(duration / 1000);
    countdownLabel.text = `${secondsLeft}s`;

    this._countdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        countdownLabel.text = `${secondsLeft}s`;
      } else {
        countdownLabel.text = "0s";
        clearInterval(this._countdownInterval);
      }
    }, 1000);

    this._studyDisplayTimestamp = Timer.now();

    // Animate timer bar shrinking
    const steps = 60;
    const stepDuration = duration / steps;
    let currentStep = 0;

    this._studyShrinkTimer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        clearInterval(this._studyShrinkTimer);
        return;
      }
      const fraction = 1 - currentStep / steps;
      timerFill.size = { width: Math.max(0, 320 * fraction), height: 4 };
    }, stepDuration);

    // Auto-advance to recognition after duration
    const self = this;
    const studyScene = this._getScene("study");
    studyScene.removeAllActions();

    studyScene.run(
      Action.sequence([
        Action.wait({ duration: duration }),
        Action.custom({
          callback: () => {
            clearInterval(self._studyShrinkTimer);
            clearInterval(self._countdownInterval);
            self._startRecognitionPhase();
          },
        }),
      ]),
      "study-timer",
    );
  }

  // ─── Recognition Phase ─────────────────────────────────────

  _startRecognitionPhase() {
    this._recognitionSequence = buildRecognitionSequence(
      this._targets,
      this._distractors,
    );
    this._recognitionIndex = 0;

    this.presentScene("recognition", Transition.none());
  }

  _showRecognitionItem(index) {
    const totalItems = this._recognitionSequence.length;
    if (index >= totalItems) {
      this._onTrialComplete();
      return;
    }

    this._recognitionIndex = index;
    this._responded = false;

    const item = this._recognitionSequence[index];
    const totalTrials = this.getParameter("number_of_trials");

    // Update progress bar
    const progressFill = this._getNode("recogProgressFill");
    progressFill.size = { width: 360 * ((index + 1) / totalItems), height: 4 };

    // Update counter
    const counter = this._getNode("recogCounter");
    counter.text = `Word ${index + 1} of ${totalItems}`;

    // Update trial label
    const trialLabel = this._getNode("recogTrialLabel");
    trialLabel.text = `Trial ${this._currentTrial} of ${totalTrials}`;

    // Update word
    const wordLabel = this._getNode("recogWord");
    wordLabel.text = item.word;

    // Reset buttons
    const yesBg = this._getNode("recogYesBtnBg");
    const noBg = this._getNode("recogNoBtnBg");
    yesBg.fillColor = YES_BTN_BG;
    noBg.fillColor = NO_BTN_BG;
    yesBg.isUserInteractionEnabled = true;
    noBg.isUserInteractionEnabled = true;

    // Reset feedback
    const feedback = this._getNode("recogFeedback");
    feedback.hidden = true;

    this._currentRecogDisplayTime = Timer.now();

    // Optional timeout
    const timeoutMs = this.getParameter("recognition_timeout_ms");
    if (timeoutMs > 0) {
      const self = this;
      const recogScene = this._getScene("recognition");
      recogScene.run(
        Action.sequence([
          Action.wait({ duration: timeoutMs }),
          Action.custom({
            callback: () => {
              if (!self._responded) {
                self._recordResponse("none", true);
              }
            },
          }),
        ]),
        "timeout-timer",
      );
    }
  }

  _handleResponse(response) {
    if (this._responded) return;
    this._responded = true;

    // Cancel timeout if active
    const recogScene = this._getScene("recognition");
    recogScene.removeAction("timeout-timer");

    this._recordResponse(response, false);
  }

  _recordResponse(response, timedOut) {
    const responseTime = Timer.now();
    const rt = timedOut ? -1 : responseTime - this._currentRecogDisplayTime;
    const index = this._recognitionIndex;
    const item = this._recognitionSequence[index];

    const isTarget = item.wordType === "target";
    const saidYes = response === "yes";
    const isCorrect = (isTarget && saidYes) || (!isTarget && !saidYes);

    // Disable buttons
    const yesBg = this._getNode("recogYesBtnBg");
    const noBg = this._getNode("recogNoBtnBg");
    yesBg.isUserInteractionEnabled = false;
    noBg.isUserInteractionEnabled = false;

    // Visual feedback
    const showFeedback = this.getParameter("show_feedback");
    if (!timedOut) {
      if (saidYes) {
        yesBg.fillColor = isCorrect ? [200, 240, 200, 1] : [240, 200, 200, 1];
      } else {
        noBg.fillColor = isCorrect ? [200, 240, 200, 1] : [240, 200, 200, 1];
      }
    }

    if (showFeedback) {
      const feedback = this._getNode("recogFeedback");
      feedback.hidden = false;
      if (timedOut) {
        feedback.text = "Time's up!";
        feedback.fontColor = RED;
      } else if (isCorrect) {
        feedback.text = "Correct";
        feedback.fontColor = GREEN;
      } else {
        feedback.text = "Incorrect";
        feedback.fontColor = RED;
      }
    }

    // Record trial data
    this.addTrialData("trial_number", this._currentTrial);
    this.addTrialData("trial_index", this._globalTrialIndex);
    this.addTrialData("item_index", index);
    this.addTrialData("word", item.word);
    this.addTrialData("word_type", item.wordType);
    this.addTrialData("response", response);
    this.addTrialData("is_correct", isCorrect);
    this.addTrialData("response_time_ms", timedOut ? -1 : Math.round(rt));
    this.addTrialData(
      "word_display_timestamp",
      Math.round(this._currentRecogDisplayTime),
    );
    this.addTrialData("response_timestamp", Math.round(responseTime));
    this.addTrialData(
      "study_display_timestamp",
      Math.round(this._studyDisplayTimestamp),
    );
    this.addTrialData("list_index", this._listIndex);
    this.addTrialData("timed_out", timedOut);
    this.trialComplete();

    this._globalTrialIndex++;

    // Advance after brief delay
    const self = this;
    const recogScene = this._getScene("recognition");
    recogScene.removeAction("advance-timer");
    recogScene.run(
      Action.sequence([
        Action.wait({ duration: 400 }),
        Action.custom({
          callback: () => {
            self._showRecognitionItem(self._recognitionIndex + 1);
          },
        }),
      ]),
      "advance-timer",
    );
  }

  // ─── Trial Completion ──────────────────────────────────────

  _onTrialComplete() {
    const totalTrials = this.getParameter("number_of_trials");
    if (this._currentTrial < totalTrials) {
      // More trials remain — show inter-trial screen
      this.presentScene("inter_trial", Transition.none());
    } else {
      // All trials done
      if (this.getParameter("show_trials_complete_scene")) {
        this.presentScene("end", Transition.none());
      } else {
        this.end();
      }
    }
  }

  // ─── Helpers ───────────────────────────────────────────────

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
