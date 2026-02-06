import { M2Error, ActivityType, M2c2KitHelpers, Uuid, M2EventType, Timer, Constants } from '@m2c2kit/core';

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
      throw new M2Error("Could not find container element");
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
  SessionEnd: "SessionEnd",
  SessionData: "SessionData"
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

const _HtmlDialog = class _HtmlDialog {
  /**
   * HtmlDialog class creates a custom dialog box.
   *
   * @remarks The dialog box is centered on the screen and has an overlay
   * background composed of a large character (e.g., an emoji). The dialog box
   * is shown using HTML and CSS, not drawing on a canvas, so that it will
   * reliably be shown even if there is an error in the assessment code.
   *
   * @param options - Options for the dialog box.
   */
  constructor(options) {
    this.onDialogConfirm = options.onDialogConfirm;
    this.removeOverlayAfterConfirm = options.removeOverlayAfterConfirm ?? true;
    this.overlay = document.createElement("div");
    this.overlay.style.position = "fixed";
    this.overlay.style.top = "0";
    this.overlay.style.left = "0";
    this.overlay.style.width = "100vw";
    this.overlay.style.height = "100vh";
    this.overlay.style.backgroundColor = "#fff";
    this.overlay.style.display = "flex";
    this.overlay.style.justifyContent = "center";
    this.overlay.style.alignItems = "center";
    this.overlay.style.zIndex = "1000";
    const background = document.createElement("div");
    background.textContent = options.backgroundCharacter ?? null;
    background.style.position = "absolute";
    background.style.fontSize = "20rem";
    background.style.opacity = "0.40";
    background.style.top = "50%";
    background.style.left = "50%";
    background.style.transform = "translate(-50%, -50%)";
    this.dialog = document.createElement("div");
    this.dialog.style.backgroundColor = "#fff";
    this.dialog.style.padding = "20px";
    this.dialog.style.borderRadius = "10px";
    this.dialog.style.boxShadow = "0px 4px 10px rgba(0, 0, 0, 0.3)";
    this.dialog.style.textAlign = "center";
    this.dialog.style.minWidth = "200px";
    this.dialog.style.maxWidth = "75%";
    this.dialog.style.opacity = ".80";
    this.dialog.style.position = "relative";
    this.dialog.style.zIndex = "1001";
    this.message = document.createElement("p");
    this.message.textContent = options.message;
    this.message.style.marginBottom = "15px";
    this.message.style.fontFamily = "Arial, sans-serif";
    this.button = document.createElement("button");
    this.button.textContent = "OK";
    this.button.style.padding = "8px 15px";
    this.button.style.border = "none";
    this.button.style.backgroundColor = "#007bff";
    this.button.style.color = "#fff";
    this.button.style.borderRadius = "5px";
    this.button.style.cursor = "pointer";
    this.button.style.fontSize = "16px";
    this.button.style.fontFamily = "Arial, sans-serif";
    this.button.onclick = this.close.bind(this);
    this.dialog.appendChild(this.message);
    this.dialog.appendChild(this.button);
    this.overlay.appendChild(background);
    this.overlay.appendChild(this.dialog);
  }
  /**
   * Shows the dialog box. If another dialog is already visible,
   * it will be closed before showing this one.
   */
  show() {
    if (_HtmlDialog.activeDialog && _HtmlDialog.activeDialog !== this) {
      _HtmlDialog.activeDialog.forceClose();
    }
    _HtmlDialog.activeDialog = this;
    document.body.appendChild(this.overlay);
  }
  /**
   * Checks if any dialog is currently being displayed
   *
   * @returns True if a dialog is currently visible
   */
  static isDialogVisible() {
    return _HtmlDialog.activeDialog !== null;
  }
  /**
   * Closes the dialog without triggering onDialogConfirm callback
   */
  forceClose() {
    if (this.dialog.parentNode === this.overlay) {
      this.overlay.removeChild(this.dialog);
      if (this.removeOverlayAfterConfirm) {
        this.overlay.remove();
      }
    }
    this.button.onclick = null;
    _HtmlDialog.activeDialog = null;
  }
  /**
   * Closes the dialog and calls the onDialogConfirm callback if provided
   */
  close() {
    if (this.dialog.parentNode === this.overlay) {
      this.overlay.removeChild(this.dialog);
      if (this.removeOverlayAfterConfirm) {
        this.overlay.remove();
      }
    }
    this.button.onclick = null;
    _HtmlDialog.activeDialog = null;
    if (this.onDialogConfirm) {
      this.onDialogConfirm();
    }
  }
};
_HtmlDialog.activeDialog = null;
let HtmlDialog = _HtmlDialog;

