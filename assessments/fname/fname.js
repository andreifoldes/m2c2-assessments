import {
  Game,
  Action,
  Scene,
  Shape,
  Label,
  Timer,
  RandomDraws,
  Transition,
} from "@m2c2kit/core";

import {
  NAME_POOL,
  OCCUPATION_POOL,
  shuffleArray,
  generateTriplets,
  pickDistractors,
} from "./stimuli.js";

// m2c2kit standard palette
const SCENE_BG = [255, 255, 255, 1];
const TEXT_PRIMARY = [0, 0, 0, 1];
const TEXT_SECONDARY = [100, 100, 100, 1];
const TEXT_TERTIARY = [140, 140, 140, 1];
const CARD_BG = [240, 240, 245, 1];
const PROGRESS_BG = [220, 220, 230, 1];
const PROGRESS_FILL = [63, 81, 181, 1];
const GREEN = [76, 175, 80, 1];
const RED = [211, 47, 47, 1];
const BUTTON_DEFAULT = [220, 220, 225, 1];
const OPTION_BG = [245, 245, 250, 1];
const OPTION_BORDER = [200, 200, 210, 1];
const OPTION_SELECTED = [63, 81, 181, 1];
const TRANSPARENT = [0, 0, 0, 0];

export class FaceNameOccupation extends Game {
  constructor() {
    const defaultParameters = {
      number_of_pairs: {
        default: 6,
        type: "number",
        description: "Number of face-name-occupation triplets to learn",
      },
      number_of_distractors: {
        default: 2,
        type: "number",
        description: "Number of wrong options in inference/recognition phases",
      },
      learning_duration_ms: {
        default: 5000,
        type: "number",
        description: "Display duration per item in learning phase (ms)",
      },
      delay_seconds: {
        default: 10,
        type: "number",
        description: "Countdown delay between inference and recognition (s)",
      },
      show_tutorial: {
        default: true,
        type: "boolean",
        description: "Show instruction screens before each phase",
      },
      face_image_pool: {
        default: "[]",
        type: "string",
        description:
          "JSON array of {id, dataUrl} objects for face images " +
          "(set by index.js after pre-fetch)",
      },
      show_trials_complete_scene: {
        default: true,
        type: "boolean",
        description: "Show completion screen at end",
      },
    };

    super({
      name: "Face-Name-Occupation",
      id: "fname",
      publishUuid: "f4a3c2e1-b5d6-7890-abcd-ef1234567890",
      version: "1.0.0",
      shortDescription:
        "Associative memory: learn face-name-occupation pairs, infer, recognize",
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
        phase: {
          type: "string",
          description:
            "learn_name | learn_occupation | inference | recognition",
        },
        trial_index: {
          type: "integer",
          description: "Global trial counter (0-based)",
        },
        pair_index: {
          type: "integer",
          description: "Which triplet (0..number_of_pairs-1)",
        },
        face_id: {
          type: "string",
          description: "Identifier for face image used",
        },
        correct_answer: {
          type: "string",
          description: "Expected response",
        },
        user_response: {
          type: "string",
          description: "What participant chose",
        },
        is_correct: {
          type: "boolean",
          description: "Whether response matched correct answer",
        },
        response_time_ms: {
          type: "number",
          description: "Time from stimulus onset to response (ms)",
        },
        distractor_options: {
          type: "string",
          description: "JSON array of all options shown",
        },
        stimulus_type: {
          type: "string",
          description:
            "face_name | face_occupation | name_to_occupation",
        },
      },
      parameters: defaultParameters,
    });

    // Internal state
    this._triplets = [];
    this._globalTrialIndex = 0;
    this._inferenceCorrect = 0;
    this._inferenceTotal = 0;
    this._recognitionCorrect = 0;
    this._recognitionTotal = 0;
    this._responded = false;
    this._faceImgEl = null;
    this._delayClock = null;

