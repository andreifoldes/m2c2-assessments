import { M2Event, Activity, ActivityCallbacks, IDataStore, CallbackOptions, ActivityResultsEvent } from '@m2c2kit/core';

/** Base interface for all Session events. */
interface SessionEvent extends M2Event<Session> {
    target: Session;
}
declare const SessionEventType: {
    readonly SessionInitialize: "SessionInitialize";
    readonly SessionStart: "SessionStart";
    readonly SessionEnd: "SessionEnd";
};
type SessionEventType = (typeof SessionEventType)[keyof typeof SessionEventType];

/**
 * Notifies when a session starts, ends, or initializes.
 */
interface SessionLifecycleEvent extends SessionEvent {
}

interface SessionCallbacks {
    /** Callback executed when the session lifecycle changes, such as when it is initialized. */
    onSessionLifecycle?: (event: SessionLifecycleEvent) => void;
}

interface SessionOptions {
    /** The activities that compose this session */
    activities: Array<Activity>;
    /** Callbacks executed when activity events occurs, such as when activity creates data or ends */
    activityCallbacks?: ActivityCallbacks;
    /** Callbacks executed when session events occur */
    sessionCallbacks?: SessionCallbacks;
    /** Use a specified session UUID, rather than create a new one */
    sessionUuid?: string;
    /** URL of session assets folder (which contains wasm binary), if not the default location of "assets" */
    assetsUrl?: string;
    /** Array of one or more optional databases that implement the IDataStore interface for persisting data. For store item operations, the first data store will be used. */
    dataStores?: IDataStore[];
    /** The ID of the study (protocol, experiment, or other aggregate) that contains the repeated administrations of these sessions. The ID should be short, url-friendly, human-readable text (no spaces, special characters, or slashes), e.g., `nyc-aging-cohort.` */
    studyId?: string;
    /** The unique identifier (UUID) of the study (protocol, experiment, or other aggregate) that contains the administration of this session. */
    studyUuid?: string;
    /** After the session initializes, should the session automatically start? Default is true */
    autoStartAfterInit?: boolean;
    /** When an activity ends or is canceled, should the session automatically go to the next activity? Default is true */
    autoGoToNextActivity?: boolean;
    /** After the last activity ends or is canceled, should the session automatically end? Default is true */
    autoEndAfterLastActivity?: boolean;
    /** The id of the HTML element to use as the root element where m2c2kit activities will be rendered. Default is "m2c2kit". */
    rootElementId?: string;
    /** Optional style sheet (CSS) to apply to the document instead of the default m2c2kit CSS. It is recommended to use the default CSS. */
    styleSheet?: string;
    /** NOT IMPLEMENTED YET: Orientation the screen should be locked to for this session. Value will be passed into the ScreenOrientation.lock() Web API. */
    orientation?: "natural" | "landscape" | "portrait" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary";
}

