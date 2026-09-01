import {
  Game,
  Action,
  Scene,
  Shape,
  Label,
  Timer,
  Transition,
} from "@m2c2kit/core";

import {
  normalizeName,
  levenshtein,
  studyOrder,
  testOrder,
  buildOptions,
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
const OPTION_BG = [245, 245, 250, 1];
const OPTION_BORDER = [200, 200, 210, 1];
const TRANSPARENT = [0, 0, 0, 0];
const WHITE = [255, 255, 255, 1];

export class FaceNamePairs extends Game {
  constructor() {
    const defaultParameters = {
      phase: {
        default: "learning",
        type: "string",
        description:
          "learning (study all pairs, then immediate cued recall) | " +
          "delayed (cued recall only, launched as a separate session)",
      },
      response_mode: {
        default: "typed",
        type: "string",
        description:
          "typed (free recall via keyboard) | choice (4-alternative forced choice)",
      },
      list_id: {
        default: 1,
        type: "number",
        description: "Which of the 4 pre-constructed balanced lists (1-4)",
      },
      subset_size: {
        default: 20,
        type: "number",
        description:
          "Number of pairs tested in the delayed phase (deterministic seeded subset)",
      },
      subset_seed: {
        default: 0,
        type: "number",
        description:
          "Seed for the delayed-recall subset; must match across a participant's sessions",
      },
      immediate_test: {
        default: true,
        type: "boolean",
        description:
          "Run the immediate cued-recall test after study (learning phase only)",
      },
      learning_duration_ms: {
        default: 5000,
        type: "number",
        description: "Display duration per face-name pair during study (ms)",
      },
      isi_ms: {
        default: 500,
        type: "number",
        description: "Blank inter-stimulus interval between study items (ms)",
      },
      allow_tap_advance: {
        default: false,
        type: "boolean",
        description:
          "Allow tapping to advance study items early (off = fixed encoding time)",
      },
      feedback_enabled: {
        default: false,
        type: "boolean",
        description:
          "Show correctness feedback at test (off by default: a delayed retest follows)",
      },
      typed_lenient_distance: {
        default: 1,
        type: "number",
        description:
          "Max Levenshtein distance from the target name counted as lenient-correct (typed mode)",
      },
      show_tutorial: {
        default: true,
        type: "boolean",
        description: "Show instruction screens",
      },
      pairs_json: {
        default: "[]",
        type: "string",
        description:
          "JSON array of pair objects incl. dataUrl (set by index.js after image prefetch)",
      },
      all_names_json: {
        default: "[]",
        type: "string",
        description:
          "JSON array of {pair_id, name, gender} for the FULL list (lure pool for choice mode)",
      },
      show_trials_complete_scene: {
        default: true,
        type: "boolean",
        description: "Show completion screen at end",
      },
    };

    super({
      name: "Face-Name Pairs",
      id: "fname-pairs",
      publishUuid: "7c2e9b4a-1f6d-4e3a-9c8b-2d5f7a1e6b3c",
      version: "1.0.0",
      shortDescription:
        "Face-name paired-associate memory with immediate and delayed cued recall",
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
        trial_type: {
          type: "string",
          description: "study | test",
        },
        phase: {
          type: "string",
          description: "learning | delayed",
        },
        list_id: {
          type: "integer",
          description: "Balanced list used (1-4)",
        },
        trial_index: {
          type: "integer",
          description: "Global trial counter within this session (0-based)",
        },
        pair_id: {
          type: "integer",
          description: "Stable pair identifier within the list (0-19)",
        },
        cfd_target: {
          type: "string",
          description: "Chicago Face Database target id (e.g. CFD-WF-001)",
        },
        name_target: {
          type: "string",
          description: "Correct name for this face",
        },
        face_race: {
          type: "string",
          description: "CFD self-identified race code (A/B/L/W)",
        },
        face_gender: {
          type: "string",
          description: "CFD self-identified gender code (M/F)",
        },
        face_age_rated: {
          type: "number",
          description: "CFD norming mean rated age",
        },
        face_attractive: {
          type: "number",
          description: "CFD norming mean attractiveness (1-7)",
        },
        response_mode: {
          type: "string",
          description: "typed | choice",
        },
        subset_size: {
          type: "integer",
          description: "Delayed-subset size parameter echoed for provenance",
        },
        subset_seed: {
          type: "integer",
          description: "Delayed-subset seed parameter echoed for provenance",
        },
        study_position: {
          type: ["integer", "null"],
          description: "Presentation position within the study block (0-based)",
        },
        test_position: {
          type: ["integer", "null"],
          description: "Presentation position within the test block (0-based)",
        },
        display_timestamp: {
          type: "number",
          description: "performance.now() at stimulus onset (ms)",
        },
        display_duration_ms: {
          type: ["number", "null"],
          description: "Actual on-screen duration of a study item (ms)",
        },
        response_raw: {
          type: ["string", "null"],
          description: "Typed string or chosen option text",
        },
        response_normalized: {
          type: ["string", "null"],
          description: "Lowercased, diacritic- and punctuation-stripped response",
        },
        options_json: {
          type: ["string", "null"],
          description: "JSON array of the 4 options shown (choice mode)",
        },
        selected_index: {
          type: ["integer", "null"],
          description: "Index of the chosen option (choice mode)",
        },
        edit_distance: {
          type: ["integer", "null"],
          description: "Levenshtein distance to the target name (typed mode)",
        },
        is_correct_strict: {
          type: ["boolean", "null"],
          description: "Exact match (typed) or chose the target (choice)",
        },
        is_correct_lenient: {
          type: ["boolean", "null"],
          description:
            "Within typed_lenient_distance edits (typed); same as strict in choice mode",
        },
        rt_ms: {
          type: ["number", "null"],
          description: "Stimulus onset to response (ms)",
        },
        response_timestamp: {
          type: ["number", "null"],
          description: "performance.now() at response (ms)",
        },
      },
      parameters: defaultParameters,
    });

    this._H = 800;

    // Internal state
    this._pairs = [];
    this._allNames = [];
    this._studySeq = [];
    this._testSeq = [];
    this._globalTrialIndex = 0;
    this._correctStrict = 0;
    this._correctLenient = 0;
    this._responded = false;
    this._faceImgEl = null;
    this._inputEl = null;
    this._overlayState = { face: null, input: null };
    this._resizeHooked = false;

    // Build all scenes (branching by phase/mode happens in onAppear handlers,
    // because parameters are only set after construction).
    this._buildTutorialScene();
    this._buildStudyScene();
    this._buildTestIntroScene();
    this._buildTestScene();
    this._buildCompleteScene();
  }

  // ═══════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════

  _py(y800) {
    return Math.round((this._H * y800) / 800);
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

  _entrySceneName() {
    return this.getParameter("phase") === "delayed" ? "test" : "study";
  }

  // ── DOM overlays (face image + typed-response input) ───────
  // m2c2kit images must be declared at construction time, so the
  // dynamically loaded faces are shown via an HTML <img> overlay
  // positioned in the 400x800 logical coordinate system. The typed
  // response field uses the same technique with an <input>.

  _canvasMetrics() {
    const canvas = document.querySelector("#m2c2kit canvas");
    if (!canvas) return null;
    const canvasRect = canvas.getBoundingClientRect();
    const parentRect = canvas.parentElement.getBoundingClientRect();
    return {
      scaleX: canvasRect.width / 400,
      scaleY: canvasRect.height / 800,
      offsetX: canvasRect.left - parentRect.left,
      offsetY: canvasRect.top - parentRect.top,
    };
  }

  _hookResize() {
    if (this._resizeHooked) return;
    this._resizeHooked = true;
    const reposition = () => this._repositionOverlays();
    window.addEventListener("resize", reposition);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", reposition);
    }
  }

  _repositionOverlays() {
    const { face, input } = this._overlayState;
    if (face) this._showFace(face.dataUrl, face.x, face.y);
    if (input) this._placeInput(input.x, input.y, input.w, input.h);
  }

  _ensureFaceOverlay() {
    if (this._faceImgEl) return;
    const container = document.getElementById("m2c2kit");
    if (!container) return;

    const img = document.createElement("img");
    img.id = "fname-pairs-face-overlay";
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
    this._hookResize();
  }

  _showFace(dataUrl, logicalX, logicalY) {
    this._ensureFaceOverlay();
    if (!this._faceImgEl) return;
    const m = this._canvasMetrics();
    if (!m) return;

    const el = this._faceImgEl;
    const imgW = 150 * m.scaleX;
    const imgH = 180 * m.scaleY;
    el.style.width = `${imgW}px`;
    el.style.height = `${imgH}px`;
    el.style.left = `${m.offsetX + logicalX * m.scaleX - imgW / 2}px`;
    el.style.top = `${m.offsetY + logicalY * m.scaleY - imgH / 2}px`;
    el.style.display = "block";
    this._overlayState.face = { dataUrl, x: logicalX, y: logicalY };

    if (el.src === dataUrl) {
      // Reposition-only call (e.g. viewport resize) — image already correct.
      el.style.visibility = "visible";
      return;
    }
    // The element still holds the PREVIOUS trial's decoded image; swapping
    // src alone would flash it for a frame while the new data URL decodes.
    // Keep it invisible until the new image is fully decoded.
    el.style.visibility = "hidden";
    el.src = dataUrl;
    const reveal = () => {
      const current = this._overlayState.face;
      if (current && current.dataUrl === dataUrl && el.src === dataUrl) {
        el.style.visibility = "visible";
      }
    };
    if (el.decode) {
      el.decode().then(reveal).catch(reveal);
    } else {
      el.onload = reveal;
    }
  }

  _hideFace() {
    if (this._faceImgEl) {
      this._faceImgEl.style.display = "none";
      this._faceImgEl.style.visibility = "hidden";
    }
    this._overlayState.face = null;
  }

  _ensureInputOverlay() {
    if (this._inputEl) return;
    const container = document.getElementById("m2c2kit");
    if (!container) return;

    const input = document.createElement("input");
    input.id = "fname-pairs-name-input";
    input.type = "text";
    input.autocomplete = "off";
    input.autocapitalize = "none";
    input.spellcheck = false;
    input.setAttribute("autocorrect", "off");
    input.placeholder = "Type the name";
    input.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      box-sizing: border-box;
      border: 2px solid #9a9ad0;
      border-radius: 10px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #000;
      background: #fff;
      display: none;
      z-index: 100;
      outline: none;
    `;
    const self = this;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        self._handleTypedSubmit();
      }
    });
    container.style.position = "relative";
    container.appendChild(input);
    this._inputEl = input;
    this._hookResize();
  }

  _placeInput(logicalX, logicalY, logicalW, logicalH) {
    if (!this._inputEl) return;
    const m = this._canvasMetrics();
    if (!m) return;
    const w = logicalW * m.scaleX;
    const h = logicalH * m.scaleY;
    this._inputEl.style.width = `${w}px`;
    this._inputEl.style.height = `${h}px`;
    this._inputEl.style.fontSize = `${Math.round(20 * m.scaleY)}px`;
    this._inputEl.style.left = `${m.offsetX + logicalX * m.scaleX - w / 2}px`;
    this._inputEl.style.top = `${m.offsetY + logicalY * m.scaleY - h / 2}px`;
  }

  _showInput(logicalX, logicalY, logicalW, logicalH) {
    this._ensureInputOverlay();
    if (!this._inputEl) return;
    this._overlayState.input = {
      x: logicalX,
      y: logicalY,
      w: logicalW,
      h: logicalH,
    };
    this._placeInput(logicalX, logicalY, logicalW, logicalH);
    this._inputEl.value = "";
    this._inputEl.style.display = "block";
    this._inputEl.focus();
  }

  _hideInput() {
    if (this._inputEl) {
      this._inputEl.style.display = "none";
      this._inputEl.blur();
    }
    this._overlayState.input = null;
  }

  // ═══════════════════════════════════════════════════════════
  // Session init: derive deterministic sequences from parameters
  // ═══════════════════════════════════════════════════════════

  _initSession() {
    let pairs;
    try {
      const raw = this.getParameter("pairs_json");
      pairs = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_) {
      pairs = [];
    }
    let allNames;
    try {
      const raw = this.getParameter("all_names_json");
      allNames = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_) {
      allNames = [];
    }

    this._pairs = pairs || [];
    this._allNames = allNames || [];

    const phase = this.getParameter("phase");
    const listId = this.getParameter("list_id");
    const subsetSeed = this.getParameter("subset_seed");

    // index.js has already applied selectSubset() for the delayed phase, so
    // this._pairs is exactly the set to study/test. Only ordering happens here.
    this._studySeq =
      phase === "learning" ? studyOrder(this._pairs, listId, subsetSeed) : [];
    this._testSeq = testOrder(this._pairs, listId, subsetSeed, phase);

    this._globalTrialIndex = 0;
    this._correctStrict = 0;
    this._correctLenient = 0;
    this._responded = false;
  }

  _recordCommonFields(trialType, pair) {
    this.addTrialData("trial_type", trialType);
    this.addTrialData("phase", this.getParameter("phase"));
    this.addTrialData("list_id", this.getParameter("list_id"));
    this.addTrialData("trial_index", this._globalTrialIndex);
    this.addTrialData("pair_id", pair.pair_id);
    this.addTrialData("cfd_target", pair.cfd_target);
    this.addTrialData("name_target", pair.name);
    this.addTrialData("face_race", pair.race);
    this.addTrialData("face_gender", pair.gender);
    this.addTrialData("face_age_rated", pair.age_rated);
    this.addTrialData("face_attractive", pair.attractive);
    this.addTrialData("response_mode", this.getParameter("response_mode"));
    this.addTrialData("subset_size", this.getParameter("subset_size"));
    this.addTrialData("subset_seed", this.getParameter("subset_seed"));
  }

  // ═══════════════════════════════════════════════════════════
  // Tutorial
  // ═══════════════════════════════════════════════════════════

  _tutorialText() {
    const phase = this.getParameter("phase");
    const typed = this.getParameter("response_mode") === "typed";
    if (phase === "delayed") {
      return {
        title: "Memory Test",
        body: typed
          ? "Earlier you learned some\nface-name pairs.\n\nYou will now see each face again.\nType the name that goes with it."
          : "Earlier you learned some\nface-name pairs.\n\nYou will now see each face again.\nChoose the name that goes with it.",
      };
    }
    return {
      title: "Learn Face-Name Pairs",
      body: typed
        ? "You will see faces, each with\na name below it.\n\nTry to remember which name goes\nwith each face. Afterwards, you\nwill type each person's name."
        : "You will see faces, each with\na name below it.\n\nTry to remember which name goes\nwith each face. Afterwards, you\nwill pick each person's name.",
    };
  }

  _buildTutorialScene() {
    const scene = new Scene({ name: "tutorial", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Label({
        name: "tutTitle",
        text: "",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: this._py(220) },
        preferredMaxLayoutWidth: 340,
      }),
    );
    scene.addChild(
      new Label({
        name: "tutBody",
        text: "",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: this._py(370) },
        preferredMaxLayoutWidth: 320,
      }),
    );

    const btnBg = new Shape({
      name: "tutStartBtn",
      rect: { width: 160, height: 50 },
      cornerRadius: 25,
      fillColor: GREEN,
      position: { x: 200, y: this._py(540) },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(btnBg);
    scene.addChild(
      new Label({
        text: "Begin",
        fontSize: 20,
        fontColor: WHITE,
        position: { x: 200, y: this._py(540) },
        zPosition: 11,
      }),
    );

    const self = this;
    btnBg.onTapDown(() => {
      self.presentScene(self._entrySceneName(), Transition.none());
    });

    scene.onAppear(() => {
      self._initSession();
      self._hideFace();
      self._hideInput();
      if (!self.getParameter("show_tutorial")) {
        // Defer one tick: presenting a new scene from within onAppear races
        // the scene transition machinery.
        scene.run(
          Action.sequence([
            Action.wait({ duration: 50 }),
            Action.custom({
              callback: () => {
                self.presentScene(self._entrySceneName(), Transition.none());
              },
            }),
          ]),
          "tutorial-skip",
        );
        return;
      }
      const { title, body } = self._tutorialText();
      self._getNode("tutTitle").text = title;
      self._getNode("tutBody").text = body;
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Study (learning phase only)
  // ═══════════════════════════════════════════════════════════

  _buildStudyScene() {
    const scene = new Scene({ name: "study", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Shape({
        name: "stProgressBg",
        rect: { width: 360, height: 6 },
        cornerRadius: 3,
        fillColor: PROGRESS_BG,
        position: { x: 200, y: this._py(30) },
      }),
    );
    scene.addChild(
      new Shape({
        name: "stProgressFill",
        rect: { width: 0, height: 6 },
        cornerRadius: 3,
        fillColor: PROGRESS_FILL,
        position: { x: 20, y: this._py(30) },
        anchorPoint: { x: 0, y: 0.5 },
      }),
    );
    scene.addChild(
      new Label({
        name: "stPhaseLabel",
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: this._py(55) },
      }),
    );

    scene.addChild(
      new Shape({
        name: "stCard",
        rect: { width: 320, height: 400 },
        cornerRadius: 20,
        fillColor: CARD_BG,
        position: { x: 200, y: this._py(330) },
      }),
    );
    scene.addChild(
      new Shape({
        name: "stFaceFrame",
        rect: { width: 156, height: 186 },
        cornerRadius: 14,
        fillColor: [200, 200, 210, 1],
        position: { x: 200, y: this._py(250) },
      }),
    );
    scene.addChild(
      new Label({
        name: "stNameLabel",
        text: "",
        fontSize: 32,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: this._py(410) },
        preferredMaxLayoutWidth: 280,
      }),
    );
    scene.addChild(
      new Label({
        name: "stSubtitle",
        text: "Try to remember this pair.",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: this._py(460) },
      }),
    );
    scene.addChild(
      new Shape({
        name: "stTimerBar",
        rect: { width: 320, height: 3 },
        cornerRadius: 1,
        fillColor: PROGRESS_FILL,
        position: { x: 200, y: this._py(545) },
      }),
    );

    const tapArea = new Shape({
      name: "stTapArea",
      rect: { width: 400, height: 800 },
      fillColor: TRANSPARENT,
      position: { x: 200, y: this._py(400) },
      isUserInteractionEnabled: true,
      zPosition: 1,
    });
    scene.addChild(tapArea);

    const self = this;
    tapArea.onTapDown(() => {
      if (self.getParameter("allow_tap_advance")) {
        self._endStudyItem(true);
      }
    });

    scene.onAppear(() => {
      self._showStudyItem(0);
    });
  }

  _showStudyItem(index) {
    const total = this._studySeq.length;

    if (index >= total) {
      this._hideFace();
      if (!this.getParameter("immediate_test")) {
        this.presentScene("complete", Transition.none());
        return;
      }
      this.presentScene(
        this.getParameter("show_tutorial") ? "test-intro" : "test",
        Transition.none(),
      );
      return;
    }

    this._currentStudyIndex = index;
    const pair = this._studySeq[index];

    this._getNode("stProgressFill").size = {
      width: (360 * (index + 1)) / total,
      height: 6,
    };
    this._getNode("stPhaseLabel").text = `${index + 1} of ${total}`;
    this._getNode("stNameLabel").text = pair.name;
    this._showFace(pair.dataUrl, 200, this._py(250));

    const timerBar = this._getNode("stTimerBar");
    timerBar.size = { width: 320, height: 3 };

    this._studyOnsetTime = Timer.now();
    this._studyOnsetTimestamp = performance.now();
    this._studyItemEnded = false;

    const duration = this.getParameter("learning_duration_ms");
    const scene = this._getScene("study");
    scene.removeAllActions();
    const self = this;
    scene.run(
      Action.sequence([
        Action.wait({ duration: duration }),
        Action.custom({
          callback: () => {
            self._endStudyItem(false);
          },
        }),
      ]),
      "study-timer",
    );

    // Animate timer bar shrinking
    if (this._studyShrinkTimer) clearInterval(this._studyShrinkTimer);
    const steps = 60;
    let currentStep = 0;
    this._studyShrinkTimer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        clearInterval(self._studyShrinkTimer);
        return;
      }
      timerBar.size = {
        width: Math.max(0, 320 * (1 - currentStep / steps)),
        height: 3,
      };
    }, duration / steps);
  }

  _endStudyItem(tapped) {
    if (this._studyItemEnded) return;
    this._studyItemEnded = true;

    const scene = this._getScene("study");
    scene.removeAllActions();
    if (this._studyShrinkTimer) clearInterval(this._studyShrinkTimer);

    const index = this._currentStudyIndex;
    const pair = this._studySeq[index];
    const actualDuration = Timer.now() - this._studyOnsetTime;

    this._recordCommonFields("study", pair);
    this.addTrialData("study_position", index);
    this.addTrialData("test_position", null);
    this.addTrialData("display_timestamp", this._studyOnsetTimestamp);
    this.addTrialData("display_duration_ms", Math.round(actualDuration));
    this.addTrialData("response_raw", null);
    this.addTrialData("response_normalized", null);
    this.addTrialData("options_json", null);
    this.addTrialData("selected_index", null);
    this.addTrialData("edit_distance", null);
    this.addTrialData("is_correct_strict", null);
    this.addTrialData("is_correct_lenient", null);
    this.addTrialData("rt_ms", null);
    this.addTrialData("response_timestamp", null);
    this.trialComplete();
    this._globalTrialIndex++;

    // Blank inter-stimulus interval, then next item
    this._hideFace();
    this._getNode("stNameLabel").text = "";
    const isi = tapped ? 250 : this.getParameter("isi_ms");
    const self = this;
    scene.run(
      Action.sequence([
        Action.wait({ duration: Math.max(0, isi) }),
        Action.custom({
          callback: () => {
            self._showStudyItem(index + 1);
          },
        }),
      ]),
      "study-isi",
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Test intro (between study and immediate test)
  // ═══════════════════════════════════════════════════════════

  _buildTestIntroScene() {
    const scene = new Scene({ name: "test-intro", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Label({
        text: "Memory Test",
        fontSize: 28,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: this._py(240) },
      }),
    );
    scene.addChild(
      new Label({
        name: "tiBody",
        text: "",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: this._py(360) },
        preferredMaxLayoutWidth: 320,
      }),
    );

    const btnBg = new Shape({
      rect: { width: 160, height: 50 },
      cornerRadius: 25,
      fillColor: GREEN,
      position: { x: 200, y: this._py(520) },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(btnBg);
    scene.addChild(
      new Label({
        text: "Start",
        fontSize: 20,
        fontColor: WHITE,
        position: { x: 200, y: this._py(520) },
        zPosition: 11,
      }),
    );

    const self = this;
    btnBg.onTapDown(() => {
      self.presentScene("test", Transition.none());
    });

    scene.onAppear(() => {
      self._hideFace();
      self._getNode("tiBody").text =
        self.getParameter("response_mode") === "typed"
          ? "You will now see each face again.\nType the name that goes with it,\nthen press Submit."
          : "You will now see each face again.\nChoose the name that goes with it.";
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Test (immediate & delayed cued recall)
  // ═══════════════════════════════════════════════════════════

  _buildTestScene() {
    const scene = new Scene({ name: "test", backgroundColor: SCENE_BG });
    this.addScene(scene);

    scene.addChild(
      new Shape({
        name: "tProgressBg",
        rect: { width: 360, height: 6 },
        cornerRadius: 3,
        fillColor: PROGRESS_BG,
        position: { x: 200, y: this._py(30) },
      }),
    );
    scene.addChild(
      new Shape({
        name: "tProgressFill",
        rect: { width: 0, height: 6 },
        cornerRadius: 3,
        fillColor: PROGRESS_FILL,
        position: { x: 20, y: this._py(30) },
        anchorPoint: { x: 0, y: 0.5 },
      }),
    );
    scene.addChild(
      new Label({
        name: "tPhaseLabel",
        text: "",
        fontSize: 14,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: this._py(55) },
      }),
    );

    scene.addChild(
      new Shape({
        name: "tFaceFrame",
        rect: { width: 156, height: 186 },
        cornerRadius: 14,
        fillColor: [200, 200, 210, 1],
        position: { x: 200, y: this._py(200) },
      }),
    );

    scene.addChild(
      new Label({
        name: "tPrompt",
        text: "What is this person's name?",
        fontSize: 20,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: this._py(330) },
        preferredMaxLayoutWidth: 340,
      }),
    );

    // Feedback label (used only when feedback_enabled)
    scene.addChild(
      new Label({
        name: "tFeedback",
        text: "",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: this._py(720) },
        preferredMaxLayoutWidth: 340,
      }),
    );

    // ── Typed mode: submit button (input itself is a DOM overlay at y=400)
    const submitBg = new Shape({
      name: "tSubmitBtn",
      rect: { width: 160, height: 50 },
      cornerRadius: 25,
      fillColor: PROGRESS_FILL,
      position: { x: 200, y: this._py(475) },
      isUserInteractionEnabled: true,
      zPosition: 10,
    });
    scene.addChild(submitBg);
    scene.addChild(
      new Label({
        name: "tSubmitLabel",
        text: "Submit",
        fontSize: 20,
        fontColor: WHITE,
        position: { x: 200, y: this._py(475) },
        zPosition: 11,
      }),
    );

    // ── Choice mode: 4 option buttons
    for (let i = 0; i < 4; i++) {
      const yPos = this._py(420 + i * 78);
      const optBg = new Shape({
        name: `tOpt${i}Bg`,
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
          name: `tOpt${i}Label`,
          text: "",
          fontSize: 20,
          fontColor: TEXT_PRIMARY,
          position: { x: 200, y: yPos },
          zPosition: 11,
        }),
      );

      const self = this;
      optBg.onTapDown(() => {
        self._handleChoiceResponse(i);
      });
    }

    const self = this;
    submitBg.onTapDown(() => {
      self._handleTypedSubmit();
    });

    scene.onAppear(() => {
      self._showTestTrial(0);
    });
  }

  _setTypedControlsVisible(visible) {
    this._getNode("tSubmitBtn").hidden = !visible;
    this._getNode("tSubmitLabel").hidden = !visible;
    const btn = this._getNode("tSubmitBtn");
    btn.isUserInteractionEnabled = visible;
  }

  _setChoiceControlsVisible(visible) {
    for (let i = 0; i < 4; i++) {
      const bg = this._getNode(`tOpt${i}Bg`);
      const lbl = this._getNode(`tOpt${i}Label`);
      bg.hidden = !visible;
      lbl.hidden = !visible;
      bg.isUserInteractionEnabled = visible;
    }
  }

  _showTestTrial(index) {
    const total = this._testSeq.length;

    if (index >= total) {
      this._hideFace();
      this._hideInput();
      this.presentScene("complete", Transition.none());
      return;
    }

    this._currentTestIndex = index;
    this._responded = false;
    const pair = this._testSeq[index];
    const typed = this.getParameter("response_mode") === "typed";

    this._getNode("tProgressFill").size = {
      width: (360 * (index + 1)) / total,
      height: 6,
    };
    this._getNode("tPhaseLabel").text = `${index + 1} of ${total}`;
    this._getNode("tFeedback").text = "";
    this._showFace(pair.dataUrl, 200, this._py(200));

    if (typed) {
      this._setChoiceControlsVisible(false);
      this._setTypedControlsVisible(true);
      this._currentOptions = null;
      this._showInput(200, this._py(400), 280, 52);
    } else {
      this._hideInput();
      this._setTypedControlsVisible(false);
      this._setChoiceControlsVisible(true);
      const options = buildOptions(
        pair,
        this._allNames,
        this.getParameter("list_id"),
        this.getParameter("phase"),
      );
      this._currentOptions = options;
      for (let i = 0; i < 4; i++) {
        const bg = this._getNode(`tOpt${i}Bg`);
        const lbl = this._getNode(`tOpt${i}Label`);
        lbl.text = options[i] ? options[i].toUpperCase() : "";
        bg.fillColor = OPTION_BG;
        bg.strokeColor = OPTION_BORDER;
        bg.isUserInteractionEnabled = true;
      }
    }

    this._testOnsetTime = Timer.now();
    this._testOnsetTimestamp = performance.now();
  }

  _handleTypedSubmit() {
    if (this._responded) return;
    if (this.getParameter("response_mode") !== "typed") return;
    this._responded = true;

    const pair = this._testSeq[this._currentTestIndex];
    const rt = Timer.now() - this._testOnsetTime;
    const responseTimestamp = performance.now();
    const raw = this._inputEl ? this._inputEl.value : "";
    const normalized = normalizeName(raw);
    const target = normalizeName(pair.name);
    const distance = levenshtein(normalized, target);
    const lenientMax = this.getParameter("typed_lenient_distance");
    const isStrict = distance === 0;
    const isLenient = distance <= lenientMax;

    this._setTypedControlsVisible(false);
    this._hideInput();

    this._finishTestTrial(pair, {
      raw,
      normalized,
      optionsJson: null,
      selectedIndex: null,
      editDistance: distance,
      isStrict,
      isLenient,
      rt,
      responseTimestamp,
    });

    if (this.getParameter("feedback_enabled")) {
      this._getNode("tFeedback").text = isLenient
        ? "Correct!"
        : `The name was ${pair.name}`;
      this._getNode("tFeedback").fontColor = isLenient ? GREEN : RED;
    }
    this._advanceTestAfterDelay();
  }

  _handleChoiceResponse(optionIndex) {
    if (this._responded) return;
    if (this.getParameter("response_mode") === "typed") return;
    const options = this._currentOptions;
    if (!options || optionIndex >= options.length) return;
    this._responded = true;

    const pair = this._testSeq[this._currentTestIndex];
    const rt = Timer.now() - this._testOnsetTime;
    const responseTimestamp = performance.now();
    const chosen = options[optionIndex];
    const isCorrect = chosen === pair.name;

    if (this.getParameter("feedback_enabled")) {
      const bg = this._getNode(`tOpt${optionIndex}Bg`);
      bg.fillColor = isCorrect ? GREEN : RED;
      bg.strokeColor = isCorrect ? GREEN : RED;
      if (!isCorrect) {
        for (let i = 0; i < options.length; i++) {
          if (options[i] === pair.name) {
            this._getNode(`tOpt${i}Bg`).fillColor = GREEN;
            this._getNode(`tOpt${i}Bg`).strokeColor = GREEN;
          }
        }
      }
    }
    for (let i = 0; i < 4; i++) {
      this._getNode(`tOpt${i}Bg`).isUserInteractionEnabled = false;
    }

    this._finishTestTrial(pair, {
      raw: chosen,
      normalized: normalizeName(chosen),
      optionsJson: JSON.stringify(options),
      selectedIndex: optionIndex,
      editDistance: null,
      isStrict: isCorrect,
      isLenient: isCorrect,
      rt,
      responseTimestamp,
    });

    this._advanceTestAfterDelay();
  }

  _finishTestTrial(pair, r) {
    if (r.isStrict) this._correctStrict++;
    if (r.isLenient) this._correctLenient++;

    this._recordCommonFields("test", pair);
    this.addTrialData("study_position", null);
    this.addTrialData("test_position", this._currentTestIndex);
    this.addTrialData("display_timestamp", this._testOnsetTimestamp);
    this.addTrialData("display_duration_ms", null);
    this.addTrialData("response_raw", r.raw);
    this.addTrialData("response_normalized", r.normalized);
    this.addTrialData("options_json", r.optionsJson);
    this.addTrialData("selected_index", r.selectedIndex);
    this.addTrialData("edit_distance", r.editDistance);
    this.addTrialData("is_correct_strict", r.isStrict);
    this.addTrialData("is_correct_lenient", r.isLenient);
    this.addTrialData("rt_ms", Math.round(r.rt));
    this.addTrialData("response_timestamp", r.responseTimestamp);
    this.trialComplete();
    this._globalTrialIndex++;
  }

  _advanceTestAfterDelay() {
    const delay = this.getParameter("feedback_enabled") ? 900 : 350;
    const self = this;
    const scene = this._getScene("test");
    scene.run(
      Action.sequence([
        Action.wait({ duration: delay }),
        Action.custom({
          callback: () => {
            self._showTestTrial(self._currentTestIndex + 1);
          },
        }),
      ]),
      "test-advance",
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
        name: "completeTitle",
        text: "Test Complete",
        fontSize: 30,
        fontColor: TEXT_PRIMARY,
        position: { x: 200, y: this._py(260) },
      }),
    );
    scene.addChild(
      new Label({
        name: "completeScore",
        text: "",
        fontSize: 18,
        fontColor: TEXT_SECONDARY,
        position: { x: 200, y: this._py(360) },
      }),
    );
    scene.addChild(
      new Label({
        text: "Thank you for participating.",
        fontSize: 16,
        fontColor: TEXT_TERTIARY,
        position: { x: 200, y: this._py(440) },
      }),
    );

    const self = this;
    scene.onAppear(() => {
      self._hideFace();
      self._hideInput();

      if (!self.getParameter("show_trials_complete_scene")) {
        self.end();
        return;
      }

      const nTests = self._testSeq.length;
      const tested =
        self.getParameter("phase") === "learning" &&
        !self.getParameter("immediate_test")
          ? 0
          : nTests;
      if (tested === 0) {
        self._getNode("completeTitle").text = "Learning Complete";
        self._getNode("completeScore").text = "";
      } else {
        self._getNode("completeScore").text =
          `You recalled ${self._correctStrict} of ${tested} names.`;
      }

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
