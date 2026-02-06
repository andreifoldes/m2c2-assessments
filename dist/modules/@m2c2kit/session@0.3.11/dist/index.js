import { ActivityType, M2c2KitHelpers, M2EventType, Timer, Uuid, Constants } from '@m2c2kit/core';

class DomHelper {
  /**
   * Specifies the HTML element in which to render the m2c2kit activities.
   *
   * @param rootElement - the element to add the survey div and canvas div to
   */
  static createRoot(rootElement) {
    const surveyDiv = document.createElement("div");
    surveyDiv.setAttribute("id", "m2c2kit-survey-div");
    rootElement.appendChild(surveyDiv);
    const canvasDiv = document.createElement("div");
    canvasDiv.setAttribute("id", "m2c2kit-canvas-div");
    canvasDiv.className = "m2c2kit-full-viewport m2c2kit-flex-container";
    const canvas = document.createElement("canvas");
    canvas.setAttribute("id", "m2c2kit-canvas");
    canvas.className = "m2c2kit-full-viewport";
    canvasDiv.appendChild(canvas);
    rootElement.appendChild(canvasDiv);
  }
  /**
   * Adds a style sheet to the head of the document.
   *
   * @param css - text of the CSS
   */
  static addStyleSheet(css) {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = css;
    document.head.appendChild(styleSheet);
  }
  /**
   * Add elements to hide the canvas and show a spinner.
   */
  static addLoadingElements() {
    const canvasDiv = document.getElementById("m2c2kit-canvas-div");
    if (!canvasDiv) {
      throw new Error("Could not find container element");
    }
    let overlayDiv = document.getElementById("m2c2kit-canvas-overlay-div");
    if (!overlayDiv) {
      overlayDiv = document.createElement("div");
      overlayDiv.setAttribute("id", "m2c2kit-canvas-overlay-div");
      overlayDiv.className = "m2c2kit-canvas-overlay m2c2kit-display-none";
      const spinnerDiv = document.createElement("div");
      spinnerDiv.setAttribute("id", "m2c2kit-spinner-div");
      spinnerDiv.className = "m2c2kit-spinner m2c2kit-display-none";
      canvasDiv.appendChild(overlayDiv);
      canvasDiv.appendChild(spinnerDiv);
    }
  }
  /**
   * Depending on the type of activity, set the visibility of the survey div
   * and canvas div.
   *
   * @param activity - the activity to configure the DOM for
   */
  static configureDomForActivity(activity) {
    if (activity.type == ActivityType.Game) {
      this.setCanvasDivVisibility(true);
      this.setSurveyDivVisibility(false);
    }
    if (activity.type == ActivityType.Survey) {
      this.setCanvasDivVisibility(false);
      this.setSurveyDivVisibility(true);
      DomHelper.setBusyAnimationVisibility(false);
      DomHelper.setCanvasOverlayVisibility(false);
    }
  }
  /**
   * Hide the canvas div and survey div.
   */
  static hideM2c2Elements() {
    this.setCanvasDivVisibility(false);
    this.setSurveyDivVisibility(false);
  }
  /**
   * Shows or hides the canvas overlay.
   *
   * @param visible - true if the canvas overlay should be visible
   */
  static setCanvasOverlayVisibility(visible) {
    const div = document.getElementById("m2c2kit-canvas-overlay-div");
    if (div) {
      if (visible) {
        div.classList.remove("m2c2kit-display-none");
      } else {
        div.classList.add("m2c2kit-display-none");
      }
    }
  }
  /**
   * Shows or hides the busy animation.
   *
   * @param visible - true if the busy animation should be visible
   */
  static setBusyAnimationVisibility(visible) {
    const div = document.getElementById("m2c2kit-spinner-div");
    if (div) {
      if (visible) {
        div.classList.remove("m2c2kit-display-none");
      } else {
        div.classList.add("m2c2kit-display-none");
      }
    }
  }
  /**
   * Shows or hides the survey div.
   *
   * @param visible - true if the survey div should be visible
   */
  static setSurveyDivVisibility(visible) {
    const surveyDiv = document.getElementById("m2c2kit-survey-div");
    if (surveyDiv && visible) {
      surveyDiv.classList.remove("m2c2kit-display-none");
      surveyDiv.classList.add("m2c2kit-display-block");
    }
    if (surveyDiv && !visible) {
      surveyDiv.classList.add("m2c2kit-display-none");
      surveyDiv.classList.remove("m2c2kit-display-block");
    }
  }
  /**
   * Shows or hides the canvas div.
   *
   * @param visible - true if the canvas div should be visible
   */
  static setCanvasDivVisibility(visible) {
    const canvasDiv = document.getElementById("m2c2kit-canvas-div");
    if (canvasDiv && visible) {
      canvasDiv.classList.remove("m2c2kit-display-none");
      canvasDiv.classList.add("m2c2kit-flex-container");
    }
    if (canvasDiv && !visible) {
      canvasDiv.classList.add("m2c2kit-display-none");
      canvasDiv.classList.remove("m2c2kit-flex-container");
    }
  }
}

