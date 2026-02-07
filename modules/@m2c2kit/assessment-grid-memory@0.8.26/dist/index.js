import { Game, Sprite, Scene, WebColors, LabelHorizontalAlignmentMode, Transition, Easings, TransitionDirection, Label, Action, RandomDraws, Shape, Timer } from '@m2c2kit/core';
import { LocalePicker, Instructions, CountdownScene, Grid, Button } from '@m2c2kit/addons';

class GridMemory extends Game {
  constructor() {
    const defaultParameters = {
      number_of_dots: {
        type: "integer",
        default: 3,
        description: "Number of dots to present."
      },
      preparation_duration_ms: {
        type: "number",
        default: 500,
        description: "How long the 'get ready' message before each trial is shown, milliseconds."
      },
      blank_grid_duration_ms: {
        type: "number",
        default: 500,
        description: "How long a blank grid is shown before the dots appear, milliseconds."
      },
      interference_duration_ms: {
        type: "number",
        default: 8e3,
        description: "How long the grid of interference targets is shown, milliseconds."
      },
      interference_transition_animation: {
        type: "boolean",
        default: true,
        description: "Should the transitions between dot presentation, interference, and recall be animated slide transitions?"
      },
      dot_present_duration_ms: {
        type: "number",
        default: 3e3,
        description: "How long the dots are shown, milliseconds."
      },
      number_of_interference_targets: {
        type: "integer",
        default: 5,
        description: "How many targets to show in the interference phase."
      },
      number_of_trials: {
        type: "integer",
        default: 4,
        description: "How many trials to run."
      },
      show_trials_complete_scene: {
        default: true,
        type: "boolean",
        description: "After the final trial, should a completion scene be shown? Otherwise, the game will immediately end."
      },
      instruction_type: {
        type: "string",
        default: "long",
        description: "Type of instructions to show, 'short' or 'long'."
      },
      instructions: {
        default: null,
        type: ["object", "null"],
        description: "When non-null, an InstructionsOptions object that will completely override the built-in instructions."
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
    const gridMemoryTrialSchema = {
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
        description: "ISO 8601 timestamp at the end of the trial (when user presses 'Done' after placing the three objects). Null if trial was skipped."
      },
      trial_index: {
        type: ["integer", "null"],
        description: "Index of the trial within this assessment, 0-based."
      },
      response_time_duration_ms: {
        type: ["number", "null"],
        description: "Milliseconds from the when the empty grid is shown in the recall phase until the user has placed all dots and taps the done button. Null if trial was skipped."
      },
      presented_cells: {
        type: ["array", "null"],
        description: "Randomly chosen locations of the dots presented to the user. Null if trial was skipped.",
        items: {
          type: "object",
          properties: {
            row: {
              type: "integer",
              description: "Row of the cell, 0-indexed."
            },
            column: {
              type: "integer",
              description: "Column of the cell, 0-indexed."
            }
          }
        }
      },
      selected_cells: {
        type: ["array", "null"],
        description: "User selected locations of the dots. Null if trial was skipped.",
        items: {
          type: "object",
          properties: {
            row: {
              type: "integer",
              description: "Row of the cell, 0-indexed."
            },
            column: {
              type: "integer",
              description: "Column of the cell, 0-indexed."
            }
          }
        }
      },
      user_dot_actions: {
        type: ["array", "null"],
        description: "Complete user dot actions: placement, removal, and done. Null if trial was skipped.",
        items: {
          type: "object",
          properties: {
            elapsed_duration_ms: {
              type: "number",
              description: "Duration, milliseconds, from when dot recall scene fully appeared until this user action."
            },
            action_type: {
              type: "string",
              enum: ["placed", "removed", "done"],
              description: "Was the action a dot placement, dot removal, or done button push?"
            },
            cell: {
              type: ["object", "null"],
              description: "Cell of user action; null if non-applicable (user action was done button push).",
              properties: {
                row: {
                  type: "integer",
                  description: "Row of the cell, 0-indexed."
                },
                column: {
                  type: "integer",
                  description: "Column of the cell, 0-indexed."
                },
                tap_x: {
                  type: "number",
                  description: "X coordinate of user's tap on the cell, relative to the cell."
                },
                tap_y: {
                  type: "number",
                  description: "Y coordinate of user's tap on the cell, relative to the cell."
                }
              }
            }
          }
        }
      },
      user_interference_actions: {
        type: ["array", "null"],
        description: "User actions tapping the interference targets. Null if trial was skipped.",
        items: {
          type: "object",
          properties: {
            elapsed_duration_ms: {
              type: "number",
              description: "Duration, milliseconds, from when interference scene fully appeared until this user action."
            },
            action_type: {
              type: "string",
              enum: ["on-target", "off-target"],
              description: "Was the action on an interference target or off?"
            },
            cell: {
              type: "object",
              description: "Cell of user interference action.",
              properties: {
                row: {
                  type: "integer",
                  description: "Row of the cell, 0-indexed."
                },
                column: {
                  type: "integer",
                  description: "Column of the cell, 0-indexed."
                },
                tap_x: {
                  type: "number",
                  description: "X coordinate of user's tap on the cell, relative to the cell."
                },
                tap_y: {
                  type: "number",
                  description: "Y coordinate of user's tap on the cell, relative to the cell."
                }
              }
            }
          }
        }
      },
      number_of_correct_dots: {
        type: ["integer", "null"],
        description: "Number of dots that were correctly placed. Null if trial was skipped."
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
        INSTRUCTIONS_TITLE: "Grid Memory",
        INSTRUCTIONS_TEXT_PAGE_1: "For this activity, try to remember the location of {{NUMBER_OF_DOTS}} dots.",
        INSTRUCTIONS_TEXT_PAGE_2: "Before placing the {{NUMBER_OF_DOTS}} dots in their location, you will also have to tap some Fs on the screen as quickly as you can.",
        INSTRUCTIONS_TEXT_PAGE_3: "Press START to begin!",
        GET_READY: "GET READY",
        REMEMBER_LOCATIONS: "Remember the dot locations!",
        TOUCH_INTERFERENCE: "Touch the F's!",
        DONE_BUTTON_TEXT: "Done",
        WHERE_WERE: "Where were the dots?",
        MUST_SELECT: "You must select all {{NUMBER_OF_DOTS}} locations!",
        START_BUTTON_TEXT: "START",
        NEXT_BUTTON_TEXT: "Next",
        BACK_BUTTON_TEXT: "Back",
        TRIALS_COMPLETE_SCENE_TEXT: "This activity is complete.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      // cSpell:disable (for VS Code extension, Code Spell Checker)
      "es-MX": {
        localeName: "Espa\xF1ol",
        INSTRUCTIONS_TITLE: "Memoria de Puntos",
        INSTRUCTIONS_TEXT_PAGE_1: "Para esta actividad, intenta recordar la ubicaci\xF3n de {{NUMBER_OF_DOTS}} puntos.",
        INSTRUCTIONS_TEXT_PAGE_2: "Antes de colocar los {{NUMBER_OF_DOTS}} puntos en su ubicaci\xF3n, tambi\xE9n tendr\xE1s que tocar las Fs en la pantalla lo m\xE1s r\xE1pido que puedas.",
        INSTRUCTIONS_TEXT_PAGE_3: "Presione COMENZAR para Empezar",
        GET_READY: "PREP\xC1RESE",
        REMEMBER_LOCATIONS: "Recuerda las ubicaciones de los puntos",
        TOUCH_INTERFERENCE: "\xA1Toca las Fs!",
        DONE_BUTTON_TEXT: "Listo",
        WHERE_WERE: "\xBFD\xF3nde estaban los puntos?",
        MUST_SELECT: "\xA1Debes seleccionar todas las {{NUMBER_OF_DOTS}} ubicaciones!",
        START_BUTTON_TEXT: "COMENZAR",
        NEXT_BUTTON_TEXT: "Siguiente",
        BACK_BUTTON_TEXT: "Atr\xE1s",
        TRIALS_COMPLETE_SCENE_TEXT: "Esta actividad est\xE1 completa.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      "de-DE": {
        localeName: "Deutsch",
        INSTRUCTIONS_TITLE: "Raster-Ged\xE4chtnis",
        INSTRUCTIONS_TEXT_PAGE_1: "In dieser Aufgabe werden {{NUMBER_OF_DOTS}} rote Punkte kurz in einem Raster erscheinen. Ihre Aufgabe ist es, sich ihre Standorte zu merken!",
        INSTRUCTIONS_TEXT_PAGE_2: "Als n\xE4chstes werden Sie eine Seite voll mit den Buchstaben E und F sehen, wie auf dem Beispiel unten. Ihre Aufgabe ist es, so schnell wie m\xF6glich auf alle F's zu tippen!",
        INSTRUCTIONS_TEXT_PAGE_3: "Sobald das leere Raster erscheint, platzieren Sie die Punkte dort, wo Sie sie zuvor gesehen haben, indem Sie auf die entsprechenden Stellen tippen.",
        GET_READY: "BEREIT MACHEN",
        REMEMBER_LOCATIONS: "Merken Sie sich die Punktpositionen!",
        TOUCH_INTERFERENCE: "Ber\xFChren die F's!",
        DONE_BUTTON_TEXT: "Fertig",
        WHERE_WERE: "Wo waren die Punkte?",
        MUST_SELECT: "Sie m\xFCssen alle {{NUMBER_OF_DOTS}} Punktpositionen ausw\xE4hlen!",
        START_BUTTON_TEXT: "START",
        NEXT_BUTTON_TEXT: "Weiter",
        BACK_BUTTON_TEXT: "Vorherige",
        TRIALS_COMPLETE_SCENE_TEXT: "Die Aufgabe ist beendet.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      }
      // cSpell:enable
    };
    const img_default_size = 200;
    const options = {
      name: "Grid Memory",
      /**
       * This id must match the property m2c2kit.assessmentId in package.json
       */
      id: "grid-memory",
      publishUuid: "50ee0af4-d013-408f-a7d1-c8d5c04da920",
      version: "0.8.26 (622f7241)",
      moduleMetadata: { "name": "@m2c2kit/assessment-grid-memory", "version": "0.8.26", "dependencies": { "@m2c2kit/addons": "0.3.27", "@m2c2kit/core": "0.3.28" } },
      translation,
      shortDescription: "Grid Memory is a visuospatial working memory task, with delayed free recall. After a brief exposure, and a short distraction phase, participants report the location of dots on a grid.",
      longDescription: 'Each trial of the dot memory task consisted of 3 phases: encoding,   distraction, and retrieval. During the encoding phase, the participant was   asked to remember the location three red dots appear on a 5 x 5 grid. After   a 3-second study period, the grid was removed and the distraction phase   began, during which the participant was required to locate and touch Fs among   an array of Es. After performing the distraction task for 8 seconds, and   empty 5 x 5 grid reappeared on the screen and participants were then   prompted to recall the locations of the 3 dots presented initially and press   a button labeled "Done" after entering their responses to complete the trial.   Participants completed 2 trials (encoding, distractor, retrieval) with a   1-second delay between trials. The dependent variable was an error score with   partial credit given based on the deviation from the correct positions. If   all dots were recalled in their correct location, the participant received a   score of zero. In the case of one or more retrieval errors, Euclidean distance   of the location of the incorrect dot to the correct grid location was   calculated, with higher scores indicating less accurate placement and poorer   performance (Siedlecki, 2007). The rationale for our use of this task as an   indicator of working memory has both an empirical and theoretical basis.   Previous research (Miyake, Friedman, Rettinger, Shah, & Hegarty, 2001) has   demonstrated that a similar dotmemory task loaded on a factor representing   working memory. The authors of this study reasoned that the spatial dot   memory task placed high demands on controlled attention\u2014a hallmark of working   memory tasks. Indeed, individual differences in working memory capacity arise   "in situations where information needs to be actively maintained or when a   controlled search of memory is required" (Unsworth & Engle, 2007, p. 123).   The ambulatory dot memory task satisfies this requirement by using an   interference task to prevent rehearsal and produce interference with encoded   locations, which creates the demand for active maintenance and controlled   retrieval of previously encoded location during the recall phase.   SOURCE: Sliwinski, Martin J., Jacqueline A. Mogle, Jinshil Hyun, Elizabeth   Munoz, Joshua M. Smyth, and Richard B. Lipton. "Reliability and validity of   ambulatory cognitive assessments." Assessment 25, no. 1 (2018): 14-30.',
      showFps: defaultParameters.show_fps.default,
      width: 400,
      height: 800,
      trialSchema: gridMemoryTrialSchema,
      parameters: defaultParameters,
      fonts: [
        {
          fontName: "roboto",
          url: "fonts/roboto/Roboto-Regular.ttf"
        }
      ],
      images: [
        {
          imageName: "grid",
          height: img_default_size,
          width: img_default_size,
          url: "images/dotmem1_grid.png"
        },
        {
          imageName: "fs",
          height: img_default_size,
          width: img_default_size,
          url: "images/dotmem2_fs.png"
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
    let presentedCells;
    let selectedCells;
    let userDotActions;
    let userInterferenceActions;
    const NUMBER_OF_DOTS = game.getParameter("number_of_dots");
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
      if (!this.i18n) {
        throw new Error("No i18n object found.");
      }
      instructionsScenes = Instructions.create({
        instructionScenes: [
          {
            title: "INSTRUCTIONS_TITLE",
            text: "INSTRUCTIONS_TEXT_PAGE_1",
            textInterpolation: { NUMBER_OF_DOTS: NUMBER_OF_DOTS.toString() },
            imageName: "grid",
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
            text: "INSTRUCTIONS_TEXT_PAGE_2",
            textInterpolation: { NUMBER_OF_DOTS: NUMBER_OF_DOTS.toString() },
            imageName: "fs",
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
            textFontSize: 24,
            titleFontSize: 30,
            textAlignmentMode: LabelHorizontalAlignmentMode.Center,
            nextButtonText: "START_BUTTON_TEXT",
            nextButtonBackgroundColor: WebColors.Green,
            backButtonText: "BACK_BUTTON_TEXT"
          }
        ]
      });
    }
    instructionsScenes[0].onAppear(() => {
      game.addTrialData(
        "activity_begin_iso8601_timestamp",
        this.beginIso8601Timestamp
      );
    });
    game.addScenes(instructionsScenes);
    let forward_into_interference_scene_transition;
    let back_from_interference_scene_transition;
    if (game.getParameter("interference_transition_animation")) {
      forward_into_interference_scene_transition = Transition.slide({
        direction: TransitionDirection.Left,
        duration: 500,
        easing: Easings.sinusoidalInOut
      });
      back_from_interference_scene_transition = Transition.slide({
        direction: TransitionDirection.Right,
        duration: 500,
        easing: Easings.sinusoidalInOut
      });
    }
    const countdownScene = new CountdownScene({
      milliseconds: 3e3,
      // No message, because we show "Get Ready" before each trial
      text: "",
      zeroDwellMilliseconds: 1e3,
      transition: Transition.none()
    });
    game.addScene(countdownScene);
    const preparationScene = new Scene();
    game.addScene(preparationScene);
    const getReadyMessage = new Label({
      text: "GET_READY",
      fontSize: 24,
      position: { x: 200, y: 400 }
    });
    preparationScene.addChild(getReadyMessage);
    preparationScene.onAppear(() => {
      preparationScene.run(
        Action.sequence([
          Action.custom({
            callback: () => {
              game.addTrialData(
                "activity_begin_iso8601_timestamp",
                this.beginIso8601Timestamp
              );
              game.addTrialData(
                "trial_begin_iso8601_timestamp",
                (/* @__PURE__ */ new Date()).toISOString()
              );
            }
          }),
          Action.wait({
            duration: game.getParameter("preparation_duration_ms")
          }),
          Action.custom({
            callback: () => {
              game.presentScene(dotPresentationScene);
            }
          })
        ])
      );
    });
    const dotPresentationScene = new Scene();
    game.addScene(dotPresentationScene);
    const rememberDotsMessage = new Label({
      text: "REMEMBER_LOCATIONS",
      fontSize: 24,
      position: { x: 200, y: 150 }
    });
    dotPresentationScene.addChild(rememberDotsMessage);
    const presentationGrid = new Grid({
      size: { width: 300, height: 300 },
      position: { x: 200, y: 400 },
      rows: 5,
      columns: 5,
      backgroundColor: WebColors.Silver,
      gridLineColor: WebColors.Black,
      gridLineWidth: 4
    });
    dotPresentationScene.addChild(presentationGrid);
    dotPresentationScene.onSetup(() => {
      rememberDotsMessage.hidden = true;
    });
    dotPresentationScene.onAppear(() => {
      rememberDotsMessage.hidden = false;
      dotPresentationScene.run(
        Action.sequence([
          Action.wait({
            duration: game.getParameter("blank_grid_duration_ms")
          }),
          Action.custom({
            callback: () => {
              presentedCells = RandomDraws.FromGridWithoutReplacement(
                NUMBER_OF_DOTS,
                5,
                5
              );
              for (let i = 0; i < NUMBER_OF_DOTS; i++) {
                const circle = new Shape({
                  circleOfRadius: 20,
                  fillColor: WebColors.Red,
                  strokeColor: WebColors.Black,
                  lineWidth: 2
                });
                presentationGrid.addAtCell(
                  circle,
                  presentedCells[i].row,
                  presentedCells[i].column
                );
              }
            }
          }),
          Action.wait({
            duration: game.getParameter("dot_present_duration_ms")
          }),
          Action.custom({
            callback: () => {
              presentationGrid.removeAllGridChildren();
              rememberDotsMessage.hidden = true;
              game.presentScene(
                interferenceScene,
                forward_into_interference_scene_transition
              );
            }
          })
        ])
      );
    });
    const interferenceScene = new Scene();
    game.addScene(interferenceScene);
    const touchTheFs = new Label({
      text: "TOUCH_INTERFERENCE",
      fontSize: 24,
      position: { x: 200, y: 100 }
    });
    interferenceScene.addChild(touchTheFs);
    const interferenceGrid = new Grid({
      size: { width: 300, height: 480 },
      position: { x: 200, y: 400 },
      rows: 8,
      columns: 5,
      backgroundColor: WebColors.Transparent,
      gridLineColor: WebColors.Transparent
    });
    interferenceScene.addChild(interferenceGrid);
    interferenceScene.onSetup(() => {
      userInterferenceActions = new Array();
      Timer.startNew("interferenceResponseTime");
      touchTheFs.hidden = true;
      ShowInterferenceActivity();
      interferenceScene.run(
        Action.sequence([
          Action.wait({
            duration: game.getParameter("interference_duration_ms")
          }),
          Action.custom({
            callback: () => {
              Timer.remove("interferenceResponseTime");
              game.presentScene(
                dotRecallScene,
                back_from_interference_scene_transition
              );
            }
          })
        ]),
        "advanceAfterInterference"
      );
      function ShowInterferenceActivity(slideGridIntoScene = false) {
        interferenceGrid.removeAllGridChildren();
        let tappedFCount = 0;
        const number_of_interference_targets = game.getParameter(
          "number_of_interference_targets"
        );
        const FCells = RandomDraws.FromGridWithoutReplacement(
          number_of_interference_targets,
          8,
          5
        );
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 5; j++) {
            const square = new Shape({
              rect: { size: { width: 59, height: 59 } },
              fillColor: WebColors.Transparent
            });
            let letterIsF = false;
            let letter;
            letter = new Label({ text: "E", fontSize: 50 });
            for (let k = 0; k < number_of_interference_targets; k++) {
              if (FCells[k].row === i && FCells[k].column === j) {
                letter = new Label({ text: "F", fontSize: 50 });
                letterIsF = true;
              }
            }
            square.userData = {};
            square.userData.row = i;
            square.userData.column = j;
            if (letterIsF) {
              square.userData.tapStatus = 0;
            } else {
              square.userData.tapStatus = -1;
            }
            square.isUserInteractionEnabled = true;
            square.onTapDown((e) => {
              if (square.userData.tapStatus === 0) {
                tappedFCount++;
                letter.text = "E";
                letter.run(
                  Action.sequence([
                    Action.scale({ scale: 1.25, duration: 125 }),
                    Action.scale({ scale: 1, duration: 125 })
                  ])
                );
                square.userData.tapStatus = 1;
                if (tappedFCount >= number_of_interference_targets) {
                  interferenceGrid.gridChildren.forEach((cell) => {
                    cell.node.isUserInteractionEnabled = false;
                  });
                  ShowInterferenceActivity(true);
                }
                if (Timer.exists("interferenceResponseTime")) {
                  userInterferenceActions.push({
                    elapsed_duration_ms: Timer.elapsed(
                      "interferenceResponseTime"
                    ),
                    action_type: "on-target",
                    cell: {
                      row: square.userData.row,
                      column: square.userData.column,
                      tap_x: e.point.x,
                      tap_y: e.point.y
                    }
                  });
                }
              } else {
                if (Timer.exists("interferenceResponseTime")) {
                  userInterferenceActions.push({
                    elapsed_duration_ms: Timer.elapsed(
                      "interferenceResponseTime"
                    ),
                    action_type: "off-target",
                    cell: {
                      row: square.userData.row,
                      column: square.userData.column,
                      tap_x: e.point.x,
                      tap_y: e.point.y
                    }
                  });
                }
              }
            });
            interferenceGrid.addAtCell(letter, i, j);
            interferenceGrid.addAtCell(square, i, j);
          }
        }
        if (slideGridIntoScene) {
          interferenceGrid.position = { x: 200, y: 1040 };
          interferenceGrid.run(
            Action.move({ point: { x: 200, y: 400 }, duration: 500 })
          );
        }
      }
    });
    interferenceScene.onAppear(() => {
      touchTheFs.hidden = false;
    });
    const dotRecallScene = new Scene();
    game.addScene(dotRecallScene);
    const whereDotsMessage = new Label({
      text: "WHERE_WERE",
      fontSize: 24,
      position: { x: 200, y: 150 }
    });
    dotRecallScene.addChild(whereDotsMessage);
    const recallGrid = new Grid({
      size: { width: 300, height: 300 },
      position: { x: 200, y: 400 },
      rows: 5,
      columns: 5,
      backgroundColor: WebColors.Silver,
      gridLineColor: WebColors.Black,
      gridLineWidth: 4
    });
    dotRecallScene.addChild(recallGrid);
    let tappedCellCount = 0;
    dotRecallScene.onSetup(() => {
      Timer.startNew("responseTime");
      recallGrid.removeAllGridChildren();
      recallDoneButton.hidden = true;
      whereDotsMessage.hidden = true;
      tappedCellCount = 0;
      selectedCells = new Array();
      userDotActions = new Array();
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const cell = new Shape({
            // this rectangle will be the hit area for the cell
            // it's transparent -- we use it only for its hit
            // area. Make it 59 x 59 (not 60 x 60) to avoid overlap
            // of hit area on the borders
            rect: { size: { width: 59, height: 59 } },
            fillColor: WebColors.Transparent
          });
          cell.userData = 0;
          cell.onTapDown((e) => {
            if (cell.userData === 0 && tappedCellCount < NUMBER_OF_DOTS) {
              const circle = new Shape({
                circleOfRadius: 20,
                fillColor: WebColors.Red,
                strokeColor: WebColors.Black,
                lineWidth: 2
              });
              cell.addChild(circle);
              cell.userData = 1;
              tappedCellCount++;
              selectedCells.push({ row: i, column: j });
              userDotActions.push({
                elapsed_duration_ms: Timer.elapsed("responseTime"),
                action_type: "placed",
                cell: {
                  row: i,
                  column: j,
                  tap_x: e.point.x,
                  tap_y: e.point.y
                }
              });
            } else if (cell.userData === 1) {
              cell.removeAllChildren();
              cell.userData = 0;
              tappedCellCount--;
              selectedCells = selectedCells.filter(
                (cell2) => !(cell2.row === i && cell2.column === j)
              );
              userDotActions.push({
                elapsed_duration_ms: Timer.elapsed("responseTime"),
                action_type: "removed",
                cell: {
                  row: i,
                  column: j,
                  tap_x: e.point.x,
                  tap_y: e.point.y
                }
              });
            }
          });
          cell.isUserInteractionEnabled = true;
          recallGrid.addAtCell(cell, i, j);
        }
      }
    });
    dotRecallScene.onAppear(() => {
      recallDoneButton.hidden = false;
      whereDotsMessage.hidden = false;
    });
    const recallDoneButton = new Button({
      text: "DONE_BUTTON_TEXT",
      position: { x: 200, y: 700 },
      size: { width: 250, height: 50 }
    });
    dotRecallScene.addChild(recallDoneButton);
    const youMustSelectAllMessage = new Label({
      text: "MUST_SELECT",
      interpolation: { NUMBER_OF_DOTS: NUMBER_OF_DOTS.toString() },
      position: { x: 200, y: 600 },
      hidden: true
    });
    dotRecallScene.addChild(youMustSelectAllMessage);
    recallDoneButton.isUserInteractionEnabled = true;
    recallDoneButton.onTapDown(() => {
      const doneButtonElapsedMs = Timer.elapsed("responseTime");
      userDotActions.push({
        elapsed_duration_ms: doneButtonElapsedMs,
        action_type: "done",
        cell: null
      });
      if (tappedCellCount < NUMBER_OF_DOTS) {
        youMustSelectAllMessage.run(
          Action.sequence([
            Action.custom({
              callback: () => {
                youMustSelectAllMessage.hidden = false;
              }
            }),
            Action.wait({ duration: 3e3 }),
            Action.custom({
              callback: () => {
                youMustSelectAllMessage.hidden = true;
              }
            })
          ])
        );
      } else {
        Timer.stop("responseTime");
        Timer.remove("responseTime");
        game.addTrialData(
          "trial_end_iso8601_timestamp",
          (/* @__PURE__ */ new Date()).toISOString()
        );
        game.addTrialData("response_time_duration_ms", doneButtonElapsedMs);
        game.addTrialData("presented_cells", presentedCells);
        game.addTrialData("selected_cells", selectedCells);
        game.addTrialData("user_dot_actions", userDotActions);
        game.addTrialData("user_interference_actions", userInterferenceActions);
        const cellsEqual = (cell1, cell2) => {
          return cell1.row === cell2.row && cell1.column === cell2.column;
        };
        const numberOfCorrectDots = selectedCells.map(
          (selectedCell) => presentedCells.some(
            (presentedCell) => cellsEqual(presentedCell, selectedCell)
          ) ? 1 : 0
        ).reduce((a, b) => a + b, 0);
        game.addTrialData("number_of_correct_dots", numberOfCorrectDots);
        game.addTrialData("quit_button_pressed", false);
        game.addTrialData("trial_index", game.trialIndex);
        game.trialComplete();
        if (game.trialIndex === game.getParameter("number_of_trials")) {
          const nextScreenTransition = Transition.slide({
            direction: TransitionDirection.Left,
            duration: 500,
            easing: Easings.sinusoidalInOut
          });
          if (game.getParameter("show_trials_complete_scene")) {
            game.presentScene(doneScene, nextScreenTransition);
          } else {
            game.end();
          }
        } else {
          game.presentScene(preparationScene);
        }
      }
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
      position: { x: 200, y: 600 }
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
}

export { GridMemory };
//# sourceMappingURL=index.js.map