const MAX_DIAGNOSTIC_EVENTS = 10;
class DiagnosticsReporter {
  constructor(options) {
    this.staticDiagnosticData = {};
    this.isHandlingException = false;
    this.reportedExceptions = /* @__PURE__ */ new Set();
    this.diagnosticEventsCount = 0;
    this.getSessionUuid = options.getSessionUuid;
    this.getCurrentActivity = options.getCurrentActivity;
    this.dispatchEvent = options.dispatchEvent;
    this.onErrorDialogConfirm = options.onErrorDialogConfirm || (() => {
    });
    this.removeOverlayAfterErrorDialogConfirm = options.removeOverlayAfterErrorDialogConfirm ?? false;
    this.onlyM2Errors = options.onlyM2Errors ?? true;
    this.handleResourceLoadingErrors = options.handleResourceLoadingErrors ?? false;
    this.maximumDiagnosticEvents = options.maximumDiagnosticEvents ?? MAX_DIAGNOSTIC_EVENTS;
    this.errorHandler = this.handleError.bind(this);
    this.rejectionHandler = this.handleRejection.bind(this);
    this.resourceErrorHandler = this.handleResourceError.bind(this);
    this.refreshBatteryStatus();
    this.refreshStorageEstimate();
  }
  /**
   * Sets the value of a variable that will be the same for all diagnostic data.
   *
   * @param key - key (variable name) for the static diagnostic data
   * @param value - value for the data
   */
  addStaticDiagnosticData(key, value) {
    this.staticDiagnosticData[key] = value;
  }
  /**
   * Starts the DiagnosticsReporter by setting up global error handlers to
   * capture uncaught errors, unhandled promise rejections, and possibly
   * resource loading errors to be reported through diagnostics.
   */
  start() {
    window.addEventListener("error", this.errorHandler);
    window.addEventListener("unhandledrejection", this.rejectionHandler);
    if (this.handleResourceLoadingErrors) {
      document.addEventListener("error", this.resourceErrorHandler, true);
    }
  }
  /**
   * Stops the DiagnosticsReporter by removing all global error handlers
   * to prevent memory leaks. Call this method when the DiagnosticsReporter
   * is no longer needed.
   */
  stop() {
    window.removeEventListener("error", this.errorHandler);
    window.removeEventListener("unhandledrejection", this.rejectionHandler);
    document.removeEventListener("error", this.resourceErrorHandler, true);
  }
  /**
   * Handles synchronous errors
   */
  handleError(event) {
    if (this.onlyM2Errors && event.error && event.error.name !== "M2Error") {
      return false;
    }
    this.handleException(event.error || new Error(event.message), {
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: "synchronous"
    });
    return false;
  }
  /**
   * Handles unhandled promise rejections
   */
  handleRejection(event) {
    let error;
    if (event.reason instanceof Error) {
      error = event.reason;
    } else if (typeof event.reason === "string") {
      error = new Error(event.reason);
    } else {
      try {
        error = new Error(JSON.stringify(event.reason));
      } catch {
        error = new Error(
          "Unhandled Promise rejection with unserializable reason"
        );
      }
    }
    if (this.onlyM2Errors && error && error.name !== "M2Error") {
      return false;
    }
    const errorInfo = this.extractErrorLocationFromStack(error.stack);
    this.handleException(error, {
      source: errorInfo.source || "promise_rejection",
      lineno: errorInfo.lineno,
      colno: errorInfo.colno,
      type: "promise_rejection"
    });
    return false;
  }
  /**
   * Extracts source file, line number and column number from error stack trace
   * Works across Chrome, Firefox, Safari, Edge on both desktop and mobile
   *
   * @param stack - The error stack trace string
   * @returns Object containing source file, line number, and column number
   * @private
   */
  extractErrorLocationFromStack(stack) {
    if (!stack) return {};
    const MAX_STACK_LINES = 20;
    const stackLines = stack.split("\n").slice(0, MAX_STACK_LINES);
    for (let i = 0; i < stackLines.length; i++) {
      const line = stackLines[i].trim();
      if (!line) continue;
      const chromeMatch = line.match(/at .*? \(([^)]+):(\d+):(\d+)\)/);
      if (chromeMatch) {
        return {
          source: chromeMatch[1],
          lineno: parseInt(chromeMatch[2], 10),
          colno: parseInt(chromeMatch[3], 10)
        };
      }
      const chromeAltMatch = line.match(/at ([^ ]+):(\d+):(\d+)/);
      if (chromeAltMatch) {
        return {
          source: chromeAltMatch[1],
          lineno: parseInt(chromeAltMatch[2], 10),
          colno: parseInt(chromeAltMatch[3], 10)
        };
      }
      const mozillaMatch = line.match(/(?:@|at )([^@]+):(\d+):(\d+)/);
      if (mozillaMatch) {
        return {
          source: mozillaMatch[1],
          lineno: parseInt(mozillaMatch[2], 10),
          colno: parseInt(mozillaMatch[3], 10)
        };
      }
      const evalMatch = line.match(/([^@\s]+)(?:.*?)?:(\d+):(\d+)$/);
      if (evalMatch) {
        return {
          source: evalMatch[1],
          lineno: parseInt(evalMatch[2], 10),
          colno: parseInt(evalMatch[3], 10)
        };
      }
      const genericMatch = line.match(/([^:]+):(\d+):(\d+)/);
      if (genericMatch) {
        return {
          source: genericMatch[1],
          lineno: parseInt(genericMatch[2], 10),
          colno: parseInt(genericMatch[3], 10)
        };
      }
    }
    return {};
  }
  /**
   * Handles resource loading errors
   */
  handleResourceError(event) {
    if (event.target instanceof HTMLImageElement || event.target instanceof HTMLScriptElement) {
      let url = "src" in event.target ? event.target.src : "unknown";
      url = this.truncateString(url, 100);
      this.handleException(
        new Error(
          `Error on element ${event.target.nodeName} in document at ${document.URL}. Failed to load resource: ${url}`
        ),
        {
          source: "resource_loading",
          type: "resource_loading"
        }
      );
    }
  }
  /**
   * Handles uncaught exceptions and sends diagnostic data to listeners.
   *
   * @remarks This method is called by the global error handler and
   * unhandled promise rejection handler.
   *
   * @param error - the error object
   * @param errorInfo - additional information about the error
   * @param errorInfo.source - the source of the error (e.g., filename)
   * @param errorInfo.lineno - the line number where the error occurred
   * @param errorInfo.colno - the column number where the error occurred   *
   */
  handleException(error, errorInfo) {
    if (this.isHandlingException) {
      console.error("Error occurred while handling another exception", error);
      return;
    }
    const errorKey = `${error.message}:${errorInfo?.lineno || 0}:${errorInfo?.colno || 0}`;
    if (this.reportedExceptions.has(errorKey)) {
      return;
    }
    this.reportedExceptions.add(errorKey);
    this.diagnosticEventsCount++;
    if (this.diagnosticEventsCount > this.maximumDiagnosticEvents) {
      console.warn(
        `Maximum diagnostic events reached (${this.maximumDiagnosticEvents}). No more will be reported.`
      );
      return;
    }
    try {
      this.isHandlingException = true;
      if (!HtmlDialog.isDialogVisible()) {
        const dialog = new HtmlDialog({
          message: "We are sorry, but something went wrong. Please try again later.",
          backgroundCharacter: "\u26A0\uFE0F",
          onDialogConfirm: this.onErrorDialogConfirm,
          removeOverlayAfterConfirm: this.removeOverlayAfterErrorDialogConfirm
        });
        dialog.show();
      } else {
        console.log("Error dialog already visible, not showing another one");
      }
      const currentActivity = this.getCurrentActivity();
      const { timestamp, iso8601Timestamp } = M2c2KitHelpers.createTimestamps();
      const diagnosticData = {
        data_type: "diagnostics",
        document_uuid: Uuid.generate(),
        iso8601_timestamp: iso8601Timestamp,
        session_uuid: this.getSessionUuid(),
        activity: {
          id: currentActivity?.id ?? null,
          uuid: currentActivity?.uuid ?? null,
          publish_uuid: currentActivity?.publishUuid ?? null,
          version: currentActivity?.type === ActivityType.Game ? currentActivity.options.version : null,
          begin_iso8601_timestamp: currentActivity?.type === ActivityType.Game ? currentActivity.beginIso8601Timestamp : null,
          locale: currentActivity?.type === ActivityType.Game ? currentActivity.i18n?.locale ?? null : null
        },
        error_message: error.message,
        error_stack: this.truncateString(error.stack, 2048) ?? null,
        error_source: errorInfo?.source ?? null,
        error_line: errorInfo?.lineno || 0,
        error_column: errorInfo?.colno || 0,
        error_type: errorInfo?.type ?? null,
        device_metadata: this.getExtendedDeviceMetadata(),
        ...this.staticDiagnosticData
      };
      const sessionDataEvent = {
        // target will be replaced by the Session instance in the eventRaiser,
        // which is raiseEventOnListeners() in the Session class. It will set
        // the target to the session instance.
        target: null,
        type: SessionEventType.SessionData,
        data: diagnosticData,
        dataType: "Diagnostics",
        timestamp,
        iso8601Timestamp
      };
      this.dispatchEvent(sessionDataEvent);
      console.log("\u274C diagnostics:", error, errorInfo);
    } finally {
      this.isHandlingException = false;
    }
  }
  getExtendedDeviceMetadata() {
    try {
      const screen = window.screen || {};
      let orientation = void 0;
      try {
        orientation = screen.orientation || void 0;
      } catch {
      }
      return {
        userAgent: navigator?.userAgent,
        language: navigator?.language,
        hardwareConcurrency: navigator?.hardwareConcurrency,
        deviceMemory: (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          typeof navigator?.deviceMemory !== "undefined" ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            navigator.deviceMemory
          ) : void 0
        ),
        // Connection API is experimental. Wrap in try/catch to avoid errors
        // that some browsers may throw if the API is not available.
        connection: (() => {
          try {
            const conn = navigator?.connection;
            return conn ? {
              effectiveType: conn?.effectiveType,
              downlink: conn?.downlink,
              downlinkMax: conn?.downlinkMax,
              rtt: conn?.rtt,
              saveData: conn?.saveData,
              type: conn?.type
            } : void 0;
          } catch {
            return void 0;
          }
        })(),
        battery: this.batteryStatus,
        storage: this.storageEstimate,
        cookieEnabled: navigator?.cookieEnabled,
        webAssembly: typeof WebAssembly !== "undefined",
        maxTouchPoints: navigator?.maxTouchPoints,
        devicePixelRatio: window?.devicePixelRatio,
        screen: {
          availHeight: screen?.availHeight,
          availWidth: screen?.availWidth,
          colorDepth: screen?.colorDepth,
          height: screen?.height,
          orientation: orientation ? {
            type: orientation?.type,
            angle: orientation?.angle
          } : void 0,
          pixelDepth: screen?.pixelDepth,
          width: screen?.width
        },
        device_timezone: Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || "",
        device_timezone_offset_minutes: (/* @__PURE__ */ new Date()).getTimezoneOffset()
      };
    } catch (error) {
      console.warn("Error collecting device metadata:", error);
      return {
        userAgent: navigator?.userAgent || "unknown"
      };
    }
  }
  /**
   * Refreshes the battery status.
   *
   * @remarks This method uses the Battery Status API to get the current
   * battery status of the device. Because the API is asynchronous, we
   * call it previously so that it is ready when we need it and do not need
   * to await it.
   */
  refreshBatteryStatus() {
    try {
      if (!("getBattery" in navigator)) {
        return;
      }
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Battery status timeout")), 2e3);
      });
      Promise.race([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigator.getBattery(),
        timeoutPromise
      ]).then((battery) => {
        this.batteryStatus = {
          charging: battery?.charging,
          level: battery?.level,
          chargingTime: battery?.chargingTime,
          dischargingTime: battery?.dischargingTime
        };
      }).catch((error) => {
        console.warn("Battery status API error:", error);
        this.batteryStatus = void 0;
      });
    } catch (error) {
      console.warn("Unexpected error in battery status check:", error);
    }
  }
  refreshStorageEstimate() {
    try {
      if (!("storage" in navigator && "estimate" in navigator.storage)) {
        return;
      }
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Storage estimate timeout")), 2e3);
      });
      Promise.race([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigator.storage.estimate(),
        timeoutPromise
      ]).then((storage) => {
        this.storageEstimate = {
          quota: storage.quota,
          usage: storage.usage
        };
      }).catch((error) => {
        console.warn("Storage estimation API error:", error);
        this.storageEstimate = void 0;
      });
    } catch (error) {
      console.warn("Unexpected error in storage estimation check:", error);
    }
  }
  truncateString(s, length) {
    if (!s) {
      return "";
    }
    if (s.length <= length) {
      return s;
    }
    return s.slice(0, length) + `...(truncated from ${s.length} characters)`;
  }
}

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
   * @remarks These tools can be activated by appending query parameters to the
   * URL or by setting game parameters via the `Game.SetParameters()` method
   * (only eruda and scripts can be set with `Game.SetParameters()`).
   */
  addDebuggingTools() {
    const urlParams = new URLSearchParams(window.location.search);
    const diagnosticsUrlParam = urlParams.get("diagnostics");
    if (diagnosticsUrlParam !== null) {
      if (diagnosticsUrlParam === "true") {
        this.startDiagnostics();
      }
    } else if (this.options.diagnostics === true) {
      this.startDiagnostics();
    }
    if (urlParams.get("eruda") === "true") {
      M2c2KitHelpers.loadEruda();
    }
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
   * Starts the diagnostics reporter.
   */
  startDiagnostics() {
    if (this.diagnosticsReporter) {
      this.diagnosticsReporter.stop();
    }
    this.diagnosticsReporter = new DiagnosticsReporter({
      getSessionUuid: () => this.uuid,
      getCurrentActivity: () => this.currentActivity,
      dispatchEvent: this.raiseEventOnListeners.bind(this),
      onErrorDialogConfirm: this.end.bind(this)
    });
    this.diagnosticsReporter.start();
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
   * Executes a callback when the session generates data.
   *
   * @remarks Currently, this is used only for capturing diagnostics data on
   * exceptions.
   *
   * @param callback - function to execute.
   * @param options - options for the callback.
   */
  onData(callback, options) {
    this.addEventListener(SessionEventType.SessionData, callback, options);
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
    if (this.eventIsSessionDataEventMissingTarget(event)) {
      event.target = this;
    }
    this.eventListeners.filter((listener) => listener.type === event.type).forEach((listener) => {
      listener.callback(event);
    });
  }
  eventIsSessionDataEventMissingTarget(event) {
    return event.type === SessionEventType.SessionData && event.dataType === "Diagnostics" && !event.target;
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
    throw new M2Error("unknown activity lifecycle event type");
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
        throw new M2Error(
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
      throw new M2Error(
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
      throw new M2Error(
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
    if (this.diagnosticsReporter) {
      this.diagnosticsReporter.stop();
      this.diagnosticsReporter = void 0;
    }
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
      throw new M2Error(
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
      throw new M2Error(
        "error in advanceToNextActivity(): no current activity"
      );
    }
    if (!this.nextActivity) {
      throw new M2Error("error in advanceToNextActivity(): no next activity");
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
      throw new M2Error("error in get nextActivity(): no current activity");
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
      console.warn("Session.uuid is undefined. Returning empty UUID.");
      return "00000000-0000-0000-0000-000000000000";
    }
    return this._uuid;
  }
  set uuid(value) {
    this._uuid = value;
  }
  /**
     * Sets the value of a variable that will be the same for all diagnostic data.
     *
     * @remarks This is useful for custom variables to appear in the diagnostic
     * data. For example, you might save the subject's participant ID, or some
     * other identifier that is not typically part of the diagnostic data. In
     * the example below, if an exception occurs, the `participant_id` variable
     * will be saved with the value `12345` within the diagnostic data.
     * 
     * @example
     * ```
     * session.addStaticDiagnosticData("participant_id", "12345");
     *```
  
     * @param key - key (variable name) for the static diagnostic data
     * @param value - value for the data
     */
  addStaticDiagnosticData(key, value) {
    if (this.diagnosticsReporter) {
      this.diagnosticsReporter.addStaticDiagnosticData(key, value);
    } else {
      console.warn(
        `Session.addStaticDiagnosticData(): diagnostics reporter has not been created.`
      );
    }
  }
}

console.log("\u26AA @m2c2kit/session version 0.3.14 (f8bdff76)");

export { DomHelper, Session, SessionEventType };
//# sourceMappingURL=index.js.map