const SessionEventType = {
  SessionInitialize: "SessionInitialize",
  SessionStart: "SessionStart",
  SessionEnd: "SessionEnd"
};

const m2c2kitCss = `.m2c2kit-background-color {
  background: white;
}

.m2c2kit-no-margin {
  margin: 0;
}

.m2c2kit-display-none {
  display: none;
}

.m2c2kit-display-block {
  display: block;
}

.m2c2kit-full-viewport {
  height: 100vh;
  width: 100vw;
}

.m2c2kit-flex-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.m2c2kit-canvas-overlay {
  background-color: white;
  width: 100vw;
  height: 100vh;
  position: absolute
}

.m2c2kit-spinner {
  border: 16px solid #f3f3f3;
  border-radius: 50%;
  border-top: 16px solid #212529;
  width: 120px;
  height: 120px;
  /* Safari */
  -webkit-animation: m2c2kit-loader-spin 1.5s linear infinite;
  animation: m2c2kit-loader-spin 1.5s linear infinite;
  position: absolute;
}

#m2c2kit-time-stepping-div {
  position: fixed;
  top: 4px;
  left: 4px
}

/* Safari */
@-webkit-keyframes m2c2kit-loader-spin {
  0% {
    -webkit-transform: rotate(0deg);
  }

  100% {
    -webkit-transform: rotate(360deg);
  }
}

@keyframes m2c2kit-loader-spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}`;