    // Build all scenes
    this._buildLearnNameInstructions();
    this._buildLearnScene("learn-name");
    this._buildLearnOccupationInstructions();
    this._buildLearnScene("learn-occupation");
    this._buildInferenceInstructions();
    this._buildInferenceScene();
    this._buildDelayScene();
    this._buildRecognitionInstructions();
    this._buildRecognitionScene();
    this._buildCompleteScene();
  }

  // ═══════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════

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

  // ── Face image overlay ────────────────────────────────────
  // m2c2kit images must be declared at construction time.
  // Since face images are fetched dynamically, we overlay an
  // HTML <img> on top of the canvas, positioned to match the
  // 400×800 coordinate system.

  _ensureFaceOverlay() {
    if (this._faceImgEl) return;
    const container = document.getElementById("m2c2kit");
    if (!container) return;

    const img = document.createElement("img");
    img.id = "fname-face-overlay";
    img.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 150px; height: 180px;
      object-fit: cover;
      border-radius: 12px;
      border: 3px solid #333;
      pointer-events: none;
      display: none;
      z-index: 100;
    `;
    container.style.position = "relative";
    container.appendChild(img);
    this._faceImgEl = img;
  }

  _showFace(dataUrl, logicalX, logicalY) {
    this._ensureFaceOverlay();
    if (!this._faceImgEl) return;

    const canvas = document.querySelector("#m2c2kit canvas");
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / 400;
    const scaleY = canvasRect.height / 800;

    const imgW = 150 * scaleX;
    const imgH = 180 * scaleY;
    const px = logicalX * scaleX - imgW / 2;
    const py = logicalY * scaleY - imgH / 2;

    this._faceImgEl.src = dataUrl;
    this._faceImgEl.style.width = `${imgW}px`;
    this._faceImgEl.style.height = `${imgH}px`;
    this._faceImgEl.style.left = `${canvasRect.left - canvas.parentElement.getBoundingClientRect().left + px}px`;
    this._faceImgEl.style.top = `${canvasRect.top - canvas.parentElement.getBoundingClientRect().top + py}px`;
    this._faceImgEl.style.display = "block";
  }

  _hideFace() {
    if (this._faceImgEl) {
      this._faceImgEl.style.display = "none";
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Session start: generate triplets from face pool
  // ═══════════════════════════════════════════════════════════

  _initSession() {
    const poolJson = this.getParameter("face_image_pool");
    let facePool;
    try {
      facePool = typeof poolJson === "string" ? JSON.parse(poolJson) : poolJson;
    } catch (_) {
      facePool = [];
    }

    const numPairs = this.getParameter("number_of_pairs");
    let numDistractors = this.getParameter("number_of_distractors");
    if (numDistractors >= numPairs) {
      numDistractors = numPairs - 1;
      console.warn(
        `[FNAME] number_of_distractors clamped to ${numDistractors}`,
      );
    }

    this._triplets = generateTriplets(facePool, numPairs);
    this._globalTrialIndex = 0;
    this._inferenceCorrect = 0;
    this._inferenceTotal = 0;
    this._recognitionCorrect = 0;
    this._recognitionTotal = 0;
  }

  // ═══════════════════════════════════════════════════════════
  // Phase 1 & 2: Learning instructions
  // ═══════════════════════════════════════════════════════════

  _buildLearnNameInstructions() {
    const scene = new Scene({
      name: "learn-name-instructions",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Part 1: Learn Names",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 240 },
      }),
    );
    scene.addChild(
      new Label({
        text: "You will see faces with names.\nTry to remember which name\ngoes with each face.",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 340 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    const btnBg = new Shape({
      name: "learnNameStartBtn",
      rect: { width: 160, height: 50 },
      cornerRadius: 25,
      fillColor: GREEN,
      position: { x: 200, y: 500 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(btnBg);
    scene.addChild(
      new Label({
        text: "Begin",
        fontSize: 20,
        fontColor: [255, 255, 255, 1],
        position: { x: 200, y: 500 },
        zPosition: 11,
      }),
    );

    const self = this;
    btnBg.onTapDown(() => {
      self.presentScene("learn-name", Transition.none());
    });

    scene.onAppear(() => {
      self._initSession();
      self._hideFace();
    });
  }

  _buildLearnOccupationInstructions() {
    const scene = new Scene({
      name: "learn-occupation-instructions",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Part 2: Learn Occupations",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 240 },
      }),
    );
    scene.addChild(
      new Label({
        text: "Now you will see the same faces\nwith their occupations.\nTry to remember each pairing.",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 340 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    const btnBg = new Shape({
      name: "learnOccStartBtn",
      rect: { width: 160, height: 50 },
      cornerRadius: 25,
      fillColor: GREEN,
      position: { x: 200, y: 500 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(btnBg);
    scene.addChild(
      new Label({
        text: "Continue",
        fontSize: 20,
        fontColor: [255, 255, 255, 1],
        position: { x: 200, y: 500 },
        zPosition: 11,
      }),
    );

    const self = this;
    btnBg.onTapDown(() => {
      self.presentScene("learn-occupation", Transition.none());
    });

    scene.onAppear(() => {
      self._hideFace();
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Learning scene (shared for name and occupation)
  // ═══════════════════════════════════════════════════════════

  _buildLearnScene(sceneName) {
    const scene = new Scene({ name: sceneName, backgroundColor: SCENE_BG });
    this.addScene(scene);

    const prefix = sceneName === "learn-name" ? "ln" : "lo";

    // Progress bar
    scene.addChild(
      new Shape({
        name: `${prefix}ProgressBg`,
        rect: { width: 360, height: 6 },
        cornerRadius: 3,
        fillColor: PROGRESS_BG,
        position: { x: 200, y: 30 },
      }),
    );
    scene.addChild(
      new Shape({
        name: `${prefix}ProgressFill`,
        rect: { width: 0, height: 6 },
        cornerRadius: 3,
        fillColor: PROGRESS_FILL,
        position: { x: 20, y: 30 },
        anchorPoint: { x: 0, y: 0.5 },
      }),
    );

    scene.addChild(
      new Label({
        name: `${prefix}PhaseLabel`,
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 55 },
      }),
    );

    // Card background
    scene.addChild(
      new Shape({
        name: `${prefix}Card`,
        rect: { width: 320, height: 400 },
        cornerRadius: 20,
        fillColor: CARD_BG,
        position: { x: 200, y: 330 },
      }),
    );

    // Face placeholder (visual frame — actual image is DOM overlay)
    scene.addChild(
      new Shape({
        name: `${prefix}FaceFrame`,
        rect: { width: 156, height: 186 },
        cornerRadius: 14,
        fillColor: [200, 200, 210, 1],
        position: { x: 200, y: 250 },
      }),
    );

    // Association label (name or occupation)
    scene.addChild(
      new Label({
        name: `${prefix}AssocLabel`,
        text: "",
        fontSize: 32,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 400 },
        preferredMaxLayoutWidth: 280,
      }),
    );

    // Subtitle
    scene.addChild(
      new Label({
        name: `${prefix}Subtitle`,
        text: "Try to remember this pair.",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 450 },
      }),
    );

    // Timer bar
    scene.addChild(
      new Shape({
        name: `${prefix}TimerBar`,
        rect: { width: 320, height: 3 },
        cornerRadius: 1,
        fillColor: PROGRESS_FILL,
        position: { x: 200, y: 540 },
      }),
    );

    // Tap-to-advance (invisible full-screen button)
    const tapArea = new Shape({
      name: `${prefix}TapArea`,
      rect: { width: 400, height: 800 },
      fillColor: TRANSPARENT,
      position: { x: 200, y: 400 },
      isUserInteractionEnabled: true,
      zPosition: 1,
    });
    scene.addChild(tapArea);

    const self = this;
    const isName = sceneName === "learn-name";

    tapArea.onTapDown(() => {
      self._advanceLearning(isName);
    });

    scene.onAppear(() => {
      self._currentLearnIndex = 0;
      self._showLearningItem(isName, 0);
    });
  }

  _showLearningItem(isName, index) {
    const numPairs = this._triplets.length;
    const prefix = isName ? "ln" : "lo";

    if (index >= numPairs) {
      this._hideFace();
      if (isName) {
        const showTutorial = this.getParameter("show_tutorial");
        this.presentScene(
          showTutorial ? "learn-occupation-instructions" : "learn-occupation",
          Transition.none(),
        );
      } else {
        const showTutorial = this.getParameter("show_tutorial");
        this.presentScene(
          showTutorial ? "inference-instructions" : "inference",
          Transition.none(),
        );
      }
      return;
    }

    this._currentLearnIndex = index;
    const triplet = this._triplets[index];
    const progressFraction = (index + 1) / numPairs;

    const progressFill = this._getNode(`${prefix}ProgressFill`);
    progressFill.size = { width: 360 * progressFraction, height: 6 };

    const phaseLabel = this._getNode(`${prefix}PhaseLabel`);
    phaseLabel.text = `${index + 1} of ${numPairs}`;

    const assocLabel = this._getNode(`${prefix}AssocLabel`);
    assocLabel.text = isName ? triplet.name : triplet.occupation;

    // Show face image via DOM overlay
    this._showFace(triplet.faceDataUrl, 200, 250);

    // Reset timer bar
    const timerBar = this._getNode(`${prefix}TimerBar`);
    timerBar.size = { width: 320, height: 3 };

    // Auto-advance timer
    const self = this;
    const duration = this.getParameter("learning_duration_ms");
    const scene = this._getScene(isName ? "learn-name" : "learn-occupation");
    scene.removeAllActions();

    scene.run(
      Action.sequence([
        Action.wait({ duration: duration }),
        Action.custom({
          callback: () => {
            self._showLearningItem(isName, index + 1);
          },
        }),
      ]),
      "learn-timer",
    );

    // Animate timer bar shrinking
    if (this._learnShrinkTimer) clearInterval(this._learnShrinkTimer);
    const steps = 60;
    const stepDuration = duration / steps;
    let currentStep = 0;
    this._learnShrinkTimer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        clearInterval(self._learnShrinkTimer);
        return;
      }
      const fraction = 1 - currentStep / steps;
      timerBar.size = { width: Math.max(0, 320 * fraction), height: 3 };
    }, stepDuration);
  }

  _advanceLearning(isName) {
    const prefix = isName ? "ln" : "lo";
    const scene = this._getScene(isName ? "learn-name" : "learn-occupation");
    scene.removeAllActions();
    if (this._learnShrinkTimer) clearInterval(this._learnShrinkTimer);
    this._showLearningItem(isName, this._currentLearnIndex + 1);
  }

  // ═══════════════════════════════════════════════════════════
  // Phase 3: Associative Inference
  // ═══════════════════════════════════════════════════════════

  _buildInferenceInstructions() {
    const scene = new Scene({
      name: "inference-instructions",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Part 3: Match Names\nto Occupations",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 240 },
        preferredMaxLayoutWidth: 340,
      }),
    );
    scene.addChild(
      new Label({
        text: "Without seeing the faces, match\neach person's name with their\ncorrect occupation.",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 360 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    const btnBg = new Shape({
      rect: { width: 160, height: 50 },
      cornerRadius: 25,
      fillColor: GREEN,
      position: { x: 200, y: 500 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(btnBg);
    scene.addChild(
      new Label({
        text: "Continue",
        fontSize: 20,
        fontColor: [255, 255, 255, 1],
        position: { x: 200, y: 500 },
        zPosition: 11,
      }),
    );

    const self = this;
    btnBg.onTapDown(() => {
      self.presentScene("inference", Transition.none());
    });

    scene.onAppear(() => {
      self._hideFace();
    });
  }

  _buildInferenceScene() {
    const scene = new Scene({
      name: "inference",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene);

    // Progress bar
    scene.addChild(
      new Shape({
        name: "infProgressBg",
        rect: { width: 360, height: 6 },
        cornerRadius: 3,
        fillColor: PROGRESS_BG,
        position: { x: 200, y: 30 },
      }),
    );
    scene.addChild(
      new Shape({
        name: "infProgressFill",
        rect: { width: 0, height: 6 },
        cornerRadius: 3,
        fillColor: PROGRESS_FILL,
        position: { x: 20, y: 30 },
        anchorPoint: { x: 0, y: 0.5 },
      }),
    );

    scene.addChild(
      new Label({
        name: "infPhaseLabel",
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 55 },
      }),
    );

    // Prompt: "[Name]'s job is:"
    scene.addChild(
      new Label({
        name: "infPrompt",
        text: "",
        fontSize: 26,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 160 },
        preferredMaxLayoutWidth: 340,
      }),
    );

    // Option buttons (max 4 options = 1 correct + 3 distractors)
    const maxOptions = 4;
    for (let i = 0; i < maxOptions; i++) {
      const yPos = 280 + i * 80;

      const optBg = new Shape({
        name: `infOpt${i}Bg`,
        rect: { width: 300, height: 56 },
        cornerRadius: 12,
        fillColor: OPTION_BG,
        strokeColor: OPTION_BORDER,
        lineWidth: 2,
        position: { x: 200, y: yPos },
        isUserInteractionEnabled: true,
        zPosition: 10,
      });
      scene.addChild(optBg);

      scene.addChild(
        new Label({
          name: `infOpt${i}Label`,
          text: "",
          fontSize: 20,
          fontColor: TEXT_PRIMARY,
          position: { x: 200, y: yPos },
          zPosition: 11,
        }),
      );

      const self = this;
      optBg.onTapDown(() => {
        self._handleInferenceResponse(i);
      });
    }

    scene.onAppear(() => {
      this._hideFace();
      this._currentInferenceIndex = 0;
      this._inferenceOrder = shuffleArray(
        this._triplets.map((_, i) => i),
      );
      this._showInferenceTrial(0);
    });
  }

  _showInferenceTrial(index) {
    const numPairs = this._triplets.length;
    if (index >= numPairs) {
      const delaySeconds = this.getParameter("delay_seconds");
      if (delaySeconds > 0) {
        this.presentScene("delay", Transition.none());
      } else {
        const showTutorial = this.getParameter("show_tutorial");
        this.presentScene(
          showTutorial ? "recognition-instructions" : "recognition",
          Transition.none(),
        );
      }
      return;
    }

    this._currentInferenceIndex = index;
    this._responded = false;

    const pairIdx = this._inferenceOrder[index];
    const triplet = this._triplets[pairIdx];
    const numDistractors = Math.min(
      this.getParameter("number_of_distractors"),
      numPairs - 1,
    );

    const allOccupations = this._triplets.map((t) => t.occupation);
    const distractors = pickDistractors(
      triplet.occupation,
      allOccupations,
      numDistractors,
    );
    const options = shuffleArray([triplet.occupation, ...distractors]);

    this._currentInferenceOptions = options;
    this._currentInferenceCorrect = triplet.occupation;
    this._currentInferencePairIdx = pairIdx;

    // Update UI
    const progressFraction = (index + 1) / numPairs;
    this._getNode("infProgressFill").size = {
      width: 360 * progressFraction,
      height: 6,
    };
    this._getNode("infPhaseLabel").text = `${index + 1} of ${numPairs}`;
    this._getNode("infPrompt").text = `${triplet.name}'s job is:`;

    // Show/hide option buttons
    const maxOptions = 4;
    for (let i = 0; i < maxOptions; i++) {
      const bg = this._getNode(`infOpt${i}Bg`);
      const lbl = this._getNode(`infOpt${i}Label`);
      if (i < options.length) {
        bg.hidden = false;
        lbl.hidden = false;
        lbl.text = options[i].toUpperCase();
        bg.fillColor = OPTION_BG;
        bg.strokeColor = OPTION_BORDER;
        bg.isUserInteractionEnabled = true;
      } else {
        bg.hidden = true;
        lbl.hidden = true;
      }
    }

    this._inferenceOnsetTime = Timer.now();
  }

  _handleInferenceResponse(optionIndex) {
    if (this._responded) return;
    this._responded = true;

    const options = this._currentInferenceOptions;
    if (optionIndex >= options.length) return;

    const chosen = options[optionIndex];
    const correct = this._currentInferenceCorrect;
    const isCorrect = chosen === correct;
    const rt = Timer.now() - this._inferenceOnsetTime;

    // Visual feedback
    const bg = this._getNode(`infOpt${optionIndex}Bg`);
    bg.fillColor = isCorrect ? GREEN : RED;
    bg.strokeColor = isCorrect ? GREEN : RED;

    // Highlight correct if wrong
    if (!isCorrect) {
      for (let i = 0; i < options.length; i++) {
        if (options[i] === correct) {
          this._getNode(`infOpt${i}Bg`).fillColor = GREEN;
          this._getNode(`infOpt${i}Bg`).strokeColor = GREEN;
        }
      }
    }

    // Disable all buttons
    for (let i = 0; i < 4; i++) {
      const b = this._getNode(`infOpt${i}Bg`);
      b.isUserInteractionEnabled = false;
    }

    if (isCorrect) this._inferenceCorrect++;
    this._inferenceTotal++;

    // Record trial data
    const pairIdx = this._currentInferencePairIdx;
    this.addTrialData("phase", "inference");
    this.addTrialData("trial_index", this._globalTrialIndex);
    this.addTrialData("pair_index", pairIdx);
    this.addTrialData("face_id", this._triplets[pairIdx].faceId);
    this.addTrialData("correct_answer", correct);
    this.addTrialData("user_response", chosen);
    this.addTrialData("is_correct", isCorrect);
    this.addTrialData("response_time_ms", Math.round(rt));
    this.addTrialData(
      "distractor_options",
      JSON.stringify(options),
    );
    this.addTrialData("stimulus_type", "name_to_occupation");
    this.trialComplete();
    this._globalTrialIndex++;

    // Advance after brief delay
    const self = this;
    const scene = this._getScene("inference");
    scene.run(
      Action.sequence([
        Action.wait({ duration: 800 }),
        Action.custom({
          callback: () => {
            self._showInferenceTrial(self._currentInferenceIndex + 1);
          },
        }),
      ]),
      "inf-advance",
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Delay Phase
  // ═══════════════════════════════════════════════════════════

  _buildDelayScene() {
    const scene = new Scene({ name: "delay", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Please wait...",
        fontSize: 22,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 300 },
      }),
    );
    scene.addChild(
      new Label({
        name: "delayTimer",
        text: "",
        fontSize: 56,
        fontColor: PROGRESS_FILL,
        position: { x: 200, y: 400 },
      }),
    );
    scene.addChild(
      new Label({
        text: "The next part will begin automatically.",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 500 },
      }),
    );

    const self = this;
    scene.onAppear(() => {
      self._hideFace();
      let remaining = self.getParameter("delay_seconds");
      const timerLabel = self._getNode("delayTimer");

      const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, "0")}`;
      };

      timerLabel.text = formatTime(remaining);

      self._delayClock = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(self._delayClock);
          self._delayClock = null;
          const showTutorial = self.getParameter("show_tutorial");
          self.presentScene(
            showTutorial ? "recognition-instructions" : "recognition",
            Transition.none(),
          );
          return;
        }
        timerLabel.text = formatTime(remaining);
      }, 1000);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Phase 4: Recognition
  // ═══════════════════════════════════════════════════════════

  _buildRecognitionInstructions() {
    const scene = new Scene({
      name: "recognition-instructions",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Part 4: Recognition",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 240 },
      }),
    );
    scene.addChild(
      new Label({
        text: "You will see faces paired with a\nname or occupation. Decide if\nthe pairing is correct.",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 360 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    const btnBg = new Shape({
      rect: { width: 160, height: 50 },
      cornerRadius: 25,
      fillColor: GREEN,
      position: { x: 200, y: 500 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(btnBg);
    scene.addChild(
      new Label({
        text: "Continue",
        fontSize: 20,
        fontColor: [255, 255, 255, 1],
        position: { x: 200, y: 500 },
        zPosition: 11,
      }),
    );

    const self = this;
    btnBg.onTapDown(() => {
      self.presentScene("recognition", Transition.none());
    });

    scene.onAppear(() => {
      self._hideFace();
    });
  }

  _buildRecognitionScene() {
    const scene = new Scene({
      name: "recognition",
      backgroundColor: SCENE_BG,
    });
    this.addScene(scene);

    // Progress bar
    scene.addChild(
      new Shape({
        name: "recProgressBg",
        rect: { width: 360, height: 6 },
        cornerRadius: 3,
        fillColor: PROGRESS_BG,
        position: { x: 200, y: 30 },
      }),
    );
    scene.addChild(
      new Shape({
        name: "recProgressFill",
        rect: { width: 0, height: 6 },
        cornerRadius: 3,
        fillColor: PROGRESS_FILL,
        position: { x: 20, y: 30 },
        anchorPoint: { x: 0, y: 0.5 },
      }),
    );

    scene.addChild(
      new Label({
        name: "recPhaseLabel",
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 55 },
      }),
    );

    // Prompt
    scene.addChild(
      new Label({
        name: "recPrompt",
        text: "Is this the correct pair?",
        fontSize: 20,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 100 },
      }),
    );

    // Face frame placeholder
    scene.addChild(
      new Shape({
        name: "recFaceFrame",
        rect: { width: 156, height: 186 },
        cornerRadius: 14,
        fillColor: [200, 200, 210, 1],
        position: { x: 200, y: 260 },
      }),
    );

    // Association label
    scene.addChild(
      new Label({
        name: "recAssocLabel",
        text: "",
        fontSize: 30,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 410 },
        preferredMaxLayoutWidth: 320,
      }),
    );

    // Stimulus type label
    scene.addChild(
      new Label({
        name: "recTypeLabel",
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 450 },
      }),
    );

    // YES button
    const yesBg = new Shape({
      name: "recYesBg",
      rect: { width: 140, height: 56 },
      cornerRadius: 12,
      fillColor: GREEN,
      position: { x: 120, y: 550 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(yesBg);
    scene.addChild(
      new Label({
        name: "recYesLabel",
        text: "YES",
        fontSize: 22,
        fontColor: [255, 255, 255, 1],
        position: { x: 120, y: 550 },
        zPosition: 11,
      }),
    );

    // NO button
    const noBg = new Shape({
      name: "recNoBg",
      rect: { width: 140, height: 56 },
      cornerRadius: 12,
      fillColor: RED,
      position: { x: 280, y: 550 },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(noBg);
    scene.addChild(
      new Label({
        name: "recNoLabel",
        text: "NO",
        fontSize: 22,
        fontColor: [255, 255, 255, 1],
        position: { x: 280, y: 550 },
        zPosition: 11,
      }),
    );

    const self = this;
    yesBg.onTapDown(() => self._handleRecognitionResponse("YES"));
    noBg.onTapDown(() => self._handleRecognitionResponse("NO"));

    scene.onAppear(() => {
      self._generateRecognitionTrials();
      self._currentRecognitionIndex = 0;
      self._showRecognitionTrial(0);
    });
  }

  _generateRecognitionTrials() {
    const trials = [];

    for (let i = 0; i < this._triplets.length; i++) {
      const triplet = this._triplets[i];

      // Correct face-name
      trials.push({
        pairIndex: i,
        faceId: triplet.faceId,
        faceDataUrl: triplet.faceDataUrl,
        shownAssociation: triplet.name,
        correctAnswer: "YES",
        stimulusType: "face_name",
      });

      // Correct face-occupation
      trials.push({
        pairIndex: i,
        faceId: triplet.faceId,
        faceDataUrl: triplet.faceDataUrl,
        shownAssociation: triplet.occupation,
        correctAnswer: "YES",
        stimulusType: "face_occupation",
      });

      // Wrong name (from another triplet)
      const otherNames = this._triplets
        .filter((_, j) => j !== i)
        .map((t) => t.name);
      const wrongName =
        otherNames[RandomDraws.singleFromRange(0, otherNames.length - 1)];
      trials.push({
        pairIndex: i,
        faceId: triplet.faceId,
        faceDataUrl: triplet.faceDataUrl,
        shownAssociation: wrongName,
        correctAnswer: "NO",
        stimulusType: "face_name",
      });

      // Wrong occupation (from another triplet)
      const otherOccs = this._triplets
        .filter((_, j) => j !== i)
        .map((t) => t.occupation);
      const wrongOcc =
        otherOccs[RandomDraws.singleFromRange(0, otherOccs.length - 1)];
      trials.push({
        pairIndex: i,
        faceId: triplet.faceId,
        faceDataUrl: triplet.faceDataUrl,
        shownAssociation: wrongOcc,
        correctAnswer: "NO",
        stimulusType: "face_occupation",
      });
    }

    this._recognitionTrials = shuffleArray(trials);
  }

  _showRecognitionTrial(index) {
    const total = this._recognitionTrials.length;
    if (index >= total) {
      this._hideFace();
      const showComplete = this.getParameter("show_trials_complete_scene");
      if (showComplete) {
        this.presentScene("complete", Transition.none());
      } else {
        this.end();
      }
      return;
    }

    this._currentRecognitionIndex = index;
    this._responded = false;

    const trial = this._recognitionTrials[index];
    const progressFraction = (index + 1) / total;

    this._getNode("recProgressFill").size = {
      width: 360 * progressFraction,
      height: 6,
    };
    this._getNode("recPhaseLabel").text = `${index + 1} of ${total}`;
    this._getNode("recAssocLabel").text = trial.shownAssociation;
    this._getNode("recTypeLabel").text =
      trial.stimulusType === "face_name" ? "(name)" : "(occupation)";

    // Reset button colors
    this._getNode("recYesBg").fillColor = GREEN;
    this._getNode("recNoBg").fillColor = RED;
    this._getNode("recYesBg").isUserInteractionEnabled = true;
    this._getNode("recNoBg").isUserInteractionEnabled = true;

    // Show face
    this._showFace(trial.faceDataUrl, 200, 260);

    this._recognitionOnsetTime = Timer.now();
  }

  _handleRecognitionResponse(response) {
    if (this._responded) return;
    this._responded = true;

    const trial =
      this._recognitionTrials[this._currentRecognitionIndex];
    const isCorrect = response === trial.correctAnswer;
    const rt = Timer.now() - this._recognitionOnsetTime;

    // Visual feedback
    const yesBg = this._getNode("recYesBg");
    const noBg = this._getNode("recNoBg");
    yesBg.isUserInteractionEnabled = false;
    noBg.isUserInteractionEnabled = false;

    if (response === "YES") {
      yesBg.fillColor = isCorrect ? GREEN : [180, 180, 180, 1];
    } else {
      noBg.fillColor = isCorrect ? RED : [180, 180, 180, 1];
    }

    if (isCorrect) this._recognitionCorrect++;
    this._recognitionTotal++;

    // Record trial data
    this.addTrialData("phase", "recognition");
    this.addTrialData("trial_index", this._globalTrialIndex);
    this.addTrialData("pair_index", trial.pairIndex);
    this.addTrialData("face_id", trial.faceId);
    this.addTrialData("correct_answer", trial.correctAnswer);
    this.addTrialData("user_response", response);
    this.addTrialData("is_correct", isCorrect);
    this.addTrialData("response_time_ms", Math.round(rt));
    this.addTrialData("distractor_options", "[]");
    this.addTrialData("stimulus_type", trial.stimulusType);
    this.trialComplete();
    this._globalTrialIndex++;

    // Advance
    const self = this;
    const scene = this._getScene("recognition");
    scene.run(
      Action.sequence([
        Action.wait({ duration: 500 }),
        Action.custom({
          callback: () => {
            self._showRecognitionTrial(
              self._currentRecognitionIndex + 1,
            );
          },
        }),
      ]),
      "rec-advance",
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Completion
  // ═══════════════════════════════════════════════════════════

  _buildCompleteScene() {
    const scene = new Scene({ name: "complete", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Test Complete",
        fontSize: 30,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: 240 },
      }),
    );

    scene.addChild(
      new Label({
        name: "completeInference",
        text: "",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 340 },
      }),
    );

    scene.addChild(
      new Label({
        name: "completeRecognition",
        text: "",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: 380 },
      }),
    );

    scene.addChild(
      new Label({
        text: "Thank you for participating.",
        fontSize: 16,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: 460 },
      }),
    );

    const self = this;
    scene.onAppear(() => {
      self._hideFace();
      self._getNode("completeInference").text =
        `Inference: ${self._inferenceCorrect} / ${self._inferenceTotal}`;
      self._getNode("completeRecognition").text =
        `Recognition: ${self._recognitionCorrect} / ${self._recognitionTotal}`;

      // Auto-end after 5 seconds
      scene.run(
        Action.sequence([
          Action.wait({ duration: 5000 }),
          Action.custom({
            callback: () => {
              self.end();
            },
          }),
        ]),
        "complete-timer",
      );
    });
  }
}