declare class Session {
    options: SessionOptions;
    currentActivity?: Activity;
    private _uuid?;
    dataStores?: IDataStore[];
    private eventListeners;
    private sessionDictionary;
    private initialized;
    /**
     * A Session contains one or more activities. The session manages the start
     * and stop of activities, and advancement to next activity
     *
     * @param options
     */
    constructor(options: SessionOptions);
    /**
     * Adds debugging tools to the session.
     *
     * @remarks These tools can be added by appending query parameters to the
     * URL or by setting game parameters via the Game.SetParameters() method.
     */
    private addDebuggingTools;
    /**
     * Executes a callback when the session initializes.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onInitialize(callback: (sessionLifecycleEvent: SessionLifecycleEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the session starts.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onStart(callback: (sessionLifecycleEvent: SessionLifecycleEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the session ends.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onEnd(callback: (sessionLifecycleEvent: SessionLifecycleEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when any activity in the session generates data.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onActivityData(callback: (activityResultsEvent: ActivityResultsEvent) => void, options?: CallbackOptions): void;
    private addEventListener;
    private raiseEventOnListeners;
    private sessionActivityStartHandler;
    private sessionActivityCancelHandler;
    private sessionActivityEndHandler;
    private sessionActivityLifecycleHandler;
    private activityResultsEventHandler;
    /**
     * Asynchronously initializes the m2c2kit engine and loads assets
     *
     * @deprecated Use Session.initialize() instead.
     */
    init(): Promise<void>;
    /**
     * Check if the Activity uses the deprecated init() method.
     *
     * @remarks Activity.init() is deprecated and should be replaced with
     * Activity.initialize().
     *
     * @param activity
     * @returns true if the activity defines its own init() method, false otherwise.
     */
    private activityUsesDeprecatedInit;
    /**
     * Asynchronously initializes the m2c2kit engine and loads assets
     */
    initialize(): Promise<void>;
    /**
     * Asynchronously loads fonts and wasm binaries that are common across two
     * or more game activities and shares them with the games.
     *
     * @param activities - array of activities
     */
    private getSharedAssets;
    private initializeSharedCanvasKit;
    private fetchSharedFontData;
    /**
     * Waits for the session to be initialized.
     *
     * @remarks Session.initialize() is asynchronous, and it should be awaited
     * so that the session is fully initialized before calling Session.start().
     * If it is not awaited (or it cannot be awaited because the target
     * environment does not support top-level await), this function ensures that
     * the session has been initialized.
     */
    private waitForSessionInitialization;
    /**
     * Starts the session and starts the first activity.
     */
    start(): Promise<void>;
    /**
     * Declares the session ended and sends callback.
     */
    end(): void;
    private stop;
    /**
     * Frees up resources that were allocated to run the session.
     *
     * @remarks This will be done automatically by the m2c2kit library;
     * the end-user must not call this.
     */
    private dispose;
    /**
     * Stops the current activity and goes to the activity with the provided id.
     *
     * @param options
     */
    goToActivity(options: GoToActivityOptions): Promise<void>;
    /**
     * Stops the current activity and advances to next activity in the session.
     * If there is no activity after the current activity, throws error.
     */
    goToNextActivity(): Promise<void>;
    /**
     * Stops the current activity and advances to next activity in the session.
     * If there is no activity after the current activity, throws error.
     *
     * @deprecated Use goToNextActivity() instead.
     */
    advanceToNextActivity(): Promise<void>;
    /**
     * Gets the next activity after the current one, or undefined if
     * this is the last activity.
     */
    get nextActivity(): Activity | undefined;
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
    dictionarySetItem(key: string, value: SessionDictionaryValues): void;
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
    dictionaryGetItem<T extends SessionDictionaryValues>(key: string): T;
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
    dictionaryDeleteItem(key: string): boolean;
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
    dictionaryItemExists(key: string): boolean;
    /**
     * Returns the filename from a url.
     *
     * @param url - url to parse
     * @returns filename
     */
    private getFilenameFromUrl;
    /**
     * Returns the duplicated strings in an array.
     *
     * @param s - array of strings
     * @returns array of duplicated strings
     */
    private getDuplicates;
    get uuid(): string;
    set uuid(value: string);
}
interface GoToActivityOptions {
    /** ActivityId of the activity to go to. */
    id: string;
}
/**
 * Types of values that can be stored in the session dictionary.
 */
type SessionDictionaryValues = string | number | boolean | object | null | undefined;

declare class DomHelper {
    /**
     * Specifies the HTML element in which to render the m2c2kit activities.
     *
     * @param rootElement - the element to add the survey div and canvas div to
     */
    static createRoot(rootElement: HTMLElement): void;
    /**
     * Adds a style sheet to the head of the document.
     *
     * @param css - text of the CSS
     */
    static addStyleSheet(css: string): void;
    /**
     * Add elements to hide the canvas and show a spinner.
     */
    static addLoadingElements(): void;
    /**
     * Depending on the type of activity, set the visibility of the survey div
     * and canvas div.
     *
     * @param activity - the activity to configure the DOM for
     */
    static configureDomForActivity(activity: Activity): void;
    /**
     * Hide the canvas div and survey div.
     */
    static hideM2c2Elements(): void;
    /**
     * Shows or hides the canvas overlay.
     *
     * @param visible - true if the canvas overlay should be visible
     */
    static setCanvasOverlayVisibility(visible: boolean): void;
    /**
     * Shows or hides the busy animation.
     *
     * @param visible - true if the busy animation should be visible
     */
    static setBusyAnimationVisibility(visible: boolean): void;
    /**
     * Shows or hides the survey div.
     *
     * @param visible - true if the survey div should be visible
     */
    private static setSurveyDivVisibility;
    /**
     * Shows or hides the canvas div.
     *
     * @param visible - true if the canvas div should be visible
     */
    private static setCanvasDivVisibility;
}

export { DomHelper, type GoToActivityOptions, Session, type SessionDictionaryValues, type SessionEvent, SessionEventType, type SessionLifecycleEvent, type SessionOptions };