class Session {
  /**
   * A Session contains one or more activities. The session manages the start
   * and stop of activities, and advancement to next activity
   *
   * @param options
   */
  constructor(options) {
    this.eventListeners = new Array();
    this.sessionDictionary = /* @__PURE__ */ new Map();
    this.initialized = false;
    this.options = options;
    window.m2c2kitSession = this;
    this.addDebuggingTools();
  }
  /**
   * Adds debugging tools to the session.
   *
   * @remarks These tools can be added by appending query parameters to the
   * URL or by setting game parameters via the Game.SetParameters() method.
   */
  addDebuggingTools() {
    if (/eruda=true/.test(window.location.href)) {
      M2c2KitHelpers.loadEruda();
    }
    const urlParams = new URLSearchParams(window.location.search);
    const scriptsParam = urlParams.get("scripts");
    if (scriptsParam) {
      try {
        const scripts = JSON.parse(
          decodeURIComponent(scriptsParam)
        );
        M2c2KitHelpers.loadScriptUrls(scripts);
      } catch {
        console.log(
          `Error parsing "scripts" parameter. "scripts" must be an array of URL strings, and it is recommended to be URI encoded.`
        );
      }
    }
  }
  /**
   * Executes a callback when the session initializes.
   *
   * @param callback - function to execute.
   * @param options - options for the callback.
   */
  onInitialize(callback, options) {
    this.addEventListener(
      SessionEventType.SessionInitialize,
      callback,
      options
    );
  }
  /**
   * Executes a callback when the session starts.
   *
   * @param callback - function to execute.
   * @param options - options for the callback.
   */
  onStart(callback, options) {
    this.addEventListener(SessionEventType.SessionStart, callback, options);
  }
  /**
   * Executes a callback when the session ends.
   *
   * @param callback - function to execute.
   * @param options - options for the callback.
   */
  onEnd(callback, options) {
    this.addEventListener(SessionEventType.SessionEnd, callback, options);
  }
  /**
   * Executes a callback when any activity in the session generates data.
   *
   * @param callback - function to execute.
   * @param options - options for the callback.
   */
  onActivityData(callback, options) {
    this.addEventListener(M2EventType.ActivityData, callback, options);
  }
  addEventListener(type, callback, options) {
    const eventListener = {
      type,
      callback,
      key: options?.key
    };
    if (options?.replaceExisting) {
      this.eventListeners = this.eventListeners.filter(
        (listener) => !(listener.type === eventListener.type)
      );
    }
    this.eventListeners.push(
      eventListener
    );
  }
  raiseEventOnListeners(event, extra) {
    if (extra) {
      event = {
        ...event,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...extra
      };
    }
    this.eventListeners.filter((listener) => listener.type === event.type).forEach((listener) => {
      listener.callback(event);
    });
  }
  async sessionActivityStartHandler(event) {
    const activityType = event.target.type === ActivityType.Game ? "game" : "survey";
    console.log(`\u{1F7E2} started activity (${activityType}) ${event.target.name}`);
  }
  async sessionActivityCancelHandler(event) {
    const activityType = event.target.type === ActivityType.Game ? "game" : "survey";
    console.log(`\u{1F6AB} canceled activity (${activityType}) ${event.target.name}`);
    if (this.nextActivity && this.options.autoGoToNextActivity !== false) {
      await this.goToNextActivity();
      return;
    }
    if (!this.nextActivity && this.options.autoEndAfterLastActivity !== false) {
      this.end();
    }
  }
  async sessionActivityEndHandler(event) {
    const activityType = event.target.type === ActivityType.Game ? "game" : "survey";
    console.log(`\u{1F534} ended activity (${activityType}) ${event.target.name}`);
    if (this.nextActivity && this.options.autoGoToNextActivity !== false) {
      await this.goToNextActivity();
      return;
    }
    if (!this.nextActivity && this.options.autoEndAfterLastActivity !== false) {
      this.end();
    }
  }
  async sessionActivityLifecycleHandler(event) {
    if (event.type === M2EventType.ActivityStart) {
      await this.sessionActivityStartHandler(event);
      return;
    }
    if (event.type === M2EventType.ActivityCancel) {
      await this.sessionActivityCancelHandler(event);
      return;
    }
    if (event.type === M2EventType.ActivityEnd) {
      await this.sessionActivityEndHandler(event);
      return;
    }
    throw new Error("unknown activity lifecycle event type");
  }
  activityResultsEventHandler(event) {
    this.raiseEventOnListeners(event);
  }
  /**
   * Asynchronously initializes the m2c2kit engine and loads assets
   *
   * @deprecated Use Session.initialize() instead.
   */
  async init() {
    console.warn(
      `The init() method of Session is deprecated. Use initialize() instead.`
    );
    return this.initialize();
  }
  /**
   * Check if the Activity uses the deprecated init() method.
   *
   * @remarks Activity.init() is deprecated and should be replaced with
   * Activity.initialize().
   *
   * @param activity
   * @returns true if the activity defines its own init() method, false otherwise.
   */
  activityUsesDeprecatedInit(activity) {
    if (activity.type === ActivityType.Survey) {
      return false;
    }
    const activityPrototype = Object.getPrototypeOf(activity);
    const gamePrototype = Object.getPrototypeOf(activityPrototype);
    return activityPrototype?.init !== gamePrototype?.init;
  }
  /**
   * Asynchronously initializes the m2c2kit engine and loads assets
   */
  async initialize() {
    Timer.startNew("sessionInitialize");
    if (this.options.sessionUuid) {
      this.uuid = this.options.sessionUuid;
    } else {
      this.uuid = Uuid.generate();
    }
    for (const activity of this.options.activities) {
      if (this.options.activities.filter((a) => a === activity).length > 1) {
        throw new Error(
          `error in SessionOptions.activities: an instance of the activity named "${activity.name}" has been added more than once to the session. If you want to repeat the same activity, create separate instances of it.`
        );
      }
      activity.sessionUuid = this.uuid;
      if (this.options.activityCallbacks?.onActivityLifecycle) {
        activity.onStart(this.options.activityCallbacks.onActivityLifecycle);
        activity.onCancel(this.options.activityCallbacks.onActivityLifecycle);
        activity.onEnd(this.options.activityCallbacks.onActivityLifecycle);
      }
      if (this.options.activityCallbacks?.onActivityResults) {
        activity.onData(this.options.activityCallbacks.onActivityResults);
      }
      if (activity.type === ActivityType.Game) {
        const game = activity;
        game.onWarmupStart(() => {
          DomHelper.setCanvasOverlayVisibility(true);
        });
        game.onWarmupEnd(() => {
          DomHelper.setCanvasOverlayVisibility(false);
          DomHelper.setBusyAnimationVisibility(false);
        });
      }
    }
    const sessionInitializeEvent = {
      target: this,
      type: SessionEventType.SessionInitialize,
      ...M2c2KitHelpers.createTimestamps()
    };
    this.raiseEventOnListeners(sessionInitializeEvent);
    const rootId = this.options.rootElementId ?? Constants.DEFAULT_ROOT_ELEMENT_ID;
    const root = document.getElementById(rootId);
    if (!root) {
      throw new Error(
        `Session.initialize(): root element with id ${rootId} not found. The index.html should have: <div id="${rootId}"></div>.`
      );
    }
    DomHelper.createRoot(root);
    DomHelper.addStyleSheet(this.options.styleSheet ?? m2c2kitCss);
    DomHelper.addLoadingElements();
    DomHelper.setBusyAnimationVisibility(true);
    DomHelper.setCanvasOverlayVisibility(true);
    this.dataStores = this.options.dataStores;
    if (this.dataStores?.length === 0) {
      throw new Error(
        "Session.initialize(): dataStores must be undefined or a non-zero array of datastores."
      );
    }
    await this.getSharedAssets(this.options.activities);
    await Promise.all(
      this.options.activities.map((activity) => {
        activity.studyId = this.options.studyId;
        activity.studyUuid = this.options.studyUuid;
        activity.dataStores = this.dataStores;
        activity.onStart(this.sessionActivityLifecycleHandler.bind(this));
        activity.onCancel(this.sessionActivityLifecycleHandler.bind(this));
        activity.onEnd(this.sessionActivityLifecycleHandler.bind(this));
        activity.onData((event) => {
          this.activityResultsEventHandler(event);
        });
        if (this.activityUsesDeprecatedInit(activity)) {
          console.warn(
            `game ${activity.id}: Activity.init() is deprecated. In the assessment class that extends Game, use Activity.initialize() instead:
  async initialize() {
    await super.initialize();
    ...
  }
`
          );
          return activity.init();
        }
        return activity.initialize();
      })
    );
    console.log(
      `\u26AA Session.initialize() took ${Timer.elapsed(
        "sessionInitialize"
      ).toFixed(0)} ms`
    );
    Timer.remove("sessionInitialize");
    this.initialized = true;
    if (this.options.autoStartAfterInit !== false) {
      await this.start();
    }
  }
  /**
   * Asynchronously loads fonts and wasm binaries that are common across two
   * or more game activities and shares them with the games.
   *
   * @param activities - array of activities
   */
  async getSharedAssets(activities) {
    const games = activities.filter(
      (activity) => activity.type === ActivityType.Game && activity.options.shareAssets !== false
    );
    if (games.length > 0) {
      const manifest = await games[0].loadManifest();
      games.forEach((game) => {
        game.manifest = manifest;
      });
      const wasmPromises = this.initializeSharedCanvasKit(games);
      const fontPromises = this.fetchSharedFontData(games);
      await Promise.all([...wasmPromises, ...fontPromises]);
    }
  }
  initializeSharedCanvasKit(games) {
    const sharedWasmVersions = this.getDuplicates(
      games.map((game) => game.canvasKitWasmVersion)
    );
    const wasmAssets = games.map((game) => {
      return {
        game,
        version: game.canvasKitWasmVersion,
        data: void 0
      };
    });
    const wasmPromises = sharedWasmVersions.map(async (sharedWasmVersion) => {
      const wasmAsset = wasmAssets.filter(
        (wasm) => wasm.version === sharedWasmVersion
      )[0];
      const game = wasmAsset.game;
      const baseUrls = await game.resolveGameBaseUrls(game);
      const canvasKitWasmFilename = `canvaskit-${game.canvasKitWasmVersion}.wasm`;
      const manifestCanvasKitWasmUrl = M2c2KitHelpers.getUrlFromManifest(
        game,
        `${baseUrls.canvasKitWasm}/${canvasKitWasmFilename}`
      );
      console.log(`\u26AA sharing ${canvasKitWasmFilename} within session`);
      const canvasKit = await game.loadCanvasKit(manifestCanvasKitWasmUrl);
      games.forEach((game2) => {
        if (game2.canvasKitWasmVersion === sharedWasmVersion) {
          game2.canvasKit = canvasKit;
        }
      });
    });
    return wasmPromises;
  }
  fetchSharedFontData(games) {
    const fontFiles = games.flatMap(
      (game) => game.options.fonts?.filter((f) => f.lazy !== true) ?? []
    ).map((fontAsset) => this.getFilenameFromUrl(fontAsset.url));
    const sharedFontFiles = this.getDuplicates(fontFiles);
    const allGameFonts = games.flatMap((game) => {
      return (game.options.fonts ?? []).map((fontAsset) => {
        return {
          game,
          fontAsset,
          filename: this.getFilenameFromUrl(fontAsset.url),
          data: void 0
        };
      });
    });
    const fontPromises = sharedFontFiles.map(async (sharedFontFile) => {
      const gameFontAsset = allGameFonts.filter(
        (gameFont) => gameFont.filename === sharedFontFile
      )[0];
      const game = gameFontAsset.game;
      const baseUrls = await game.resolveGameBaseUrls(game);
      const fontUrl = M2c2KitHelpers.getUrlFromManifest(
        game,
        `${baseUrls.assets}/${gameFontAsset.fontAsset.url}`
      );
      console.log(
        `\u26AA sharing ${this.getFilenameFromUrl(fontUrl)} within session`
      );
      const response = await fetch(fontUrl);
      const fontData = await response.arrayBuffer();
      games.flatMap((game2) => game2.options.fonts ?? []).forEach((fontAsset) => {
        if (this.getFilenameFromUrl(fontAsset.url) === sharedFontFile) {
          fontAsset.sharedFont = {
            url: fontUrl,
            data: fontData
          };
        }
      });
    });
    return fontPromises;
  }
  /**
   * Waits for the session to be initialized.
   *
   * @remarks Session.initialize() is asynchronous, and it should be awaited
   * so that the session is fully initialized before calling Session.start().
   * If it is not awaited (or it cannot be awaited because the target
   * environment does not support top-level await), this function ensures that
   * the session has been initialized.
   */
  async waitForSessionInitialization() {
    while (!this.initialized) {
      await new Promise(
        (resolve) => setTimeout(
          resolve,
          Constants.SESSION_INITIALIZATION_POLLING_INTERVAL_MS
        )
      );
    }
  }
  /**
   * Starts the session and starts the first activity.
   */
  async start() {
    await this.waitForSessionInitialization();
    console.log("\u{1F7E2} started session");
    const sessionStartEvent = {
      target: this,
      type: SessionEventType.SessionStart,
      ...M2c2KitHelpers.createTimestamps()
    };
    this.raiseEventOnListeners(sessionStartEvent);
    this.currentActivity = this.options.activities.find(Boolean);
    if (this.currentActivity) {
      DomHelper.configureDomForActivity(this.currentActivity);
      await this.currentActivity.start();
    } else {
      console.warn("no activities in session.");
      this.end();
    }
  }
  /**
   * Declares the session ended and sends callback.
   */
  end() {
    console.log("\u{1F534} ended session");
    DomHelper.hideM2c2Elements();
    this.stop();
    const sessionEndEvent = {
      target: this,
      type: SessionEventType.SessionEnd,
      ...M2c2KitHelpers.createTimestamps()
    };
    this.raiseEventOnListeners(sessionEndEvent);
  }
  stop() {
    this.dispose();
  }
  /**
   * Frees up resources that were allocated to run the session.
   *
   * @remarks This will be done automatically by the m2c2kit library;
   * the end-user must not call this.
   */
  dispose() {
  }
  /**
   * Stops the current activity and goes to the activity with the provided id.
   *
   * @param options
   */
  async goToActivity(options) {
    const nextActivity = this.options.activities.filter((activity) => activity.id === options.id).find(Boolean);
    if (!nextActivity) {
      throw new Error(
        `Error in goToActivity(): Session does not contain an activity with id ${options.id}.`
      );
    }
    if (this.currentActivity) {
      this.currentActivity.stop();
    }
    const currentActivityOldObject = nextActivity;
    const activityFactoryFunction = currentActivityOldObject.constructor.bind.apply(
      currentActivityOldObject.constructor,
      [null]
    );
    this.currentActivity = new activityFactoryFunction();
    const indexOfCurrentActivity = this.options.activities.indexOf(
      currentActivityOldObject
    );
    this.options.activities[indexOfCurrentActivity] = this.currentActivity;
    DomHelper.configureDomForActivity(this.currentActivity);
    this.currentActivity.dataStores = this.dataStores;
    if (currentActivityOldObject.additionalParameters) {
      this.currentActivity.setParameters(
        currentActivityOldObject.additionalParameters
      );
    }
    await this.currentActivity.initialize();
    await this.currentActivity.start();
  }
  /**
   * Stops the current activity and advances to next activity in the session.
   * If there is no activity after the current activity, throws error.
   */
  async goToNextActivity() {
    if (!this.currentActivity) {
      throw new Error("error in advanceToNextActivity(): no current activity");
    }
    if (!this.nextActivity) {
      throw new Error("error in advanceToNextActivity(): no next activity");
    }
    this.currentActivity.stop();
    this.currentActivity = this.nextActivity;
    DomHelper.configureDomForActivity(this.currentActivity);
    await this.currentActivity.start();
  }
  /**
   * Stops the current activity and advances to next activity in the session.
   * If there is no activity after the current activity, throws error.
   *
   * @deprecated Use goToNextActivity() instead.
   */
  async advanceToNextActivity() {
    await this.goToNextActivity();
  }
  /**
   * Gets the next activity after the current one, or undefined if
   * this is the last activity.
   */
  get nextActivity() {
    if (!this.currentActivity) {
      throw new Error("error in get nextActivity(): no current activity");
    }
    const index = this.options.activities.indexOf(this.currentActivity);
    if (index === this.options.activities.length - 1) {
      return void 0;
    }
    const currentActivityIndex = this.options.activities.indexOf(
      this.currentActivity
    );
    return this.options.activities[currentActivityIndex + 1];
  }
  /**
   * Saves an item to the session's key-value dictionary.
   *
   * @remarks The session dictionary is not persisted. It is available only
   * during the actively running session. It is useful for storing temporary
   * data to coordinate between activities.
   *
   * @param key - item key
   * @param value - item value
   */
  dictionarySetItem(key, value) {
    this.sessionDictionary.set(key, value);
  }
  /**
   * Gets an item value from the session's key-value dictionary.
   *
   * @remarks The session dictionary is not persisted. It is available only
   * during the actively running session. It is useful for storing temporary
   * data to coordinate between activities.
   *
   * @param key - item key
   * @returns value of the item
   */
  dictionaryGetItem(key) {
    return this.sessionDictionary.get(key);
  }
  /**
   * Deletes an item value from the session's key-value dictionary.
   *
   * @remarks The session dictionary is not persisted. It is available only
   * during the actively running session. It is useful for storing temporary
   * data to coordinate between activities.
   *
   * @param key - item key
   * @returns true if the item was deleted, false if it did not exist
   */
  dictionaryDeleteItem(key) {
    return this.sessionDictionary.delete(key);
  }
  /**
   * Determines if a key exists in the activity's key-value dictionary.
   *
   * @remarks The session dictionary is not persisted. It is available only
   * during the actively running session. It is useful for storing temporary
   * data to coordinate between activities.
   *
   * @param key - item key
   * @returns true if the key exists, false otherwise
   */
  dictionaryItemExists(key) {
    return this.sessionDictionary.has(key);
  }
  /**
   * Returns the filename from a url.
   *
   * @param url - url to parse
   * @returns filename
   */
  getFilenameFromUrl(url) {
    return url.substring(url.lastIndexOf("/") + 1);
  }
  /**
   * Returns the duplicated strings in an array.
   *
   * @param s - array of strings
   * @returns array of duplicated strings
   */
  getDuplicates(s) {
    const count = {};
    const duplicates = [];
    for (const str of s) {
      count[str] = (count[str] || 0) + 1;
      if (count[str] === 2) {
        duplicates.push(str);
      }
    }
    return duplicates;
  }
  get uuid() {
    if (!this._uuid) {
      throw new Error("Session.uuid is undefined.");
    }
    return this._uuid;
  }
  set uuid(value) {
    this._uuid = value;
  }
}

console.log("\u26AA @m2c2kit/session version 0.3.11 (d1ad307f)");

export { DomHelper, Session, SessionEventType };
//# sourceMappingURL=index.js.map
