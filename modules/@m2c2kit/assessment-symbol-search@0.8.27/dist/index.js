import { Game, WebColors, Sprite, Scene, Transition, Easings, TransitionDirection, Shape, Label, RandomDraws, Timer, Action } from '@m2c2kit/core';
import { LocalePicker, Instructions, CountdownScene, Grid, Button } from '@m2c2kit/addons';

class SymbolSearch extends Game {
  constructor() {
    const defaultParameters = {
      number_of_top_pairs: {
        default: 3,
        type: "integer",
        enum: [1, 2, 3, 4],
        description: "Number of pairs to be shown on top. (1-4)"
      },
      lure_percent: {
        default: 0.5,
        type: "number",
        description: "Percentage of lure trials. Number from 0 to 1. A lure trial is when the incorrect symbol pair on the bottom contains exactly one symbol that is found on the top.(1 unique symbol). A non-lure trial is when the incorrect symbol pair contains exactly zero symbols that match the top. (2 unique symbols.)"
      },
      lure_position_on_card: {
        default: "either",
        type: "string",
        enum: ["top", "bottom", "either"],
        description: "If a lure trial, must the lure symbol occupy the top position on the the card, the bottom, or either? If either, then the lure symbol will be equally distributed across trials to be in the top and bottom positions."
      },
      left_correct_percent: {
        default: 0.5,
        type: "number",
        description: "Percentage of trials where the left pair is the correct answer. Number from 0 to 1."
      },
      countdown_duration_ms: {
        default: 3e3,
        type: "number",
        description: "Duration of the countdown phase, milliseconds. Multiples of 1000 recommended."
      },
      after_countdown_transition_duration_ms: {
        default: 500,
        type: "number",
        description: "Duration, in milliseconds, of the slide in animation after the countdown phase."
      },
      number_of_trials: {
        default: 5,
        type: "integer",
        description: "How many trials to run."
      },
      interstimulus_animation: {
        default: true,
        type: "boolean",
        description: "Should new trials slide in from right to left?"
      },
      interstimulus_interval_duration_ms: {
        default: 500,
        type: "number",
        description: "If interstimulus_animation == true, the duration, in milliseconds, of the slide in animation after each trial. Otherwise, the duration, in milliseconds, to wait after a trial has been completed until a new trial appears."
      },
      instruction_type: {
        default: "long",
        type: "string",
        enum: ["short", "long"],
        description: "Type of instructions to show, 'short' or 'long'."
      },
      instructions: {
        default: null,
        type: ["object", "null"],
        description: "When non-null, an InstructionsOptions object that will completely override the built-in instructions."
      },
      show_trials_complete_scene: {
        default: true,
        type: "boolean",
        description: "After the final trial, should a completion scene be shown? Otherwise, the game will immediately end."
      },
      show_quit_button: {
        type: "boolean",
        default: false,
        description: "Should the activity quit button be shown?"
      },
      show_fps: {
        type: "boolean",
        default: false,
        description: "Should the FPS be shown?"
      },
      show_locale_picker: {
        type: "boolean",
        default: false,
        description: "Should the icon that allows the participant to switch the locale be shown?"
      }
    };
    const symbolSearchTrialSchema = {
      activity_begin_iso8601_timestamp: {
        type: "string",
        format: "date-time",
        description: "ISO 8601 timestamp at the beginning of the game activity."
      },
      trial_begin_iso8601_timestamp: {
        type: ["string", "null"],
        format: "date-time",
        description: "ISO 8601 timestamp at the beginning of the trial. Null if trial was skipped."
      },
      trial_end_iso8601_timestamp: {
        type: ["string", "null"],
        format: "date-time",
        description: "ISO 8601 timestamp at the end of the trial (when user selects a card). Null if trial was skipped."
      },
      trial_index: {
        type: ["integer", "null"],
        description: "Index of the trial within this assessment, 0-based."
      },
      trial_type: {
        type: ["string", "null"],
        enum: ["normal", "lure", null],
        description: "Indicates if trial was normal or lure. Null if trial was skipped."
      },
      card_configuration: {
        type: ["object", "null"],
        description: "Symbols used on cards. Null if trial was skipped.",
        properties: {
          top_cards_symbols: {
            type: "array",
            description: "Symbols of the top cards, starting at 0 for leftmost upper card and incrementing by 1 moving right.",
            items: {
              type: "object",
              properties: {
                top: {
                  type: "integer",
                  description: "Index of the top symbol within the card, 1-based."
                },
                bottom: {
                  type: "integer",
                  description: "Index of the bottom symbol within the card, 1-based."
                }
              }
            }
          },
          bottom_cards_symbols: {
            type: "array",
            description: "Symbols of the bottom cards, starting at 0 for leftmost card and incrementing by 1 moving right.",
            items: {
              type: "object",
              properties: {
                top: {
                  type: "integer",
                  description: "Index of the top symbol within the card, 1-based."
                },
                bottom: {
                  type: "integer",
                  description: "Index of the bottom symbol within the card, 1-based."
                }
              }
            }
          }
        }
      },
      response_time_duration_ms: {
        type: ["number", "null"],
        description: "Milliseconds from the beginning of the trial until a user taps a response. Null if trial was skipped."
      },
      user_response_index: {
        type: ["integer", "null"],
        description: "Index of user selected response, starting at 0 for leftmost card and incrementing by 1 moving right. Null if trial was skipped."
      },
      correct_response_index: {
        type: ["integer", "null"],
        description: "Index of correct response, starting at 0 for leftmost card and incrementing by 1 moving right. Null if trial was skipped."
      },
      quit_button_pressed: {
        type: "boolean",
        description: "Was the quit button pressed?"
      }
    };
    const translation = {
      configuration: {
        baseLocale: "en-US"
      },
      "en-US": {
        localeName: "English",
        INSTRUCTIONS_TITLE: "Symbol Search",
        SHORT_INSTRUCTIONS_TEXT_PAGE_1: "Goal: Touch the set on the bottom that is exactly the same as a set above, as fast and accurately as you can",
        INSTRUCTIONS_TEXT_PAGE_1: "You will see sets of symbols on the top and bottom of the screen.",
        INSTRUCTIONS_TEXT_PAGE_2: "When prompted, touch the set on the bottom that is exactly the same as a set above.",
        INSTRUCTIONS_TEXT_PAGE_3: "Please be as fast and accurate as you can.",
        START_BUTTON_TEXT: "START",
        NEXT_BUTTON_TEXT: "Next",
        BACK_BUTTON_TEXT: "Back",
        GET_READY_COUNTDOWN_TEXT: "GET READY!",
        WHICH_MATCHES_TEXT: "Which of these matches a pair above?",
        OR_TEXT: "or",
        TRIALS_COMPLETE_SCENE_TEXT: "This activity is complete.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      // cSpell:disable (for VS Code extension, Code Spell Checker)
      "es-MX": {
        localeName: "Espa\xF1ol",
        INSTRUCTIONS_TITLE: "B\xFAsqueda de S\xEDmbolos",
        // Short instructions need to be translated.
        //SHORT_INSTRUCTIONS_TEXT_PAGE_1: "",
        INSTRUCTIONS_TEXT_PAGE_1: "Ver\xE1s series de s\xEDmbolos en la parte de arriba y abajo de la pantalla.",
        INSTRUCTIONS_TEXT_PAGE_2: "Cuando se le solicite, toque el grupo en la parte de abajo que es exactamente igual a un grupo de arriba.",
        INSTRUCTIONS_TEXT_PAGE_3: "Por favor, sea tan r\xE1pido y preciso como pueda.",
        START_BUTTON_TEXT: "COMENZAR",
        NEXT_BUTTON_TEXT: "Siguiente",
        BACK_BUTTON_TEXT: "Atr\xE1s",
        GET_READY_COUNTDOWN_TEXT: "PREP\xC1RESE",
        WHICH_MATCHES_TEXT: "\xBFCu\xE1l de estos coincide con un par anterior?",
        OR_TEXT: "o",
        TRIALS_COMPLETE_SCENE_TEXT: "Esta actividad est\xE1 completa.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      "fr-FR": {
        localeName: "Fran\xE7ais",
        INSTRUCTIONS_TITLE: "Recherche de Symboles",
        // Short instructions need to be translated.
        // SHORT_INSTRUCTIONS_TEXT_PAGE_1: "",
        INSTRUCTIONS_TEXT_PAGE_1: "Vous verrez des ensembles de symboles en haut et en bas de l'\xE9cran.",
        INSTRUCTIONS_TEXT_PAGE_2: "Lorsqu'on vous le demandera, touchez le groupe en bas qui est exactement le m\xEAme qu'un groupe ci-dessus.",
        INSTRUCTIONS_TEXT_PAGE_3: "Soyez aussi rapide et pr\xE9cis que possible.",
        START_BUTTON_TEXT: "D\xC9MARRER",
        NEXT_BUTTON_TEXT: "Suivant",
        BACK_BUTTON_TEXT: "Retour",
        GET_READY_COUNTDOWN_TEXT: "PR\xC9PAREZ-VOUS",
        WHICH_MATCHES_TEXT: "Lequel de ces \xE9l\xE9ments correspond \xE0 une paire ci-dessus ?",
        OR_TEXT: "ou",
        TRIALS_COMPLETE_SCENE_TEXT: "Cette activit\xE9 est termin\xE9e.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      "de-DE": {
        localeName: "Deutsch",
        INSTRUCTIONS_TITLE: "Symbol-\xDCbereinstimmungs",
        // Short instructions need to be translated.
        // SHORT_INSTRUCTIONS_TEXT_PAGE_1: "",
        INSTRUCTIONS_TEXT_PAGE_1: "Oben und unten sehen Sie Symbolpaare.",
        INSTRUCTIONS_TEXT_PAGE_2: "Ihre Aufgabe wird es sein, auf dasjenige untere Paar zu tippen, welches mit einem der obigen Paare exakt \xFCbereinstimmt.",
        INSTRUCTIONS_TEXT_PAGE_3: "Versuchen Sie bitte, so schnell und korrekt wie m\xF6glich zu sein.",
        START_BUTTON_TEXT: "START",
        NEXT_BUTTON_TEXT: "Weiter",
        BACK_BUTTON_TEXT: "Vorherige",
        GET_READY_COUNTDOWN_TEXT: "BEREIT MACHEN",
        WHICH_MATCHES_TEXT: "Welches dieser beiden stimmt mit einem der obigen Paare \xFCberein?",
        OR_TEXT: "oder",
        TRIALS_COMPLETE_SCENE_TEXT: "Die Aufgabe ist beendet.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      "jp-JP": {
        localeName: "Japanese",
        localeSvg: {
          svgString: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 396.43 133.77"><path d="M0 9.22h93.45v121.25H83.37v-8.64H9.94v9.5H0zm83.37 9.79H9.94v41.33h73.44V19.01ZM9.94 112.03h73.44V69.84H9.94zM247.82 40.9h-52.56c12.38 25.63 33.98 49.39 57.46 60.62-2.45 2.02-5.62 5.76-7.34 8.5-22.61-12.24-43.06-35.28-56.3-61.34v47.23h28.8v9.79h-28.8v27.94H179V105.7h-29.23v-9.79H179V48.97c-13.68 26.06-34.27 48.67-56.02 61.34-1.73-2.45-4.75-6.05-6.91-7.92 22.61-11.66 44.21-35.85 56.74-61.49h-51.98v-9.79h58.18V0l12.96.72c-.14 1.01-.86 1.73-2.88 2.02v28.37h58.75v9.79Zm13.25-8.21v-8.21h52.85v8.21zm48.24 51.69v42.34h-33.12v6.77h-8.5v-49.1h41.62Zm-.43-39.74v7.92h-41.04v-7.92zm-41.04 27.79v-7.92h41.04v7.92zm40.61-67.39v7.92h-39.74V5.04zm-7.78 87.55h-24.48v25.92h24.48zm81.36-31.97h14.4v8.78h-82.08v-8.78h19.73c1.3-6.34 2.74-13.82 4.18-21.74h-15.84v-8.64h17.28c.86-5.47 1.73-11.09 2.59-16.13h-22.75V5.47h71.57v8.64h-39.46l-2.45 16.13h32.83zm-56.3 73.15V81.35h60.62v51.55h-9.36v-5.76h-42.05v6.62h-9.22Zm51.26-43.63h-42.05v28.08h42.05zm-4.32-51.26h-24.91c-1.3 7.78-2.74 15.41-4.03 21.74h28.94z"/></svg>',
          width: 65,
          height: 22
        },
        fontName: "noto-sans-japanese",
        INSTRUCTIONS_TITLE: "\u8A18\u53F7\u63A2\u3057",
        // Short instructions need to be translated.
        // SHORT_INSTRUCTIONS_TEXT_PAGE_1: "",
        INSTRUCTIONS_TEXT_PAGE_1: "\u753B\u9762\u306E\u4E0A\u90E8\u3068\u4E0B\u90E8\u306B\u8A18\u53F7\u306E\u30DA\u30A2\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002",
        INSTRUCTIONS_TEXT_PAGE_2: "\u6307\u793A\u304C\u3042\u3063\u305F\u3089\u3001\u4E0A\u306B\u8868\u793A\u3055\u308C\u3066\u3044\u308B\u30DA\u30A2\u3068\u307E\u3063\u305F\u304F\u540C\u3058\u30DA\u30A2\u3092\u4E0B\u304B\u3089\u9078\u3093\u3067\u30BF\u30C3\u30C1\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        INSTRUCTIONS_TEXT_PAGE_3: "\u3067\u304D\u308B\u3060\u3051\u901F\u304F\u3001\u305D\u3057\u3066\u6B63\u78BA\u306B\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002",
        START_BUTTON_TEXT: "\u30B9\u30BF\u30FC\u30C8",
        NEXT_BUTTON_TEXT: "\u6B21\u3078",
        BACK_BUTTON_TEXT: "\u623B\u308B",
        // Other locales use 50, but jp-JP uses 40 to fit on one line.
        GET_READY_COUNTDOWN_TEXT: { text: "\u6E96\u5099\u3057\u3066\u304F\u3060\u3055\u3044\uFF01", fontSize: 40 },
        WHICH_MATCHES_TEXT: "\u3069\u308C\u304C\u4E0A\u306E\u30DA\u30A2\u3068\u4E00\u81F4\u3057\u307E\u3059\u304B\uFF1F",
        OR_TEXT: "\u307E\u305F\u306F",
        TRIALS_COMPLETE_SCENE_TEXT: "\u3053\u306E\u30C6\u30B9\u30C8\u306F\u5B8C\u4E86\u3057\u307E\u3057\u305F\u3002",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "\u7D42\u4E86"
      }
      // cSpell:enable
    };
    const symbol_image_size = 160;
    const options = {
      name: "Symbol Search",
      /**
       * This id must match the property m2c2kit.assessmentId in package.json
       */
      id: "symbol-search",
      publishUuid: "400ad833-3037-4738-8ad8-c54e07c46896",
      version: "0.8.27 (d1ad307f)",
      moduleMetadata: { "name": "@m2c2kit/assessment-symbol-search", "version": "0.8.27", "dependencies": { "@m2c2kit/addons": "0.3.28", "@m2c2kit/core": "0.3.29" } },
      translation,
      shortDescription: "Symbol Search is a speeded continuous performance test of conjunctive feature search in which respondents identify matching symbol pairs as quickly and as accurately as they can.",
      longDescription: (
        // cSpell:disable
        'On each trial of the symbol search task, participants saw a row of three symbol pairs at the top of the screen and were presented with two symbol pairs at the bottom of the screen. Stimuli were presented until a response was provided there was an interval of 200 msec. between each response and the following stimulus. Participants decided, as quickly as possible, which of the two pairs presented at the bottom of the screen was among the pairs at the top of the screen (see Figure 1). Participants completed 12 trials of this task. The dependent variable was median response time of correct trials. Because this task requires speeded comparisons similar to standard laboratory tests, we reasoned it would be a viable indicator of perceptual speed. SOURCE: Sliwinski, Martin J., Jacqueline A. Mogle, Jinshil Hyun, Elizabeth Munoz, Joshua M. Smyth, and Richard B. Lipton. "Reliability and validity of ambulatory cognitive assessments." Assessment 25, no. 1 (2018): 14-30.'
      ),
      // cSpell:enable
      showFps: defaultParameters.show_fps.default,
      width: 400,
      height: 800,
      trialSchema: symbolSearchTrialSchema,
      parameters: defaultParameters,
      fonts: [
        {
          fontName: "roboto",
          url: "fonts/roboto/Roboto-Regular.ttf"
        },
        {
          fontName: "noto-sans-japanese",
          url: "fonts/noto-sans-japanese/NotoSansJP-Regular.ttf",
          lazy: true
        }
      ],
      bodyBackgroundColor: WebColors.White,
      images: [
        {
          imageName: "gameImage",
          height: 340,
          width: 255,
          url: "images/gameImage.png",
          localize: true
        },
        {
          imageName: "gameImageOutlinedCards",
          height: 340,
          width: 255,
          url: "images/gameImageOutlinedCards.png",
          localize: true
        },
        {
          imageName: "stopwatchImage",
          height: 319,
          width: 256,
          // license is public domain
          // https://commons.wikimedia.org/wiki/File:Dtjohnnymonkey-Stopwatch-no-shading.svg
          url: "images/stopwatch.svg"
        },
        {
          imageName: "ssintroImage",
          height: 186,
          width: 336,
          url: "images/ssintroImage.png"
        },
        // NOTE: names of symbols must be in form of ss-01, starting
        // at ss-01, not ss-00.
        {
          imageName: "ss-01",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-01.svg"
        },
        {
          imageName: "ss-02",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-02.svg"
        },
        {
          imageName: "ss-03",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-03.svg"
        },
        {
          imageName: "ss-04",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-04.svg"
        },
        {
          imageName: "ss-05",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-05.svg"
        },
        {
          imageName: "ss-06",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-06.svg"
        },
        {
          imageName: "ss-07",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-07.svg"
        },
        {
          imageName: "ss-08",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-08.svg"
        },
        {
          imageName: "ss-09",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-09.svg"
        },
        {
          imageName: "ss-10",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-10.svg"
        },
        {
          imageName: "ss-11",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-11.svg"
        },
        {
          imageName: "ss-12",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-12.svg"
        },
        {
          imageName: "ss-13",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-13.svg"
        },
        {
          imageName: "ss-14",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-14.svg"
        },
        {
          imageName: "ss-15",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-15.svg"
        },
        {
          imageName: "ss-16",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-16.svg"
        },
        {
          imageName: "ss-17",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-17.svg"
        },
        {
          imageName: "ss-18",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-18.svg"
        },
        {
          imageName: "ss-19",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-19.svg"
        },
        {
          imageName: "ss-20",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-20.svg"
        },
        {
          imageName: "ss-21",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-21.svg"
        },
        {
          imageName: "ss-22",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-22.svg"
        },
        {
          imageName: "ss-23",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-23.svg"
        },
        {
          imageName: "ss-24",
          height: symbol_image_size,
          width: symbol_image_size,
          url: "images/ss-24.svg"
        },
        {
          imageName: "circle-x",
          height: 32,
          width: 32,
          // the svg is from evericons and is licensed under CC0 1.0
          // Universal (Public Domain). see https://www.patreon.com/evericons
          url: "images/circle-x.svg"
        }
      ]
    };
    super(options);
  }
  async initialize() {
    await super.initialize();
    const game = this;
    const NUMBER_OF_SYMBOLS = 24;
    if (game.getParameter("show_quit_button")) {
      const quitSprite = new Sprite({
        imageName: "circle-x",
        position: { x: 380, y: 20 },
        isUserInteractionEnabled: true
      });
      game.addFreeNode(quitSprite);
      quitSprite.onTapDown((e) => {
        game.removeAllFreeNodes();
        e.handled = true;
        const blankScene = new Scene();
        game.addScene(blankScene);
        game.presentScene(blankScene);
        game.addTrialData("quit_button_pressed", true);
        game.trialComplete();
        game.cancel();
      });
    }
    let localePicker;
    if (game.getParameter("show_locale_picker")) {
      localePicker = new LocalePicker();
      game.addFreeNode(localePicker);
    }
    let instructionsScenes;
    const customInstructions = game.getParameter(
      "instructions"
    );
    if (customInstructions) {
      instructionsScenes = Instructions.create(customInstructions);
    } else {
      const sharedInstructionsOptions = {
        backgroundColor: WebColors.White,
        nextButtonBackgroundColor: WebColors.Black,
        backButtonBackgroundColor: WebColors.Black,
        nextSceneTransition: Transition.slide({
          direction: TransitionDirection.Left,
          duration: 500,
          easing: Easings.sinusoidalInOut
        }),
        backSceneTransition: Transition.slide({
          direction: TransitionDirection.Right,
          duration: 500,
          easing: Easings.sinusoidalInOut
        })
      };
      switch (game.getParameter("instruction_type")) {
        case "short": {
          instructionsScenes = Instructions.create({
            ...sharedInstructionsOptions,
            instructionScenes: [
              {
                title: "INSTRUCTIONS_TITLE",
                text: "SHORT_INSTRUCTIONS_TEXT_PAGE_1",
                imageName: "ssintroImage",
                imageAboveText: false,
                imageMarginTop: 12,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.25,
                nextButtonText: "START_BUTTON_TEXT",
                nextButtonBackgroundColor: WebColors.Green
              }
            ]
          });
          break;
        }
        case "long": {
          instructionsScenes = Instructions.create({
            ...sharedInstructionsOptions,
            instructionScenes: [
              {
                title: "INSTRUCTIONS_TITLE",
                text: "INSTRUCTIONS_TEXT_PAGE_1",
                imageName: "gameImage",
                imageAboveText: false,
                imageMarginTop: 12,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.25,
                nextButtonText: "NEXT_BUTTON_TEXT"
              },
              {
                title: "INSTRUCTIONS_TITLE",
                text: "INSTRUCTIONS_TEXT_PAGE_2",
                imageName: "gameImageOutlinedCards",
                imageAboveText: false,
                imageMarginTop: 12,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.25,
                nextButtonText: "NEXT_BUTTON_TEXT",
                backButtonText: "BACK_BUTTON_TEXT"
              },
              {
                title: "INSTRUCTIONS_TITLE",
                text: "INSTRUCTIONS_TEXT_PAGE_3",
                imageName: "stopwatchImage",
                imageAboveText: false,
                imageMarginTop: 48,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.25,
                nextButtonText: "START_BUTTON_TEXT",
                nextButtonBackgroundColor: WebColors.Green,
                backButtonText: "BACK_BUTTON_TEXT"
              }
            ]
          });
          break;
        }
        default: {
          throw new Error(
            `invalid value for instruction_type: ${game.getParameter(
              "instruction_type"
            )}`
          );
        }
      }
    }
    instructionsScenes[0].onAppear(() => {
      game.addTrialData(
        "activity_begin_iso8601_timestamp",
        this.beginIso8601Timestamp
      );
    });
    game.addScenes(instructionsScenes);
    const afterTrialSceneTransition = Transition.slide({
      direction: TransitionDirection.Left,
      duration: game.getParameter("interstimulus_interval_duration_ms"),
      easing: Easings.sinusoidalInOut
    });
    const countdownScene = new CountdownScene({
      milliseconds: game.getParameter("countdown_duration_ms"),
      text: "GET_READY_COUNTDOWN_TEXT",
      transitionDurationMilliseconds: game.getParameter(
        "after_countdown_transition_duration_ms"
      )
    });
    game.addScene(countdownScene);
    countdownScene.onSetup(() => {
      if (localePicker) {
        localePicker.hidden = true;
      }
    });
    const chooseCardScene = new Scene({
      name: "chooseCardScene",
      backgroundColor: [169, 201, 219, 1]
    });
    game.addScene(chooseCardScene);
    const bottomBackground = new Shape({
      rect: { size: { width: 400, height: 400 } },
      fillColor: [166, 177, 181, 1],
      position: { x: 200, y: 600 }
    });
    chooseCardScene.addChild(bottomBackground);
    const questionLabel = new Label({
      text: "WHICH_MATCHES_TEXT",
      fontSize: 22,
      preferredMaxLayoutWidth: 240
    });
    chooseCardScene.addChild(questionLabel);
    questionLabel.position = { x: 200, y: 460 };
    const orLabel = new Label({
      text: "OR_TEXT",
      fontSize: 22,
      preferredMaxLayoutWidth: 240
    });
    chooseCardScene.addChild(orLabel);
    orLabel.position = { x: 200, y: 580 };
    const trialConfigurations = [];
    const numberOfTrials = game.getParameter("number_of_trials");
    const lurePercent = game.getParameter("lure_percent");
    const leftCorrectPercent = game.getParameter(
      "left_correct_percent"
    );
    const numberOfTopCards = game.getParameter("number_of_top_pairs");
    const numberOfLureTrials = Math.round(numberOfTrials * lurePercent);
    const numberOfLeftCorrectTrials = Math.round(
      numberOfTrials * leftCorrectPercent
    );
    const lureTrialIndexes = RandomDraws.FromRangeWithoutReplacement(
      numberOfLureTrials,
      0,
      numberOfTrials - 1
    );
    const leftCorrectTrialIndexes = RandomDraws.FromRangeWithoutReplacement(
      numberOfLeftCorrectTrials,
      0,
      numberOfTrials - 1
    );
    let lurePositions;
    switch (game.getParameter("lure_position_on_card")) {
      case "top": {
        lurePositions = Array(numberOfLureTrials).fill(0);
        break;
      }
      case "bottom": {
        lurePositions = Array(numberOfLureTrials).fill(1);
        break;
      }
      case "either": {
        const numberOfTopLurePositions = Math.round(numberOfLureTrials / 2);
        lurePositions = [
          ...Array(numberOfTopLurePositions).fill(0),
          ...Array(numberOfLureTrials - numberOfTopLurePositions).fill(1)
        ];
        lurePositions = this.shuffleArray(lurePositions);
        break;
      }
      default: {
        throw new Error(
          `invalid value for lure_position_on_card: ${game.getParameter(
            "lure_position_on_card"
          )}`
        );
      }
    }
    for (let i = 0; i < numberOfTrials; i++) {
      const isLure = lureTrialIndexes.includes(i);
      const isLeftCorrect = leftCorrectTrialIndexes.includes(i);
      let symbols;
      if (isLure) {
        symbols = RandomDraws.FromRangeWithoutReplacement(
          numberOfTopCards * 2 + 1,
          1,
          NUMBER_OF_SYMBOLS
        );
      } else {
        symbols = RandomDraws.FromRangeWithoutReplacement(
          numberOfTopCards * 2 + 2,
          1,
          NUMBER_OF_SYMBOLS
        );
      }
      const topCards = new Array();
      for (let j = 0; j < numberOfTopCards; j++) {
        const card = {
          top: symbols[2 * j],
          bottom: symbols[2 * j + 1]
        };
        topCards.push(card);
      }
      const correctCardIndex = RandomDraws.FromRangeWithoutReplacement(
        1,
        0,
        numberOfTopCards - 1
      )[0];
      const correctCard = topCards[correctCardIndex];
      let incorrectCard;
      if (!isLure) {
        incorrectCard = {
          top: symbols[2 * numberOfTopCards],
          bottom: symbols[2 * numberOfTopCards + 1]
        };
      } else {
        const potentialLureSymbols = topCards.filter((c) => c != correctCard).map((c) => [c.top, c.bottom]).flat();
        const lureSymbolIndex = RandomDraws.FromRangeWithoutReplacement(
          1,
          0,
          potentialLureSymbols.length - 1
        )[0];
        const lureSymbol = potentialLureSymbols[lureSymbolIndex];
        const lurePosition = lurePositions.shift();
        if (lurePosition === void 0) {
          throw new Error("lurePositions is empty");
        }
        if (lurePosition === 0) {
          incorrectCard = {
            top: lureSymbol,
            bottom: symbols[2 * numberOfTopCards]
          };
        } else {
          incorrectCard = {
            top: symbols[2 * numberOfTopCards],
            bottom: lureSymbol
          };
        }
      }
      const trial = {
        top_cards_symbols: topCards,
        bottom_cards_symbols: isLeftCorrect ? [correctCard, incorrectCard] : [incorrectCard, correctCard],
        trial_type: isLure ? "lure" : "normal",
        correct_response_index: isLeftCorrect ? 0 : 1
      };
      trialConfigurations.push(trial);
    }
    chooseCardScene.onSetup(() => {
      orLabel.hidden = false;
      const trialConfiguration = trialConfigurations[game.trialIndex];
      const topCardsLength = trialConfiguration.top_cards_symbols.length;
      const bottomCardsLength = trialConfiguration.bottom_cards_symbols.length;
      let topInterCardMargin;
      switch (topCardsLength) {
        case 2:
        case 4: {
          topInterCardMargin = 200;
          break;
        }
        case 3: {
          topInterCardMargin = 100;
          break;
        }
        default: {
          throw new Error(
            "valid values for number_of_top_pairs are 2, 3, or 4 cards"
          );
        }
      }
      let topCardGrid;
      if (topCardsLength >= 1 && topCardsLength <= 3) {
        topCardGrid = new Grid({
          rows: 1,
          columns: topCardsLength,
          size: {
            width: 80 * topCardsLength + topInterCardMargin,
            height: 160
          },
          position: { x: 200, y: 200 },
          backgroundColor: WebColors.Transparent,
          gridLineColor: WebColors.Transparent
        });
      } else if (topCardsLength === 4) {
        topCardGrid = new Grid({
          rows: 2,
          columns: 2,
          size: {
            width: 80 * 2 + topInterCardMargin,
            height: 200 + topInterCardMargin
          },
          position: { x: 200, y: 200 },
          backgroundColor: WebColors.Transparent,
          gridLineColor: WebColors.Transparent
        });
      } else {
        throw new Error("invalid number_of_top_pairs");
      }
      chooseCardScene.addChild(topCardGrid);
      const bottomCardGrid = new Grid({
        rows: 1,
        columns: 2,
        size: { width: 80 * 2 + 200, height: 160 },
        position: { x: 200, y: 600 },
        backgroundColor: WebColors.Transparent,
        gridLineColor: WebColors.Transparent
      });
      chooseCardScene.addChild(bottomCardGrid);
      function createCardShape(topSymbolImageNumber, bottomSymbolImageNumber) {
        const card = new Shape({
          rect: { size: { width: 80, height: 160 } },
          fillColor: WebColors.White,
          strokeColor: WebColors.Black,
          lineWidth: 2
        });
        const topSymbol = new Sprite({
          imageName: "ss-" + topSymbolImageNumber.toString().padStart(2, "0"),
          position: { x: 0, y: -36 }
        });
        card.addChild(topSymbol);
        const bottomSymbol = new Sprite({
          imageName: "ss-" + bottomSymbolImageNumber.toString().padStart(2, "0"),
          position: { x: 0, y: 36 }
        });
        card.addChild(bottomSymbol);
        return card;
      }
      const topCards = new Array();
      for (let i = 0; i < topCardsLength; i++) {
        const card = createCardShape(
          trialConfiguration.top_cards_symbols[i].top,
          trialConfiguration.top_cards_symbols[i].bottom
        );
        topCards.push(card);
        if (topCardsLength === 4) {
          topCardGrid.addAtCell(card, Math.floor(i / 2), i % 2);
        } else {
          topCardGrid.addAtCell(card, 0, i);
        }
      }
      const bottomCards = new Array();
      for (let i = 0; i < bottomCardsLength; i++) {
        const card = createCardShape(
          trialConfiguration.bottom_cards_symbols[i].top,
          trialConfiguration.bottom_cards_symbols[i].bottom
        );
        card.userData = {
          index: i
        };
        bottomCards.push(card);
        bottomCardGrid.addAtCell(card, 0, i);
      }
      function setBottomCardsTappability(tappable) {
        if (tappable) {
          bottomCards.forEach((card) => card.isUserInteractionEnabled = true);
        } else {
          bottomCards.forEach(
            (card) => card.isUserInteractionEnabled = false
          );
        }
      }
      bottomCards.forEach(
        (card) => card.onTapDown(() => handleCardChoice(card))
      );
      function handleCardChoice(card) {
        bottomCardGrid.hidden = true;
        topCardGrid.hidden = true;
        orLabel.hidden = true;
        Timer.stop("rt");
        setBottomCardsTappability(false);
        const response_time = Timer.elapsed("rt");
        Timer.remove("rt");
        game.addTrialData(
          "trial_end_iso8601_timestamp",
          (/* @__PURE__ */ new Date()).toISOString()
        );
        game.addTrialData("trial_type", trialConfiguration.trial_type);
        game.addTrialData("response_time_duration_ms", response_time);
        game.addTrialData(
          "correct_response_index",
          trialConfiguration.correct_response_index
        );
        game.addTrialData(
          "user_response_index",
          card.userData.index
        );
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          correct_response_index,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          trial_type,
          ...remaining_trial_configuration
        } = trialConfiguration;
        game.addTrialData("card_configuration", remaining_trial_configuration);
        game.addTrialData("quit_button_pressed", false);
        game.addTrialData("trial_index", game.trialIndex);
        game.trialComplete();
        if (game.trialIndex < game.getParameter("number_of_trials")) {
          orLabel.hidden = true;
          if (game.getParameter("interstimulus_animation")) {
            game.presentScene(chooseCardScene, afterTrialSceneTransition);
          } else {
            chooseCardScene.run(
              Action.sequence([
                Action.wait({
                  duration: game.getParameter("interstimulus_interval_ms")
                }),
                Action.custom({
                  callback: () => {
                    game.presentScene(chooseCardScene);
                  }
                })
              ])
            );
          }
        } else {
          questionLabel.hidden = false;
          game.removeFreeNode("questionLabelFree");
          if (game.getParameter("show_trials_complete_scene")) {
            game.presentScene(doneScene, afterTrialSceneTransition);
          } else {
            game.end();
          }
        }
      }
      chooseCardScene.onAppear(
        () => {
          game.addTrialData(
            "activity_begin_iso8601_timestamp",
            this.beginIso8601Timestamp
          );
          game.addTrialData(
            "trial_begin_iso8601_timestamp",
            (/* @__PURE__ */ new Date()).toISOString()
          );
          if (!game.nodes.map((e) => e.name).includes("questionLabelFree")) {
            questionLabel.hidden = true;
            const questionLabelFree = new Label({
              name: "questionLabelFree",
              text: "WHICH_MATCHES_TEXT",
              fontSize: 22,
              preferredMaxLayoutWidth: 240
            });
            game.addFreeNode(questionLabelFree);
            questionLabelFree.position = { x: 200, y: 460 };
          }
          setBottomCardsTappability(true);
          Timer.startNew("rt");
        },
        { replaceExisting: true }
      );
    });
    const doneScene = new Scene();
    game.addScene(doneScene);
    const doneSceneText = new Label({
      text: "TRIALS_COMPLETE_SCENE_TEXT",
      position: { x: 200, y: 400 }
    });
    doneScene.addChild(doneSceneText);
    const okButton = new Button({
      text: "TRIALS_COMPLETE_SCENE_BUTTON_TEXT",
      position: { x: 200, y: 600 },
      backgroundColor: WebColors.Black
    });
    okButton.isUserInteractionEnabled = true;
    okButton.onTapDown(() => {
      okButton.isUserInteractionEnabled = false;
      doneScene.removeAllChildren();
      game.end();
    });
    doneScene.addChild(okButton);
    doneScene.onSetup(() => {
      game.removeAllFreeNodes();
    });
  }
  /**
   * Returns a new array with the items in random order.
   *
   * @param array - The array to shuffle
   * @returns A new array with the items in random order
   */
  shuffleArray(array) {
    const copy = [...array];
    const shuffled = [];
    while (copy.length > 0) {
      const index = Math.floor(Math.random() * copy.length);
      shuffled.push(copy.splice(index, 1)[0]);
    }
    return shuffled;
  }
}

export { SymbolSearch };
//# sourceMappingURL=index.js.map
