import { Canvas, Typeface, TypefaceFontProvider, Image, Paint, CanvasKit, Surface, Font, ParagraphBuilder, Paragraph, FontMgr, Path, PaintStyle } from 'canvaskit-wasm';

/**
 * Position in two-dimensional space.
 */
interface Point {
    /** Horizontal coordinate */
    x: number;
    /** Vertical coordinate */
    y: number;
}

interface IDrawable {
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
    /**
     * Frees up resources allocated by the Drawable M2Node.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks This will be done automatically by the m2c2kit library; the
     * end-user must not call this.
     */
    dispose(): void;
    anchorPoint: Point;
    zPosition: number;
}

declare enum M2NodeType {
    Node = "Node",
    Scene = "Scene",
    Sprite = "Sprite",
    Label = "Label",
    TextLine = "TextLine",
    Shape = "Shape",
    Composite = "Composite",
    SoundPlayer = "SoundPlayer",
    SoundRecorder = "SoundRecorder"
}

interface DrawableOptions {
    /** Point within the node that determines its position. Default is &#123; x: 0.5, y: 0.5 &#125;, which centers the node on its position */
    anchorPoint?: Point;
    /** Value along the z-axis to determine drawing and tap order. Larger values are on top. */
    zPosition?: number;
}

/**
 * Constraints for defining relative layouts.
 *
 * @remarks FOR INTERNAL USE ONLY
 */
interface Constraints {
    /** Constrain the top (vertical axis) of this node to the top of the specified node. The tops of both will appear at the same vertical location */
    topToTopOf?: M2Node | string;
    /** Constrain the top (vertical axis) of this node to the bottom of the specified node. This node will appear immediately below the specified node */
    topToBottomOf?: M2Node | string;
    /** Constrain the bottom (vertical axis) of this node to the top of the specified node. This node will appear immediately above of the specified node */
    bottomToTopOf?: M2Node | string;
    /** Constrain the bottom (vertical axis) of this node to the bottom of the specified node. The bottoms of both will appear at the same vertical location */
    bottomToBottomOf?: M2Node | string;
    /** Constrain the start (horizontal axis) of this node to the start of the specified node. The start of both will appear at the same horizontal location */
    startToStartOf?: M2Node | string;
    /** Constrain the start (horizontal axis) of this node to the end of the specified node. This node will appear immediately to the right of the specified node */
    startToEndOf?: M2Node | string;
    /** Constrain the end (horizontal axis) of this node to the end of the specified node. The end of both will appear at the same horizontal location */
    endToEndOf?: M2Node | string;
    /** Constrain the end (horizontal axis) of this node to the start of the specified node. This node will appear immediately to the left of the specified node */
    endToStartOf?: M2Node | string;
    /** When opposing horizontal constraints are applied, the default is to center the node within the constraints (horizontalBias = .5). Setting horizontalBias less than .5 will pull the node towards the start (to the left). Setting horizontalBias greater than .5 will pull the node towards the end (to the right)  */
    horizontalBias?: number;
    /** When opposing vertical constraints are applied, the default is to center the node within the constraints (verticalBias = .5). Setting verticalBias less than .5 will pull the node towards the top. Setting verticalBias greater than .5 will pull the node towards the bottom */
    verticalBias?: number;
    [key: string]: M2Node | string | number | undefined;
}

/**
 * The Layout allows relative positioning via constraints.
 * This is not fully implemented yet: DO NOT USE!
 * We use it internally for instructions.
 */
interface Layout {
    height?: number;
    width?: number;
    marginStart?: number;
    marginEnd?: number;
    marginTop?: number;
    marginBottom?: number;
    constraints?: Constraints;
}

interface M2NodeOptions {
    /** Name of the node. Only needed if the node will be referred to by name in a later function */
    name?: string;
    /** Position of the node within its parent coordinate system. Default is (0, 0) */
    position?: Point;
    /** Scale of the node. Default is 1.0 */
    scale?: number;
    /** Opacity of the node. 0 is fully transparent, 1 is fully opaque. Default is 1.0. Alpha has multiplicative inheritance. For example, if the node's parent is alpha .5 and this node's is alpha .4, then the node will appear with alpha .2. */
    alpha?: number;
    /** Rotation of the node around the Z axis. Unit is radians. Default is 0 (no rotation). zRotation has inheritance. In addition to this node's zRotation, all ancestors' zRotations will be applied. */
    zRotation?: number;
    /** Does the node respond to user events, such as taps? Default is false */
    isUserInteractionEnabled?: boolean;
    /** Can the node be dragged? */
    draggable?: boolean;
    /** Is the node, and its children, hidden? (not displayed). Default is false */
    hidden?: boolean;
    /** FOR INTERNAL USE ONLY */
    layout?: Layout;
    /** Unique identifier (UUID). Will be generated automatically. @internal For m2c2kit library use only */
    uuid?: string;
    /** Should the node not emit events to the EventStore? Default is false.
     * @remarks This property is for use by authors of `Composite` nodes. It is not intended for general use. */
    suppressEvents?: boolean;
}

interface CompositeOptions extends M2NodeOptions, DrawableOptions {
}

declare abstract class Composite extends M2Node implements IDrawable {
    readonly type = M2NodeType.Composite;
    compositeType: string;
    isDrawable: boolean;
    private _anchorPoint;
    private _zPosition;
    /**
     * Base Drawable object for creating custom nodes ("composites") composed of primitive nodes.
     *
     * @param options
     */
    constructor(options?: CompositeOptions);
    initialize(): void;
    get anchorPoint(): Point;
    set anchorPoint(anchorPoint: Point);
    get zPosition(): number;
    set zPosition(zPosition: number);
    dispose(): void;
    update(): void;
    draw(canvas: Canvas): void;
    abstract warmup(canvas: Canvas): void;
    /**
     * Event handler for custom events a `Composite` may generate.
     *
     * @remarks If the `Composite` generates custom events, this method is
     * necessary for the `Composite` to work in replay mode.
     *
     * @param event - event to handle
     */
    handleCompositeEvent(event: CompositeEvent): void;
}

/** Base interface for all Activity events. */
interface ActivityEvent extends M2Event<Activity> {
    target: Activity;
}

/** Data from activities are stored as key (string) value pairs. */
interface ActivityKeyValueData {
    [key: string]: string | number | boolean | object | undefined | null;
}

/**
 * The type of activity.
 *
 * @remarks Currently, m2c2kit has only Game and Survey activities.
 */
declare enum ActivityType {
    Game = "Game",
    Survey = "Survey"
}

/** A snapshot of performance at a single point in time.
 *
 * @remarks This describes performance of the application internals, not the
 * participant. Do not store participant data here. Use snake case because
 * these data will be directly exported to persistence.
 */
interface ActivityMetric {
    [key: string]: string | number | boolean | object | undefined | null;
    activity_type: ActivityType;
    activity_uuid: string;
    iso8601_timestamp: string;
}

interface JsonSchema {
    /** Data type of the value or array of acceptable data types. */
    type?: JsonSchemaDataType | JsonSchemaDataType[];
    /** Values the schema can have. */
    enum?: unknown[];
    /** Annotation to indicate the type of string value, e.g., "date-time" or "email". */
    format?: string;
    /** Intent of the schema. */
    title?: string;
    /** Description of the schema. */
    description?: string;
    /** If the value is an object, the properties in JsonSchema. */
    properties?: {
        [key: string]: JsonSchema;
    };
    /** If the value is an array, the array items in JsonSchema. */
    items?: JsonSchema;
    /** Required properties. */
    required?: string[];
    /** Reference to object definitions. */
    $ref?: string;
    /** Object definitions. */
    $defs?: object;
    /** Comment string. */
    $comment?: string;
    /** Dialect of JSON Schema. */
    $schema?: string;
    /** Default value. */
    default?: any;
}
type JsonSchemaDataType = "string" | "number" | "integer" | "object" | "array" | "boolean" | "null";
type JsonSchemaDataTypeScriptTypes = string | number | object | boolean | null | undefined | Array<string> | Array<number> | Array<object> | Array<boolean> | Array<null>;

/**
 * All the data created by an activity.
 */
interface ActivityResults {
    /** All the data of the specified data type created thus far by the activity. */
    data: ActivityKeyValueData;
    /** JSON schema describing the structure of the data. */
    dataSchema: JsonSchema;
    /** Type of data. */
    dataType: "Trial" | "Scoring" | "Survey";
    /** Parameters under which the activity was run. */
    activityConfiguration: unknown;
    /** JSON schema describing the activity parameters. */
    activityConfigurationSchema: JsonSchema;
    /** Metrics describing internal application performance. */
    activityMetrics?: Array<ActivityMetric>;
}

/**
 * Notifies when an activity starts, ends, cancels, or
 * creates data.
 */
interface ActivityLifecycleEvent extends ActivityEvent {
    results?: ActivityResults;
}

/**
 * Dispatched when new data is created by an activity.
 *
 * @remarks Event contains all the data created by an activity, with
 * separate properties for the newly created data. ActivityResultsEvent
 * inherits "data" from ActivityResults, which contains the complete data
 * up to this point (both new and existing data).
 */
interface ActivityResultsEvent extends ActivityEvent, ActivityResults {
    /** New data created by the activity, which dispatched this event */
    newData: ActivityKeyValueData;
    /** JSON schema describing the new data */
    newDataSchema: JsonSchema;
    /** ISO 8601 timestamp of the event. Specifically, value of "new Date().toISOString()" executed on the device when the ActivityResultsEvent occurred. */
    iso8601Timestamp: string;
}

/**
 * An interface for persisting data.
 *
 * @remarks This interface saves activity results as well as saves and
 * retrieves arbitrary key-value items that activities can use.
 *
 * The underlying persistence provider of the store must
 * be previously set in the activity's `Session` before use. The
 * implementation of the store is not provided by the \@m2c2kit/core library.
 *
 * @example
 * ```
 * import { LocalDatabase } from "@m2c2kit/db";
 * ...
 * const db: IDataStore = new LocalDatabase();
 * session.dataStore = db;
 * session.initialize();
 * ```
 */
interface IDataStore {
    /** Saves activity results in the data store. */
    saveActivityResults(ev: ActivityResultsEvent): Promise<string>;
    /** Sets the value of an item. The key will be saved to the store as provided;
     * if namespacing or other formatting is desired, it must be done before
     * calling this method. activityId can be used by the store for indexing. */
    setItem(key: string, value: string | number | boolean | object | undefined | null, activityPublishUuid: string): Promise<string>;
    /** Gets the value of an item by its key. */
    getItem<T extends string | number | boolean | object | undefined | null>(key: string): Promise<T>;
    /** Deletes an item by its key. */
    deleteItem(key: string): Promise<void>;
    /** Deletes all items. */
    clearItemsByActivityPublishUuid(activityPublishUuid: string): Promise<void>;
    /** Returns keys of all items. */
    itemsKeysByActivityPublishUuid(activityPublishUuid: string): Promise<string[]>;
    /** Determines if the key exists. */
    itemExists(key: string): Promise<boolean>;
}

interface CallbackOptions {
    /** Should the provided callback replace any existing callbacks of the same event type for this target? Default is false */
    replaceExisting?: boolean;
    /** String identifier used to identify the callback. Only needed if the callback will be removed later */
    key?: string;
}

interface Activity {
    /** The type of activity: Game or Survey */
    type: ActivityType;
    /**
     * Initializes the activity.
     *
     * @remarks All code to create the activity's appearance and behavior must
     * be placed in this method. This method is asynchronous, and must be
     * awaited. When writing a new game by extending the `Game` class, this
     * method will be overridden, but the base method must still be called with
     * `await super.initialize()`.
     */
    initialize(): Promise<void>;
    /**
     * Initializes the activity.
     *
     * @remarks All code to create the activity's appearance and behavior must
     * be placed in this method. This method is asynchronous, and must be
     * awaited. When writing a new game by extending the `Game` class, this
     * method will be overridden, but the base method must still be called with
     * `await super.init()`.
     *
     * @deprecated use Game.initialize() instead.
     */
    init(): Promise<void>;
    /** Starts the activity */
    start(): Promise<void>;
    /** Stops the activity */
    stop(): void;
    /**
     * Executes a callback when the activity starts.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onStart(callback: (activityLifecycleEvent: ActivityLifecycleEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the activity is canceled.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onCancel(callback: (activityLifecycleEvent: ActivityLifecycleEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the activity ends.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onEnd(callback: (activityLifecycleEvent: ActivityLifecycleEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the activity generates data.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onData(callback: (activityResultsEvent: ActivityResultsEvent) => void, options?: CallbackOptions): void;
    /** The activity's parent session unique identifier. This is newly generated each session. */
    sessionUuid: string;
    /** The activity's unique identifier. This is newly generated each session. The UUID for an activity will vary across sessions. */
    uuid: string;
    /** Human-friendly name of this activity */
    name: string;
    /** Short identifier of this activity */
    id: string;
    /** Persistent unique identifier (UUID) of the activity. Required for games. Optional or empty string if a survey. */
    publishUuid: string;
    /** The ID of the study (protocol, experiment, or other aggregate) that contains the repeated administrations of this activity. The ID should be short, url-friendly, human-readable text (no spaces, special characters, or slashes), e.g., `nyc-aging-cohort`. */
    studyId?: string;
    /** Unique identifier (UUID) of the study (protocol, experiment, or other aggregate) that contains the administration of this activity. */
    studyUuid?: string;
    /** The value of performance.now() immediately before the activity begins */
    beginTimestamp: number;
    /** The value of new Date().toISOString() immediately before the activity begins */
    beginIso8601Timestamp: string;
    /** Sets additional activity parameters if defaults are not sufficient. */
    setParameters(additionalParameters: unknown): void;
    /** Additional activity parameters that were set. */
    readonly additionalParameters?: unknown;
    /** Optional stores to use for saving data. The implementation of the store is not provided by the \@m2c2kit/core library. */
    dataStores?: IDataStore[];
}

/** Base interface for all M2Node events. */
interface M2NodeEvent extends M2Event<M2Node> {
    /** The M2Node on which the event occurred. If the event has gone through serialization, the string will be the node's UUID. */
    target: M2Node | string;
}

/**
 * Color in red (0-255), green (0-255), blue (0-255), alpha (0-1) format. Must be numeric array of length 4.
 */
type RgbaColor = [number, number, number, number];

interface SceneOptions extends M2NodeOptions, DrawableOptions {
    /** Background color of the scene. Default is Constants.DEFAULT_SCENE_BACKGROUND_COLOR (WebColors.White) */
    backgroundColor?: RgbaColor;
}

/**
 * Describes an event on the device's built-in keyboard.
 *
 * @remarks The built-in keyboard is defined as the hardware keyboard on a
 * desktop/laptop or the built-in soft keyboard on a tablet or phone. The
 * latter is not used in m2c2kit. On tablet or phone, the `VirtualKeyboard`
 * in the `@m2c2kit/addons` package should be used for key events.
 * @remarks Key events can occur only on a `Scene` node.
 */
interface M2KeyboardEvent extends M2NodeEvent {
    /** String that is generated when key is pressed, with any modifiers (e.g., Shift) applied. */
    key: string;
    /** Code for the key, not taking into account any modifiers. */
    code: string;
    /** True if the Shift key is pressed. */
    shiftKey: boolean;
    /** True if the Control key is pressed. */
    ctrlKey: boolean;
    /** True if the Alt key is pressed. */
    altKey: boolean;
    /** True if the Meta key is pressed. */
    metaKey: boolean;
    /** True if the event is being repeated. */
    repeat: boolean;
}

declare class Scene extends M2Node implements IDrawable, SceneOptions {
    readonly type = M2NodeType.Scene;
    isDrawable: boolean;
    private _anchorPoint;
    private _zPosition;
    private _backgroundColor;
    _active: boolean;
    _transitioning: boolean;
    private backgroundPaint?;
    /**
     * Top-level node that holds all other nodes, such as sprites, rectangles, or labels, that will be displayed on the screen
     *
     * @remarks The scene is the game screen or stage, and fills the entire available screen. There are usually multiple screens to contain multiple stages of the game, such as various instruction pages or phases of a game.
     *
     * @param options - {@link SceneOptions}
     */
    constructor(options?: SceneOptions);
    get completeNodeOptions(): {
        backgroundColor: RgbaColor;
        anchorPoint?: Point;
        zPosition?: number;
        name?: string;
        position?: Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        isUserInteractionEnabled?: boolean;
        draggable?: boolean;
        hidden?: boolean;
        layout?: Layout;
        uuid?: string;
        suppressEvents?: boolean;
    };
    initialize(): void;
    dispose(): void;
    set game(game: Game);
    /**
     * The game which this scene is a part of.
     *
     * @remarks Throws error if scene is not part of the game object.
     */
    get game(): Game;
    get backgroundColor(): RgbaColor;
    set backgroundColor(backgroundColor: RgbaColor);
    get anchorPoint(): Point;
    set anchorPoint(anchorPoint: Point);
    get zPosition(): number;
    set zPosition(zPosition: number);
    /**
     * Duplicates a node using deep copy.
     *
     * @remarks This is a deep recursive clone (node and children).
     * The uuid property of all duplicated nodes will be newly created,
     * because uuid must be unique.
     *
     * @param newName - optional name of the new, duplicated node. If not
     * provided, name will be the new uuid
     */
    duplicate(newName?: string): Scene;
    /**
     * Code that will be called every time the scene is presented.
     *
     * @remarks Use this callback to set nodes to their initial state, if
     * that state might be changed later. For example, if a scene allows
     * players to place dots on a grid, the setup() method should ensure the
     * grid is clear of any prior dots from previous times this scene may
     * have been displayed. In addition, if nodes should vary in each
     * iteration, that should be done here.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onSetup(callback: (nodeEvent: M2NodeEvent) => void, options?: CallbackOptions): void;
    /**
     *
     * Code that will be called after the scene has finished any transitions
     * and has fully appeared on the screen.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onAppear(callback: (nodeEvent: M2NodeEvent) => void, options?: CallbackOptions): void;
    /**
     * Code that will be called after a key is pressed on the device's
     * built-in keyboard.
     *
     * @remarks The built-in keyboard is defined as the hardware keyboard on a
     * desktop/laptop or the built-in soft keyboard on a tablet or phone. The
     * latter is not used in m2c2kit. On tablet or phone, the `VirtualKeyboard`
     * in the `@m2c2kit/addons` package should be used for key events.
     * @remarks Key events can occur only on a `Scene` node.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onKeyDown(callback: (m2KeyboardEvent: M2KeyboardEvent) => void, options?: CallbackOptions): void;
    /**
     * Code that will be called after a key is released on the device's
     * built-in keyboard.
     *
     * @remarks The built-in keyboard is defined as the hardware keyboard on a
     * desktop/laptop or the built-in soft keyboard on a tablet or phone. The
     * latter is not used in m2c2kit. On tablet or phone, the `VirtualKeyboard`
     * in the `@m2c2kit/addons` package should be used for key events.
     * @remarks Key events can occur only on a `Scene` node.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onKeyUp(callback: (m2KeyboardEvent: M2KeyboardEvent) => void, options?: CallbackOptions): void;
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
}

type EasingFunction = (
/** elapsed time since start of action */
t: number, 
/** start value of value to be eased */
b: number, 
/** total change of value to be eased */
c: number, 
/** total duration of action */
d: number) => number;
/**
 * The Easings class has static methods for creating easings to be used in actions.
 */
declare class Easings {
    static none: EasingFunction;
    static linear: EasingFunction;
    static quadraticIn: EasingFunction;
    static quadraticOut: EasingFunction;
    static quadraticInOut: EasingFunction;
    static cubicIn: EasingFunction;
    static cubicOut: EasingFunction;
    static cubicInOut: EasingFunction;
    static quarticIn: EasingFunction;
    static quarticOut: EasingFunction;
    static quarticInOut: EasingFunction;
    static quinticIn: EasingFunction;
    static quinticOut: EasingFunction;
    static quinticInOut: EasingFunction;
    static sinusoidalIn: EasingFunction;
    static sinusoidalOut: EasingFunction;
    static sinusoidalInOut: EasingFunction;
    static exponentialIn: EasingFunction;
    static exponentialOut: EasingFunction;
    static exponentialInOut: EasingFunction;
    static circularIn: EasingFunction;
    static circularOut: EasingFunction;
    static circularInOut: EasingFunction;
    static toTypeAsString(easingFunction: EasingFunction): string;
    static fromTypeAsString(easingType: string): EasingFunction;
}

interface SlideTransitionOptions {
    /** Direction in which the slide action goes */
    direction: TransitionDirection;
    /** Duration, in milliseconds, of the transition */
    duration: number;
    /** Easing function for movement or a string identifier of the easing function, e.g., `SinusoidalInOut`. Default is a linear easing function. */
    easing?: EasingFunction | string;
}
/**
 * The Transition class has static methods for creating animations that run as one scene transitions to another.
 */
declare abstract class Transition {
    abstract type: TransitionType;
    abstract easing: EasingFunction;
    abstract duration: number;
    /**
     * Creates a scene transition in which the outgoing scene slides out and the incoming scene slides in, as if the incoming scene pushes it.
     *
     * @param options - {@link SlideTransitionOptions}
     * @returns
     */
    static slide(options: SlideTransitionOptions): SlideTransition;
    /**
     * Creates a scene transition with no animation or duration. The next scene is immediately drawn.
     */
    static none(): NoneTransition;
}
declare class NoneTransition extends Transition {
    type: "None";
    easing: EasingFunction;
    duration: number;
    constructor();
}
declare class SlideTransition extends Transition {
    type: "Slide";
    easing: EasingFunction;
    duration: number;
    direction: TransitionDirection;
    constructor(direction: TransitionDirection, duration: number, easing: EasingFunction);
}
declare const TransitionType: {
    readonly Slide: "Slide";
    readonly None: "None";
};
type TransitionType = (typeof TransitionType)[keyof typeof TransitionType];
declare const TransitionDirection: {
    readonly Up: "Up";
    readonly Down: "Down";
    readonly Right: "Right";
    readonly Left: "Left";
};
type TransitionDirection = (typeof TransitionDirection)[keyof typeof TransitionDirection];
declare class SceneTransition {
    scene: Scene;
    transition: Transition;
    constructor(scene: Scene, transition: Transition);
}

/**
 * Image that can be rendered by a browser from a URL or from a
 * HTML svg tag in string form. Provide either url or svgString, not both.
 */
interface BrowserImage {
    /** Name that will be used to refer to the image. Must be unique among all
     * images within a game */
    imageName: string;
    /** Width to scale image to */
    width: number;
    /** Height to scale image to */
    height: number;
    /** The HTML SVG tag, in string form, that will be rendered and loaded.
     * Must begin with &#60;svg> and end with &#60;/svg> */
    svgString?: string;
    /** URL of image asset (svg, png, jpg) to render and load */
    url?: string;
    /** Image asset as a Data URL. @internal For m2c2kit library use only */
    dataUrl?: string;
    /** If true, the image will not be fully loaded until it is needed. Default
     * is false. Lazy loading is useful for large "banks" of images. These should
     * be lazy loaded because they may not be needed. */
    lazy?: boolean;
    /** If true, try to use a localized version of the image. Localized images
     * are loaded on demand and are not preloaded. Only an image whose asset
     * is provided as a URL can be localized. Default is false. */
    localize?: boolean;
}

/**
 * TrialSchema defines the data that are generated for each trial. They are
 * key-value pairs in which the key is the variable name, and the value is
 * JSON Schema that defines the type of the variable.
 */
interface TrialSchema {
    [key: string]: JsonSchema;
}

/**
 * GameParameters are the configurable options that change how the game runs.
 * They are key-value pairs in which the key is the game parameter name, and
 * the value is JSON Schema that defines the type of the game parameter, with
 * a required parameter named "default" that is the default value for the
 * parameter.
 */
interface GameParameters {
    /** The key is the game parameter name */
    [key: string]: DefaultParameter;
}
interface DefaultParameter extends JsonSchema {
    /**  Default value for the game parameter. */
    default: any;
}

/**
 * Font url and raw data that has been shared with other games in the session.
 *
 * @remarks Font sharing will happen only if the font filename is the same AND
 * a game's `shareAssets` property is not false.
 */
interface SharedFont {
    /** url that the shared font was loaded from */
    url: string;
    /** raw data of the shared font */
    data: ArrayBuffer;
}

/**
 * Font asset to use in the game.
 */
interface FontAsset {
    /** Name of the font to use when referring to it within m2c2kit */
    fontName: string;
    /** URL of font (TrueType font) to load */
    url: string;
    /** If true, the font will not be fully loaded until it is needed. Default
     * is false. Lazy loading is useful for fonts involved in localization.
     * These should be lazy loaded because they may not be needed.
     */
    lazy?: boolean;
    /** Font url and raw data that has been shared with other games in the session. Undefined if this font was not shared. @internal For m2c2kit library use only */
    sharedFont?: SharedFont;
}

/**
 * Game's module name, version, and dependencies.
 */
interface ModuleMetadata {
    /** name property from package.json */
    name: string;
    /** version property from package.json */
    version: string;
    /** dependency property from package.json */
    dependencies: {
        [key: string]: string;
    };
}

interface SoundAsset {
    /** Name of the sound to use when referring to it within m2c2kit, such as
     * when creating a `SoundPlayer` node. */
    soundName: string;
    /** URL of sound to load */
    url: string;
    /** If true, the sound will not be fully loaded until it is needed. Default
     * is false. Lazy loading is useful for sounds involved in localization.
     * These should be lazy loaded because they may not be needed.
     */
    lazy?: boolean;
}

/**
 * A map of a locale to a map of keys to translated text and font information.
 *
 * @remarks When it comes to fonts, the `Translation` object only specifies
 * which fonts to use for text. The actual fonts must be provided as part of
 * the `GameOptions` object with names that match the names specified in the
 * `Translation` object.
 *
 * The below example defines a translation object for use in three locales:
 * en-US, es-MX, and hi-IN.
 *
 * In the `configuration` object, the `baseLocale` property is en-US. This
 * means that the en-US locale is the locale from which the "native"
 * resources originate.
 *
 * The property `localeName` is human-readable text of the locale that can
 * be displayed to the user. For example, `en-US` might have the locale name
 * `English`. The property `localeSvg` is an image of the locale, as an SVG
 * string and its height and width. This is so the locale can be displayed to
 * the user if the locale uses a script that is not supported in the default
 * font, and a locale-specific font is not yet loaded.
 *
 * For en-US and es-MX, the game's default font will be used for all text
 * because the `fontName` property is not specified for these locales. For
 * hi-IN, the `devanagari` font will be used for all text.
 *
 * `EMOJI_WELCOME` uses an emoji, and it will not display properly unless an
 * `emoji` font is added. The `additionalFontName` property is used to
 * specify an additional font or fonts to use as well as the locale's font.
 * For en-US and es-MX, the `emoji` font plus the game's default font will be
 * used for the `EMOJI_WELCOME` text. For hi-IN, the `emoji` font plus the
 * `devanagari` font will be used for the `EMOJI_WELCOME` text.
 *
 * `OK_BUTTON` uses the game's default font for all locales. Because hi-IN
 * specified a font name, the `overrideFontName` property with a value of
 * `default` is used to specify that the game's default font should be used
 * instead of the locale's font, devanagari. In addition, hi-IN specifies a
 * different font size for the `OK_BUTTON` text.
 *
 * `BYE` uses interpolation. `{{name}}` is a placeholder that will be replaced,
 * at runtime, with the value of the `name` key in the `options` object passed
 * to the `t` or `tf` methods of the `I18n` object. If the placeholder is not
 * found in `options`, an error will be thrown.
 *
 * @example
 *
 * ```
 * const translation: Translation = {
 *   "configuration": {
 *    "baseLocale": "en-US"
 *   },
 *   "en-US": {
 *     localeName: "English",
 *     "NEXT_BUTTON": "Next"
 *     "EMOJI_WELCOME": {
 *       text: "👋 Hello",
 *       additionalFontName: ["emoji"]
 *     },
 *     "OK_BUTTON": "OK",
 *     "BYE": "Goodbye, {{name}}."
 *   },
 *   "es-MX": {
 *     localeName: "Español",
 *     "NEXT_BUTTON": "Siguiente"
 *     "EMOJI_WELCOME": {
 *       text: "👋 Hola",
 *       additionalFontName: ["emoji"]
 *     },
 *     "OK_BUTTON": "OK",
 *     "BYE": "Adiós, {{name}}."
 *   },
 *   "hi-IN": {
 *     localeName: "Hindi",
 *     localeSvg: {
 *       // from https://commons.wikimedia.org/wiki/File:Hindi.svg, not copyrighted
 *       // note: To save space, the next line is not the full, working SVG string from the above URL.
 *       svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 304 168" xml:space="preserve"><path d="m45.223..."/></svg>`,
 *       height: 44,
 *       width: 80,
 *     },
 *     fontName: "devanagari",
 *     "NEXT_BUTTON": "अगला"
 *     "EMOJI_WELCOME": {
 *       text: "👋 नमस्कार",
 *       additionalFontName: ["emoji"]
 *     },
 *     "OK_BUTTON": {
 *       text: "OK",
 *       fontSize: 12,
 *       overrideFontName: "default"
 *     },
 *    "BYE": "अलविदा {{name}}."
 *   }
 * }
 *
 * ...
 *
 * const nextButton = new Button({
 *  text: "NEXT_BUTTON"
 *  ...
 * })
 *
 * const byeLabel = new Label({
 *  text: "BYE",
 *  interpolation: {
 *    name: "Alice"
 *  }
 *  ...
 * }
 * ```
 */
type Translation = LocaleTranslationMap & {
    configuration?: TranslationConfiguration;
};
interface TranslationConfiguration {
    /** The locale from which translations and adaptations are made to adjust to different regions and languages. This is the locale from which the base or unlocalized resources originate. */
    baseLocale: string;
}
interface LocaleSvg {
    /** The HTML SVG tag, in string form, that will be rendered and loaded.
     * Must begin with &#60;svg> and end with &#60;/svg> */
    svgString: string;
    /** Height to scale image to */
    height: number;
    /** Width to scale image to */
    width: number;
}
type LocaleTranslationMap = {
    [locale: string]: {
        /** The font name or names to use for all text in the locale. If omitted,
         * the game's default font will be used. */
        fontName?: string | string[];
        /** Human-readable text of the locale that can be displayed to the user. For example, `en-US` might have the locale name `English` */
        localeName?: string;
        /** Image of the locale, as an SVG string, that can be displayed to the user. Some locales, in their native script, might not be supported in the default font. For example, Hindi script cannot be displayed in Roboto font. It would be inefficient to load all the possible extra fonts simply to display the locale to the user. Thus, in lieu of a string, the locale can be displayed to the user as an SVG. Only if that locale is selected, the font supporting that locale will be loaded. */
        localeSvg?: LocaleSvg;
    } & {
        /** The translated text or the translated text with custom font information. Note: `LocaleSvg` is included in the union only to satisfy TypeScript compiler. */
        [key: string]: string | TextWithFontCustomization | LocaleSvg;
    };
};
/**
 * A translated string with custom font information to be applied only to this
 * string.
 */
interface TextWithFontCustomization {
    /** The translated string. */
    text: string;
    /** Font size to use when displaying the text. */
    fontSize?: number;
    /** Font name(s) to _add to_ the locale's font name(s) when displaying text. */
    additionalFontName?: string | Array<string>;
    /** Font name(s) to use _in place of_ the locale's font name(s) when
     * displaying text. Use `default` to indicate that the game's default font
     * should be used instead of the locale's font names(s) */
    overrideFontName?: string | Array<string>;
}
interface TextAndFont {
    /** The translated string. */
    text?: string;
    /** Font size to use when displaying the text. */
    fontSize?: number;
    /** Font name to use when displaying the text. */
    fontName?: string;
    /** Font names to use when displaying the text. */
    fontNames?: Array<string>;
}

/**
 * Localization information that is passed to the I18n constructor.
 */
interface LocalizationOptions {
    /** Locale to use for localization when running the game, or "auto" to request from the environment. */
    locale?: string;
    /** Locale to use if requested locale translation is not available, or if "auto" locale was requested and environment cannot provide a locale. Default is `en-US`.*/
    fallbackLocale?: string;
    /** Font color for strings or outline color for images when a requested locale's translation or image is missing. This is useful in development to call attention to missing localization assets. */
    missingLocalizationColor?: RgbaColor;
    /** Translation for localization. */
    translation?: Translation;
    /** Additional translation for localization. This will typically be provided through `setParameters()` at runtime. This translation be merged into the existing translation and will overwrite any existing translation with the same key-value pairs. Thus, this can be used to modify an existing translation, either in whole or in part. */
    additionalTranslation?: Translation;
}

/**
 * ScoringSchema defines the data that are generated by the scoring code. They
 * are key-value pairs in which the key is the variable name, and the value is
 * JSON Schema that defines the type of the variable.
 */
interface ScoringSchema {
    [key: string]: JsonSchema;
}

/**
 * Options to specify HTML canvas, set game canvas size, and load game assets.
 */
interface GameOptions extends LocalizationOptions {
    /** Human-friendly name of this game */
    name: string;
    /** Short identifier of this game; unique among published games and url-friendly (no spaces, special characters, or slashes). */
    id: string;
    /** Persistent unique identifier (UUID) of this game; unique among published games. The m2c2kit CLI will generate this property automatically, and you should not change it. If not using the CLI, use a website like https://www.uuidgenerator.net/version4 to generate this value. */
    publishUuid: string;
    /** Version of this game */
    version: string;
    /** Uri (repository, webpage, or other location where full information about the game can be found) */
    uri?: string;
    /** Brief description of game */
    shortDescription?: string;
    /** Full description of game */
    longDescription?: string;
    /** Id of the HTML canvas that game will be drawn on. If not provided, the first canvas found will be used */
    canvasId?: string;
    /** Width of game canvas */
    width: number;
    /** Height of game canvas */
    height: number;
    /** Stretch to fill screen? Default is false */
    stretch?: boolean;
    /** Schema of trial data; JSON object where key is variable name, value is data type */
    trialSchema?: TrialSchema;
    /** Schema of scoring data; JSON object where key is variable name, value is data type */
    scoringSchema?: ScoringSchema;
    /** Default game parameters; JSON object where key is the game parameter, value is default value */
    parameters?: GameParameters;
    /** Font assets to use. The first element will be the default font */
    fonts?: Array<FontAsset>;
    /** Array of BrowserImage objects to render and load */
    images?: Array<BrowserImage>;
    /** Array of SoundAsset objects to fetch and decode */
    sounds?: Array<SoundAsset>;
    /** Show FPS in upper left corner? Default is false */
    showFps?: boolean;
    /** Color of the html body, if the game does not fill the screen. Useful for showing scene boundaries. Default is the scene background color */
    bodyBackgroundColor?: RgbaColor;
    /** Maximum number of activity metrics to log. */
    maximumRecordedActivityMetrics?: number;
    /** The FPS will be logged in game metrics if the FPS is lower than this value. Default is 59, as defined in Constants.FPS_METRIC_REPORT_THRESHOLD */
    fpsMetricReportThreshold?: number;
    /** Advance through time step-by-step, for development and debugging */
    timeStepping?: boolean;
    /** Show controls for replaying and viewing the event store? Default is false */
    showEventStoreControls?: boolean;
    /** Should the game events be saved to the event store? Default is false */
    recordEvents?: boolean;
    /** Show logs for WebGl activity? */
    logWebGl?: boolean;
    /** Should games within a session share wasm and font assets that have identical filenames, in order to reduce bandwidth? Default is true. */
    shareAssets?: boolean;
    /** Game's module name, version, and dependencies. @internal For m2c2kit library use only */
    moduleMetadata?: ModuleMetadata;
}

interface GameData extends ActivityKeyValueData {
    trials: Array<TrialData>;
    scoring: ActivityKeyValueData;
}

/**
 * A Plugin is code that can be registered to run at certain points in the game loop.
 */
interface Plugin {
    /** Short identifier of the plugin. */
    id: string;
    /** What kind of m2c2kit object does the plugin work with? */
    type: "Game" | "Session" | "Survey";
    /** Initialization code run when the plugin is registered with the game. */
    initialize?: (game: Game) => Promise<void>;
    /** Is the plugin disabled and not to be run? Default is false. @remarks Disabled plugins will still be initialized. */
    disabled?: boolean;
    /** Plugin code run before the frame update, but before the frame draw. */
    beforeUpdate?: (game: Game, deltaTime: number) => void;
    /** Plugin code run after the frame update, but before the frame draw. */
    afterUpdate?: (game: Game, deltaTime: number) => void;
}

interface M2Font {
    fontName: string;
    typeface: Typeface | undefined;
    data: ArrayBuffer | undefined;
    url: string;
    status: M2FontStatus;
    default: boolean;
}
declare const M2FontStatus: {
    /** Font was set for lazy loading, and loading has not yet been requested. */
    readonly Deferred: "Deferred";
    /** Font is in the process of loading. */
    readonly Loading: "Loading";
    /** Font has fully finished loading and is ready to use. */
    readonly Ready: "Ready";
    /** Error occurred in loading. */
    readonly Error: "Error";
};
type M2FontStatus = (typeof M2FontStatus)[keyof typeof M2FontStatus];

/**
 * Base URLs for game resources.
 */
interface GameBaseUrls {
    /** Base URL for fonts and images. */
    assets: string;
    /** Base URL for CanvasKit wasm binary. */
    canvasKitWasm: string;
}

/**
 * Fetches, loads, and provides fonts to the game.
 *
 * @internal For m2c2kit library use only
 */
declare class FontManager {
    fonts: Record<string, M2Font>;
    provider: TypefaceFontProvider;
    private canvasKit;
    private game;
    private baseUrls;
    constructor(game: Game, baseUrls: GameBaseUrls);
    /**
     * Loads font assets and makes them ready to use during the game initialization.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks Typically, a user won't call this because the m2c2kit
     * framework will call this automatically.
     *
     * @param fonts - array of FontAsset objects (name and url)
     */
    initializeFonts(fonts: Array<FontAsset> | undefined): Promise<void>;
    /**
     * Loads an array of fonts and makes them ready for the game.
     *
     * @param fonts - an array of {@link FontAsset}
     * @returns A promise that completes when all fonts have loaded
     */
    loadFonts(fonts: Array<FontAsset>): Promise<void>;
    private prepareFont;
    /**
     * Makes ready to the game a m2c2kit font ({@link M2Font}) that was
     * previously loaded, but whose processing was deferred.
     *
     * @internal For m2c2kit library use only
     *
     * @param font - M2Font to make ready
     * @returns A promise that completes when the font is ready
     */
    prepareDeferredFont(font: M2Font): Promise<void>;
    private fetchFontAsArrayBuffer;
    private registerFont;
    /**
     * Returns a m2c2kit font ({@link M2Font}) that has been loaded by the
     * FontManager.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks Typically, a user won't need to call this because font
     * initialization and processing is handled by the framework.
     *
     * @param fontName - font's name as defined in the game's font assets
     * @returns a m2c2kit font
     */
    getFont(fontName: string): M2Font;
    /**
     * Returns the m2c2kit default font ({@link M2Font}) that has been loaded
     * by the FontManager.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks Typically, a user won't need to call this because font
     * initialization and processing is handled by the framework.
     *
     * @returns a m2c2kit font
     */
    getDefaultFont(): M2Font;
    /**
     * Frees up resources allocated by the FontManager.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks This will be done automatically by the m2c2kit library; the
     * end-user must not call this.
     */
    dispose(): void;
    /**
     * Gets a CanvasKit Typeface that has been loaded.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks Typically, a user won't need to call this because font
     * initialization and processing is handled by the framework.
     *
     * @param fontName - name as defined in the game's font assets
     * @returns the requested Typeface
     */
    getTypeface(fontName: string): Typeface;
    /**
     * Gets names of fonts loaded.
     *
     * @returns array of font names loaded from the game's font assets and
     * converted into M2Font objects. The names are the names as defined
     * in the game's font assets.
     */
    getFontNames(): Array<string>;
}

/**
 * An image that has been loaded into the game.
 *
 * @remarks An M2Image is a wrapper around a CanvasKit Image, with some
 * additional properties.
 */
interface M2Image {
    /** Name of the image, as it will be referred to when creating a sprite. */
    imageName: string;
    /** The image in CanvasKit format. */
    canvaskitImage: Image | undefined;
    width: number;
    height: number;
    /** Status of the image: Deferred, Loading, Ready, or Error. */
    status: M2ImageStatus;
    /** For an image that will be fetched, this is the URL that will be attempted. This may have localization applied. */
    url?: string;
    /** Is this image a fallback localized image? */
    isFallback: boolean;
    /** For an image that will be fetched, the original URL before any localization. */
    originalUrl?: string;
    /** For a localized image that will be fetched, additional URLs to try if the URL in `url` fails. */
    fallbackLocalizationUrls?: Array<string>;
    /** An image defined by an SVG string. */
    svgString?: string;
    /** Try to localize the image by fetching a locale-specific image? Default is false. */
    localize: boolean;
}
declare const M2ImageStatus: {
    /** Image was set for lazy loading, and loading has not yet been requested. */
    readonly Deferred: "Deferred";
    /** Image is in the process of loading (fetching, rendering, and conversion to CanvasKit Image). */
    readonly Loading: "Loading";
    /** Image has fully finished loading and is ready to use. */
    readonly Ready: "Ready";
    /** Error occurred in loading. */
    readonly Error: "Error";
};
type M2ImageStatus = (typeof M2ImageStatus)[keyof typeof M2ImageStatus];

/**
 * Fetches, loads, and provides images to the game.
 */
declare class ImageManager {
    images: Record<string, M2Image>;
    private canvasKit;
    private _scratchCanvas?;
    private ctx?;
    private scale?;
    private game;
    private baseUrls;
    missingLocalizationImagePaint?: Paint;
    constructor(game: Game, baseUrls: GameBaseUrls);
    /**
     * Loads image assets and makes them ready to use during the game initialization.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks Typically, a user won't call this because the m2c2kit
     * framework will call this automatically.
     *
     * @param browserImages - array of BrowserImage objects
     * @returns A promise that completes when all images have loaded
     */
    initializeImages(browserImages: Array<BrowserImage> | undefined): Promise<void>;
    /**
     * Loads an array of images and makes them ready for the game.
     *
     * @remarks Using the browser's image rendering, this method converts the
     * images (png, jpg, svg, or svg string) into m2c2kit images ({@link M2Image}).
     * Rendering is an async activity, and thus this method returns a promise.
     * Rendering of all images is done in parallel.
     *
     * @param browserImages - an array of {@link BrowserImage}
     * @returns A promise that completes when all images have loaded
     */
    loadImages(browserImages: Array<BrowserImage>): Promise<void>;
    private configureImageLocalization;
    /**
     * Localizes the image URL by appending the locale to the image URL,
     * immediately before the file extension.
     *
     * @remarks For example, `https://url.com/file.png` in en-US locale
     * becomes `https://url.com/file.en-US.png`. A URL without an extension
     * will throw an error.
     *
     * @param url - url of the image
     * @param locale - locale in format of xx-YY, where xx is the language code
     * and YY is the country code
     * @returns localized url
     */
    private localizeImageUrl;
    /**
     * Sets an image to be re-rendered within the current locale.
     */
    reinitializeLocalizedImages(): void;
    private checkImageNamesForDuplicates;
    /**
     * Makes ready to the game a m2c2kit image ({@link M2Image}) that was
     * previously loaded, but whose browser rendering was deferred.
     *
     * @internal For m2c2kit library use only
     *
     * @param image - M2Image to render and make ready
     * @returns A promise that completes when the image is ready
     */
    prepareDeferredImage(image: M2Image): Promise<void>;
    /**
     * Uses the browser to render an image to a CanvasKit Image and make it
     * ready to the game as an M2Image.
     *
     * @remarks This is complex because we rely on the browser's rendering
     * and HTML image element processing. This involves a number of steps,
     * including events, callbacks, and error handling. In addition, there
     * are two types of images to be rendered: 1) url to an image (e.g., jpg,
     * png, svg), and 2) svg string.
     *
     * @param image - The M2Image to render
     * @returns A promise of type void that resolves when the image has been
     * rendered
     */
    private renderM2Image;
    private arrayBufferToBase64Async;
    private inferImageSubtypeFromUrl;
    /**
     * Returns a m2c2kit image ({@link M2Image}) that has been loaded by the ImageManager.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks Typically, a user won't call this because they use a higher-level
     * abstraction (m2c2kit Sprite).
     *
     * @param imageName - The name given to the previously rendered image
     * @returns A m2c2kit image
     */
    getImage(imageName: string): M2Image;
    /**
     * Adds a m2c2kit image ({@link M2Image}) to the images ready for the game.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks Typically, a programmer won't call this because images will be
     * automatically rendered and loaded in initializeImages().
     * One reason this function is called in-game is when the game takes
     * a screenshot and adds it as an outgoing image for transitions.
     *
     * @param image - A m2c2kit image
     */
    addImage(image: M2Image): void;
    /**
     * Returns the scratchCanvas, which is an extra, non-visible canvas in the
     * DOM we use so the native browser can render images like svg, png, jpg,
     * that we later will convert to CanvasKit Image.
     */
    private get scratchCanvas();
    private removeScratchCanvas;
}

interface M2Sound {
    soundName: string;
    data: ArrayBuffer | undefined;
    audioBuffer: AudioBuffer | undefined;
    audioBufferSource: AudioBufferSourceNode | undefined;
    url: string;
    status: M2SoundStatus;
}
declare const M2SoundStatus: {
    /** Sound was set for lazy loading, and loading has not yet been requested. */
    readonly Deferred: "Deferred";
    /** Sound is indicated for fetching, but fetching has not begun. */
    readonly WillFetch: "WillFetch";
    /** Sound is being fetched. */
    readonly Fetching: "Fetching";
    /** Sound has been fetched. */
    readonly Fetched: "Fetched";
    /** Sound is being decoded. */
    readonly Decoding: "Decoding";
    /** Sound has fully finished loading and is ready to use. */
    readonly Ready: "Ready";
    /** Error occurred in loading. */
    readonly Error: "Error";
};
type M2SoundStatus = (typeof M2SoundStatus)[keyof typeof M2SoundStatus];

/**
 * Fetches, loads, and provides sounds to the game.
 *
 * @internal For m2c2kit library use only
 */
declare class SoundManager {
    private sounds;
    private game;
    private baseUrls;
    private _audioContext?;
    constructor(game: Game, baseUrls: GameBaseUrls);
    get audioContext(): AudioContext;
    /**
     * Loads sound assets during the game initialization.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks Typically, a user won't call this because the m2c2kit
     * framework will call this automatically. At initialization, sounds can
     * only be fetched, not decoded because the AudioContext can not yet
     * be created (it requires a user interaction).
     *
     * @param soundAssets - array of SoundAsset objects
     */
    initializeSounds(soundAssets: Array<SoundAsset> | undefined): Promise<void>;
    /**
     * Loads an array of sound assets and makes them ready for the game.
     *
     * @remarks Loading a sound consists of 1) fetching the sound file and 2)
     * decoding the sound data. The sound is then ready to be played. Step 1
     * can be done at any time, but step 2 requires an `AudioContext`, which
     * can only be created after a user interaction. If a play `Action` is
     * attempted before the sound is ready (either it has not been fetched or
     * decoded), the play `Action` will log a warning to the console and the
     * loading process will continue in the background, and the sound will play
     * when ready. This `loadSounds()` method **does not** have to be awaited.
     *
     * @param soundAssets - an array of {@link SoundAsset}
     * @returns A promise that completes when all sounds have loaded
     */
    loadSounds(soundAssets: Array<SoundAsset>): Promise<void>;
    private fetchSounds;
    /**
     * Fetches a m2c2kit sound ({@link M2Sound}) that was previously
     * initialized with lazy loading.
     *
     * @internal For m2c2kit library use only
     *
     * @param m2Sound - M2Sound to fetch
     * @returns A promise that completes when sounds have been fetched
     */
    fetchDeferredSound(m2Sound: M2Sound): Promise<void>;
    /**
     * Checks if the SoundManager has sounds needing decoding.
     *
     * @internal For m2c2kit library use only
     *
     * @returns true if there are sounds that have been fetched and are waiting
     * to be decoded (status is `M2SoundStatus.Fetched`)
     */
    hasSoundsToDecode(): boolean;
    /**
     * Decodes all fetched sounds from bytes to an `AudioBuffer`.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks This method will be called after the `AudioContext` has been
     * created and if there are fetched sounds waiting to be decoded.
     *
     * @returns A promise that completes when all fetched sounds have been decoded
     */
    decodeFetchedSounds(): Promise<void[]>;
    /**
     * Decodes a sound from bytes to an `AudioBuffer`.
     *
     * @param sound - sound to decode
     */
    private decodeSound;
    /**
     * Returns a m2c2kit sound ({@link M2Sound}) that has been entered into the
     * SoundManager.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks Typically, a user won't need to call this because sound
     * initialization and processing is handled by the framework.
     *
     * @param soundName - sound's name as defined in the game's sound assets
     * @returns a m2c2kit sound
     */
    getSound(soundName: string): M2Sound;
    /**
     * Frees up resources allocated by the SoundManager.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks This will be done automatically by the m2c2kit library; the
     * end-user must not call this.
     */
    dispose(): void;
    /**
     * Gets names of sounds entered in the `SoundManager`.
     *
     * @remarks These are sounds that the `SoundManager` is aware of. The sounds
     * may not be ready to play (may not have been fetched or decoded yet).
     *
     * @returns array of sound names
     */
    getSoundNames(): Array<string>;
}

/** Key value pairs of file URLs and hashed file URLs */
type Manifest = {
    [originalUrl: string]: string;
};

/** Base interface for all Game events. */
interface GameEvent extends M2Event<Activity> {
    target: Game;
}

type M2EventTarget = M2Node | Element | ImageManager | I18n;

/**
 * Event store mode.
 */
declare const EventStoreMode: {
    readonly Disabled: "Disabled";
    readonly Record: "Record";
    readonly Replay: "Replay";
};
type EventStoreMode = (typeof EventStoreMode)[keyof typeof EventStoreMode];
declare class EventStore {
    private events;
    private replayBeginTimestamp;
    private firstTimestamp;
    replayThoughSequence: number;
    serializedEventsBeforeReplay: string;
    mode: EventStoreMode;
    private serializeEvent;
    addEvent(event: M2Event<M2EventTarget>): void;
    addEvents(events: Array<M2Event<M2EventTarget>>): void;
    clearEvents(): void;
    record(): void;
    replay(events?: M2Event<M2EventTarget>[]): void;
    getEvents(): M2Event<M2EventTarget>[];
    dequeueEvents(timestamp: number): M2Event<M2EventTarget>[];
    get eventQueueLength(): number;
    /**
     * Sorts the events in the event store.
     *
     * @remarks The events are sorted by sequence number in ascending order.
     */
    private sortEventStore;
}

declare class M2NodeFactory {
    /**
     * The `M2NodeFactory` creates nodes of the specified type with the specified
     * options for event replay.
     */
    constructor();
    /**
     * Creates a new node of the specified type with the specified options.
     *
     * @param type - The type of node to create
     * @param compositeType - The composite type of the node to create
     * @param options - The options to use when creating the node
     * @returns created node
     */
    createNode(type: string, compositeType: string | undefined, options: M2NodeOptions): M2Node;
    private hasClassRegistration;
}

interface EventMaterializerOptions {
    game: Game;
    nodeFactory: M2NodeFactory;
    freeNodesScene: Scene;
    configureI18n(localizationOptions: LocalizationOptions): Promise<void>;
}
declare class EventMaterializer {
    private game;
    private nodeFactory;
    private freeNodesScene;
    private eventMaterializers;
    private configureI18n;
    /**
     * The `EventMaterializer` class is responsible for taking serialized events
     * from an event store and replaying them in the game.
     */
    constructor(options: EventMaterializerOptions);
    /**
     * Deserialize the events by materializing them into the game.
     *
     * @remarks This method is called when the game is replaying events from the
     * event store. Materializing an event means to take the event and apply its
     * changes to the game. For example, a `NodeNew` event will create a new node
     * in the game. A `NodePropertyChange` event will change a property of a node
     * in the game.
     *
     * @param events - The events to materialize
     */
    materialize(events: ReadonlyArray<M2Event<M2EventTarget>>): void;
    private materializeCompositeEvent;
    private materializeNodeNewEvent;
    private materializeNodePropertyChangeEvent;
    private materializeNodeAddChildEvent;
    private materializeNodeRemoveChildEvent;
    private materializeDomPointerDownEvent;
    private materializeBrowserImageDataReadyEvent;
    private materializeI18nDataReadyEvent;
    private materializeScenePresentEvent;
}

interface TrialData {
    [key: string]: string | number | boolean | object | undefined | null;
}
declare class Game implements Activity {
    readonly type = ActivityType.Game;
    _canvasKit?: CanvasKit;
    sessionUuid: string;
    uuid: string;
    name: string;
    id: string;
    publishUuid: string;
    studyId?: string;
    studyUuid?: string;
    moduleMetadata: ModuleMetadata;
    readonly canvasKitWasmVersion = "__CANVASKITWASM_VERSION__";
    options: GameOptions;
    beginTimestamp: number;
    beginIso8601Timestamp: string;
    private eventListeners;
    private gameMetrics;
    private fpsMetricReportThreshold;
    private maximumRecordedActivityMetrics;
    private stepCount;
    private steppingNow;
    i18n?: I18n;
    private warmupFunctionQueue;
    private warmupFinished;
    private _dataStores?;
    private plugins;
    additionalParameters?: unknown;
    staticTrialSchema: {
        [key: string]: JsonSchemaDataTypeScriptTypes;
    };
    private _fontManager?;
    private _imageManager?;
    private _soundManager?;
    manifest?: Manifest;
    eventStore: EventStore;
    private nodeFactory;
    private _eventMaterializer?;
    /** Nodes created during event replay */
    materializedNodes: M2Node[];
    /**
     * The base class for all games. New games should extend this class.
     *
     * @param options - {@link GameOptions}
     */
    constructor(options: GameOptions);
    private createFreeNodesScene;
    private getImportedModuleBaseUrl;
    private addLocalizationParametersToGameParameters;
    init(): Promise<void>;
    /**
     * Loads the canvaskit wasm binary.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks The CanvasKit object is initialized with this method, rather
     * than calling `CanvasKitInit()` directly, so that this method can be
     * easily mocked in tests.
     *
     * @param canvasKitWasmUrl - URL to the canvaskit wasm binary
     * @returns a promise that resolves to a CanvasKit object
     */
    loadCanvasKit(canvasKitWasmUrl: string): Promise<CanvasKit>;
    /**
     * Resolves base URL locations for game assets and CanvasKit wasm binary.
     *
     * @internal For m2c2kit library use only
     *
     * @param game - game to resolve base URLs for
     * @returns base URLs for game assets and CanvasKit wasm binary
     */
    resolveGameBaseUrls(game: Game): Promise<GameBaseUrls>;
    private configureI18n;
    private waitForErudaInitialization;
    initialize(): Promise<void>;
    /**
     * Returns the manifest, if manifest.json was created during the build.
     *
     * @internal For m2c2kit library use only
     *
     * @remarks This should be called without any parameters. The
     * `manifestJsonUrl` parameter's default value will be modified during the
     * build step, if the build was configured to include the manifest.json
     *
     * @param manifestJsonUrl - Do not use this parameter. Allow the default.
     * @returns a promise that resolves to the manifest object, or an empty object if there is no manifest
     */
    loadManifest(manifestJsonUrl?: string): Promise<Manifest>;
    get fontManager(): FontManager;
    set fontManager(fontManager: FontManager);
    get imageManager(): ImageManager;
    set imageManager(imageManager: ImageManager);
    get soundManager(): SoundManager;
    set soundManager(soundManager: SoundManager);
    get eventMaterializer(): EventMaterializer;
    set eventMaterializer(eventMaterializer: EventMaterializer);
    /**
     * Adds prefixes to a key to ensure that keys are unique across activities
     * and studies.
     *
     * @remarks When a value is saved to the key-value data store, the key must
     * be prefixed with additional information to ensure that keys are unique.
     * The prefixes will include the activity id and publish UUID, and possibly
     * the study id and study UUID, if they are set (this is so that keys are
     * unique across different studies that might use the same activity).
     *
     * @param key - item key to add prefixes to
     * @returns the item key with prefixes added
     */
    private addPrefixesToKey;
    /**
     * Saves an item to the activity's key-value store.
     *
     * @remarks The underlying persistence provider of the key-value store must
     * have been previously provided in `SessionOptions`.
     * @example
     * import { LocalDatabase } from "@m2c2kit/db";
     * const session = new Session({
     *   dataStores: [new LocalDatabase()]
     *   ...
     * });
     * @param key - item key
     * @param value - item value
     * @param globalStore - if true, treat the item as "global" and not
     * associated with a specific activity; global items can be accessed
     * by any activity. Default is false.
     * @returns key
     */
    storeSetItem(key: string, value: string | number | boolean | object | undefined | null, globalStore?: boolean): Promise<string>;
    /**
     * Gets an item value from the activity's key-value store.
     *
     * @remarks The underlying persistence provider of the key-value store must
     * have been previously provided in `SessionOptions`.
     * @example
     * import { LocalDatabase } from "@m2c2kit/db";
     * const session = new Session({
     *   dataStores: [new LocalDatabase()]
     *   ...
     * });
     * @param key - item key
     * @param globalStore - if true, treat the item as "global" and not
     * associated with a specific activity; global items can be accessed
     * by any activity. Default is false.
     * @returns value of the item
     */
    storeGetItem<T extends string | number | boolean | object | undefined | null>(key: string, globalStore?: boolean): Promise<T>;
    /**
     * Deletes an item value from the activity's key-value store.
     *
     * @remarks The underlying persistence provider of the key-value store must
     * have been previously provided in `SessionOptions`.
     * @example
     * import { LocalDatabase } from "@m2c2kit/db";
     * const session = new Session({
     *   dataStores: [new LocalDatabase()]
     *   ...
     * });
     * @param key - item key
     * @param globalStore - if true, treat the item as "global" and not
     * associated with a specific activity; global items can be accessed
     * by any activity. Default is false.
     */
    storeDeleteItem(key: string, globalStore?: boolean): Promise<void>;
    /**
     * Deletes all items from the activity's key-value store.
     *
     * @remarks The underlying persistence provider of the key-value store must
     * have been previously provided in `SessionOptions`.
     * @example
     * import { LocalDatabase } from "@m2c2kit/db";
     * const session = new Session({
     *   dataStores: [new LocalDatabase()]
     *   ...
     * });
     */
    storeClearItems(): Promise<void>;
    /**
     * Returns keys of all items in the activity's key-value store.
     *
     * @remarks The underlying persistence provider of the key-value store must
     * have been previously provided in `SessionOptions`.
     * @example
     * import { LocalDatabase } from "@m2c2kit/db";
     * const session = new Session({
     *   dataStores: [new LocalDatabase()]
     *   ...
     * });
     * @param globalStore - if true, treat the item as "global" and not
     * associated with a specific activity; global items can be accessed
     * by any activity. Default is false.
     */
    storeItemsKeys(globalStore?: boolean): Promise<string[]>;
    /**
     * Determines if a key exists in the activity's key-value store.
     *
     * @remarks The underlying persistence provider of the key-value store must
     * have been previously provided in `SessionOptions`.
     * @example
     * import { LocalDatabase } from "@m2c2kit/db";
     * const session = new Session({
     *   dataStores: [new LocalDatabase()]
     *   ...
     * });
     * @param key - item key
     * @param globalStore - if true, treat the item as "global" and not
     * associated with a specific activity; global items can be accessed
     * by any activity. Default is false.
     * @returns true if the key exists, false otherwise
     */
    storeItemExists(key: string, globalStore?: boolean): Promise<boolean>;
    get dataStores(): IDataStore[];
    set dataStores(dataStores: IDataStore[]);
    hasDataStores(): boolean;
    private getLocalizationOptionsFromGameParameters;
    private isLocalizationRequested;
    setParameters(additionalParameters: unknown): void;
    get canvasKit(): CanvasKit;
    set canvasKit(canvasKit: CanvasKit);
    /** The scene, or its name as a string, to be presented when the game is started. If this is undefined, the game will start with the first scene that has been added */
    entryScene?: Scene | string;
    data: GameData;
    /** The 0-based index of the current trial */
    trialIndex: number;
    private htmlCanvas?;
    surface?: Surface;
    private showFps?;
    private bodyBackgroundColor?;
    currentScene?: Scene;
    private priorUpdateTime?;
    private fpsTextFont?;
    private fpsTextPaint?;
    private drawnFrames;
    private lastFpsUpdate;
    private nextFpsUpdate;
    private fpsRate;
    private animationFramesRequested;
    private limitFps;
    private gameStopRequested;
    private webGlRendererInfo;
    canvasCssWidth: number;
    canvasCssHeight: number;
    scenes: Scene[];
    freeNodesScene: Scene;
    private incomingSceneTransitions;
    private currentSceneSnapshot?;
    private pendingScreenshot?;
    /**
     * Adds a node as a free node (a node that is not part of a scene)
     * to the game.
     *
     * @remarks Once added to the game, a free node will always be drawn,
     * and it will not be part of any scene transitions. This is useful if
     * a node must persistently be drawn and not move with scene
     * transitions. The appearance of the free node must be managed
     * by the programmer. Note: internally, the free nodes are part of a
     * special scene (named "__freeNodesScene"), but this scene is handled
     * apart from regular scenes in order to achieve the free node behavior.
     *
     * @param node - node to add as a free node
     */
    addFreeNode(node: M2Node): void;
    /**
     * @deprecated Use addFreeNode() instead
     */
    addFreeEntity(node: M2Node): void;
    /**
     * Removes a free node from the game.
     *
     * @remarks Throws exception if the node to remove is not currently added
     * to the game as a free node
     *
     * @param node - the free node to remove or its name as a string
     */
    removeFreeNode(node: M2Node | string): void;
    /**
     * @deprecated Use removeFreeNode() instead
     */
    removeFreeEntity(node: M2Node | string): void;
    /**
     * Removes all free nodes from the game.
     */
    removeAllFreeNodes(): void;
    /**
     * @deprecated Use removeAllFreeNodes() instead
     */
    removeAllFreeEntities(): void;
    /**
     * Returns array of free nodes that have been added to the game.
     *
     * @returns array of free nodes
     */
    get freeNodes(): Array<M2Node>;
    /**
     * @deprecated Use Game.freeEntities instead
     */
    get freeEntities(): Array<M2Node>;
    /**
     * Adds a scene to the game.
     *
     * @remarks A scene, and its children nodes, cannot be presented unless it
     * has been added to the game object. A scene can be added to the game
     * only once.
     *
     * @param scene
     */
    addScene(scene: Scene): void;
    /**
     * Adds events from a node and its children to the game's event store.
     *
     * @remarks This method is first called when a scene is added to the game.
     * If the scene or any of its descendants was constructed or had its
     * properties changed before it was added to the game, these events were
     * stored within the node (because the game event store was not yet
     * available). This method retrieves these events from the node and adds
     * them to the game's event store.
     *
     * @param node - node that contains events to add
     */
    private addNodeEvents;
    /**
     * Adds multiple scenes to the game.
     *
     * @param scenes
     */
    addScenes(scenes: Array<Scene>): void;
    /**
     * Removes a scene from the game.
     *
     * @param scene - the scene to remove or its name as a string
     */
    removeScene(scene: Scene | string): void;
    /**
     * Specifies the scene that will be presented upon the next frame draw.
     *
     * @param scene - the scene, its string name, or UUID
     * @param transition
     */
    presentScene(scene: string | Scene, transition?: Transition): void;
    /**
     * Gets the value of the game parameter. If parameterName
     * is not found, then throw exception.
     *
     * @param parameterName - the name of the game parameter whose value is requested
     * @returns
     */
    getParameter<T>(parameterName: string): T;
    /**
     * Gets the value of the game parameter. If parameterName
     * is not found, then return fallback value
     *
     * @param parameterName - the name of the game parameter whose value is requested
     * @param fallbackValue - the value to return if parameterName is not found
     * @returns
     */
    getParameterOrFallback<T, U>(parameterName: string, fallbackValue: U): T | U;
    /**
     * Returns true if a game parameter exists for the given string.
     *
     * @param parameterName - the name of the game parameter whose existence is queried
     * @returns
     */
    hasParameter(parameterName: string): boolean;
    /**
     * Starts the game loop.
     *
     * @remarks If entryScene is undefined, the game will start with scene
     * defined in the game object's entryScene property. If that is undefined,
     * the game will start with the first scene in the game object's scenes.
     * If there are no scenes in the game object's scenes, it will throw
     * an error.
     * Although the method has no awaitable calls, we will likely do
     * so in the future. Thus this method is async.
     *
     * @param entryScene - The scene (Scene object or its string name) to display when the game starts
     */
    start(entryScene?: Scene | string): Promise<void>;
    playEventsHandler(mouseEvent: MouseEvent): void;
    private replayEventsButtonEnabled;
    private setReplayEventsButtonEnabled;
    private setStopReplayButtonEnabled;
    private addEventControlsToDom;
    private addTimeSteppingControlsToDom;
    private updateTimeSteppingOutput;
    private advanceStepsHandler;
    private removeTimeSteppingControlsFromDom;
    /**
     * Warms up the Skia-based shaders underlying canvaskit by drawing
     * primitives.
     *
     * @remarks Some canvaskit methods take extra time the first time they are
     * called because a WebGL shader must be compiled. If the method is part of
     * an animation, then this may cause frame drops or "jank." To alleviate
     * this, we can "warm up" the shader associated with the method by calling
     * it at the beginning of our game. Thus, all warmup operations will be
     * concentrated at the beginning and will not be noticeable. This warmup
     * function draws a series of primitives to the canvas. From testing,
     * the actual WebGl shaders compiled by canvaskit vary depending on the
     * device hardware. Thus, warmup functions that might call all relevant
     * WebGL shaders on desktop hardware may not be sufficient for mobile.
     *
     * @param canvas - the canvaskit-canvas to draw on
     * @param positionOffset - an offset to add to the position of each
     * primitive. Different shaders may be compiled depending on if the position
     * was fractional or not. This offset allows us to warmup both cases.
     */
    private warmupShadersWithPrimitives;
    /**
     * Warms up the Skia-based shaders underlying canvaskit by drawing
     * m2c2kit nodes.
     *
     * @remarks While warmupShadersWithPrimitives draws a predefined set of
     * primitives, this function initializes and draws all canvaskit objects
     * that have been defined as m2c2kit nodes. This not only is another
     * opportunity for shader warmup, it also does the node initialization.
     *
     * @param canvas - the canvaskit-canvas to draw on
     */
    private warmupShadersWithScenes;
    stop(): void;
    /**
     * Frees up resources that were allocated to run the game.
     *
     * @remarks This will be done automatically by the m2c2kit library; the
     * end-user must not call this. FOR INTERNAL USE ONLY.
     */
    dispose(): void;
    private initData;
    private validateSchema;
    private propertySchemaDataTypeIsValid;
    private getDeviceMetadata;
    /**
     * Adds data to the game's TrialData object.
     *
     * @remarks `variableName` must be previously defined in the
     * {@link TrialSchema} object in {@link GameOptions}. The type of the value
     * must match what was defined in the trial schema, otherwise an error is
     * thrown.
     *
     * @param variableName - variable to be set
     * @param value - value of the variable to set
     */
    addTrialData(variableName: string, value: JsonSchemaDataTypeScriptTypes): void;
    /**
     * Adds data to the game's scoring data.
     *
     * @remarks The variable name (or object property names) must be previously
     * defined in the {@link ScoringSchema} object in {@link GameOptions}.
     * The type of the value must match what was defined in the scoring schema,
     * otherwise an error is thrown.
     *
     * @param variableNameOrObject - Either a variable name (string) or an object
     * containing multiple key-value pairs to add all at once.
     * @param value - Value of the variable to set (only used when
     * variableNameOrObject is a variable name string).
     */
    addScoringData(variableNameOrObject: string | Record<string, JsonSchemaDataTypeScriptTypes> | Array<Record<string, JsonSchemaDataTypeScriptTypes>>, value?: JsonSchemaDataTypeScriptTypes): void;
    /**
     * Helper method to validate and set a single scoring variable
     *
     * @param variableName - Name of the variable to set
     * @param value - Value to set
     * @private
     */
    private validateAndSetScoringVariable;
    /**
     * Adds custom trial schema to the game's trialSchema object.
     *
     * @param schema - Trial schema to add
     *
     * @remarks This is useful if you want to add custom trial variables.
     * This must be done before Session.start() is called, because
     * Session.start() will call Game.start(), which will initialize
     * the trial schema.
     */
    addTrialSchema(schema: TrialSchema): void;
    /**
     * Sets the value of a variable that will be the same for all trials.
     *
     * @remarks This sets the value of a variable that is the same across
     * all trials ("static"). This is useful for variables that are not
     * part of the trial schema, but that you want to save for each trial in
     * your use case. For example, you might want to save the subject's
     * participant ID for each trial, but this is not part of the trial schema.
     * Rather than modify the source code for the game, you can do the following
     * to ensure that the participant ID is saved for each trial:
     *
     *   game.addTrialSchema(&#123
     *     participant_id: &#123
     *       type: "string",
     *       description: "ID of the participant",
     *     &#125;
     *   &#125;);
     *   game.addStaticTrialData("participant_id", "12345");
     *
     *  When Game.trialComplete() is called, the participant_id variable will
     *  be saved for the trial with the value "12345".
     *
     * @param variableName - variable to be set
     * @param value - value of the variable to set
     */
    addStaticTrialData(variableName: string, value: JsonSchemaDataTypeScriptTypes): void;
    /**
     * Should be called when the current trial has completed. It will
     * also increment the trial index.
     *
     * @remarks Calling will trigger the onActivityResults callback function,
     * if one was provided in SessionOptions. This is how the game communicates
     * trial data to the parent session, which can then save or process the data.
     * It is the responsibility of the the game programmer to call this at
     * the appropriate time. It is not triggered automatically.
     */
    trialComplete(): void;
    /**
     * Marks scoring as complete.
     *
     * @remarks This method must be called after the game has finished adding
     * scores using addScoringData(). Calling will trigger the onActivityResults
     * callback function, if one was provided in SessionOptions. This is how the
     * game communicates scoring data to the parent session, which can then save
     * or process the data. It is the responsibility of the the game programmer
     * to call this at the appropriate time. It is not triggered automatically.
     */
    scoringComplete(): void;
    /**
     * The m2c2kit engine will automatically include these schema and their
     * values in the scoring data.
     */
    private readonly automaticScoringSchema;
    /**
     * The m2c2kit engine will automatically include these schema and their
     * values in the trial data.
     */
    private readonly automaticTrialSchema;
    private makeNewGameDataSchema;
    private makeGameDataSchema;
    /**
     * GameParameters combines default parameters values and
     * JSON Schema to describe what the parameters are.
     * The next two functions extract GameParameters's two parts
     * (the default values and the schema) so they can be returned
     * separately in the activityData event
     */
    private makeGameActivityConfiguration;
    private makeGameActivityConfigurationSchema;
    private makeScoringDataSchema;
    /**
     * Should be called when current game has ended successfully.
     *
     * @remarks This will send an ActivityEnd event to any listeners, such as
     * a function provided to Game.onEnd() or a callback defined in
     * SessionOptions.activityCallbacks.onActivityLifecycle. This is how the
     * game can communicate changes in activity state to the parent session.
     * It is the responsibility of the the game programmer to call this at the
     * appropriate time. It is not triggered automatically.
     */
    end(): void;
    /**
     * Should be called when current game has been canceled by a user action.
     *
     * @remarks This will send an ActivityCancel event to any listeners, such as
     * a function provided to Game.onCancel() or a callback defined in
     * SessionOptions.activityCallbacks.onActivityLifecycle. This is how the
     * game can communicate changes in activity state to the parent session.
     * It is the responsibility of the the game programmer to call this at the
     * appropriate time. It is not triggered automatically.
     */
    cancel(): void;
    private setupHtmlCanvases;
    private setupCanvasKitSurface;
    private interceptWebGlCalls;
    private setupFpsFont;
    private setupCanvasDomEventHandlers;
    private loop;
    snapshots: Image[];
    private updateGameTime;
    private handleIncomingSceneTransitions;
    /**
     * Creates a scene that has a screen shot of the current scene.
     *
     * @param outgoingSceneImage - an image of the current scene
     * @returns - the scene with the screen shot
     */
    private createOutgoingScene;
    /**
     * Registers a plugin with the game.
     *
     * @remarks Upon registration, the plugin's optional asynchronous
     * `initialize()` method will be called.
     *
     * @param plugin - Plugin to register
     */
    registerPlugin(plugin: Plugin): Promise<void>;
    /**
     * Updates active scenes and executes plugins.
     *
     */
    private update;
    /**
     * Updates all active scenes and their children.
     */
    private updateScenes;
    /**
     * Executes all active plugins before scenes are updated.
     */
    private executeBeforeUpdatePlugins;
    /**
     * Executes all active plugins after scenes have been updated.
     */
    private executeAfterUpdatePlugins;
    private draw;
    private calculateFps;
    private takeCurrentSceneSnapshot;
    private handlePendingScreenshot;
    /**
     * Takes screenshot of canvas
     *
     * @remarks Coordinates should be provided unscaled; that is, the method
     * will handle any scaling that happened due to device pixel ratios
     * not equal to 1. This returns a promise because the screenshot request
     * must be queued and completed once a draw cycle has completed. See
     * the loop() method.
     *
     * @param sx - Upper left coordinate of screenshot
     * @param sy - Upper right coordinate of screenshot
     * @param sw - width of area to screenshot
     * @param sh - height of area to screenshot
     * @returns Promise of Uint8Array of image data
     */
    takeScreenshot(sx?: number, sy?: number, sw?: number, sh?: number): Promise<Uint8Array | null>;
    private animateSceneTransition;
    private drawFps;
    /**
     * Creates an event listener for a node based on the node name
     *
     * @remarks Typically, event listeners will be created using a method specific to the event, such as onTapDown(). This alternative allows creation with node name.
     *
     * @param type - the type of event to listen for, e.g., "tapDown"
     * @param nodeName - the node name for which an event will be listened
     * @param callback - the callback to be invoked when the event occurs
     * @param callbackOptions
     */
    createEventListener(type: M2EventType, nodeName: string, callback: (event: M2NodeEvent) => void, callbackOptions?: CallbackOptions): void;
    /**
     * Returns array of all nodes that have been added to the game object.
     */
    get nodes(): Array<M2Node>;
    /**
     * @deprecated use Game.nodes instead
     */
    get entities(): Array<M2Node>;
    /**
     * Receives callback from DOM PointerDown event
     *
     * @param domPointerEvent - PointerEvent from the DOM
     * @returns
     */
    private htmlCanvasPointerDownHandler;
    private htmlCanvasPointerUpHandler;
    private htmlCanvasPointerMoveHandler;
    private htmlCanvasPointerLeaveHandler;
    private documentKeyDownHandler;
    private documentKeyUpHandler;
    /**
     * Determines if/how m2c2kit nodes respond to the DOM PointerDown event
     *
     * @param node - node that might be affected by the DOM PointerDown event
     * @param nodeEvent
     * @param domPointerEvent
     */
    private processDomPointerDown;
    private processDomPointerUp;
    private processDomPointerMove;
    private processDomPointerLeave;
    private raiseM2PointerDownEvent;
    private raiseTapDownEvent;
    private raiseTapLeaveEvent;
    private raiseM2PointerUpEvent;
    private raiseTapUpEvent;
    private raiseTapUpAny;
    private raiseM2PointerMoveEvent;
    private raiseM2PointerLeaveEvent;
    private raiseM2DragStartEvent;
    private raiseM2DragEvent;
    private raiseM2DragEndEvent;
    private raiseSceneEvent;
    private calculatePointWithinNodeFromDomPointerEvent;
    /**
     * Executes a callback when the game starts.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onStart(callback: (activityLifecycleEvent: ActivityLifecycleEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the game is canceled.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onCancel(callback: (activityLifecycleEvent: ActivityLifecycleEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the game ends.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onEnd(callback: (activityLifecycleEvent: ActivityLifecycleEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the game generates data.
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onData(callback: (activityResultsEvent: ActivityResultsEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the game begins its warmup.
     *
     * @internal For m2c2kit library use only
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onWarmupStart(callback: (gameEvent: GameEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the game ends its warmup.
     *
     * @internal For m2c2kit library use only
     *
     * @param callback - function to execute.
     * @param options - options for the callback.
     */
    onWarmupEnd(callback: (activityEvent: ActivityEvent) => void, options?: CallbackOptions): void;
    private addEventListener;
    private raiseActivityEventOnListeners;
    private raiseEventOnListeningNodes;
    private sceneCanReceiveUserInteraction;
    /**
     *
     * Checks if the given canvas point is within the node's bounds.
     *
     * @param node - node to check bounds for
     * @param x - x coordinate of the canvas point
     * @param y - y coordinate of the canvas point
     * @returns true if x, y point is within the node's bounds
     */
    private IsCanvasPointWithinNodeBounds;
}

/**
 * Map of placeholders to values for use in string interpolation.
 */
interface StringInterpolationMap {
    [placeholder: string]: string;
}

interface TranslationOptions {
    [key: string]: unknown;
}
interface TextLocalizationResult {
    text: string;
    fontSize?: number;
    fontName?: string;
    fontNames?: string[];
    isFallbackOrMissingTranslation: boolean;
}
declare class I18n {
    private _translation;
    locale: string;
    fallbackLocale: string;
    baseLocale: string;
    missingLocalizationColor: RgbaColor | undefined;
    game: Game;
    /**
     * The I18n class localizes text and images.
     *
     * @param game - game instance
     * @param options - {@link LocalizationOptions}
     */
    constructor(game: Game, options: LocalizationOptions);
    /**
     * Initializes the I18n instance and sets the initial locale.
     *
     * @remarks If the game instance has been configured to use a data store,
     * the previously used locale and fallback locale will be retrieved from the
     * data store if they have been previously set.
     */
    initialize(): Promise<void>;
    private configureInitialLocale;
    private localeTranslationAvailable;
    switchToLocale(locale: string): void;
    /**
     * Returns the localized text and font information for the given key in the
     * current locale.
     *
     * @param key - Translation key
     * @param interpolation - Interpolation keys and values to replace
     * string interpolation placeholders in the translated text
     * @returns object with the localized text, font information, and whether the
     * translation is a fallback.
     */
    getTextLocalization(key: string, interpolation?: StringInterpolationMap): TextLocalizationResult;
    /**
     *
     * @param key - Translation key to be translated
     * @param interpolation - String interpolation keys and values to replace
     * @returns result object with the localized text, font
     */
    private attemptTranslation;
    /**
     * Handles translation placeholders in a string.
     *
     * @remarks The value of a translation placeholder (text within `[[]]`)
     * may also contain string interpolation placeholders (`{{}}`), so we need
     * to handle that as well.
     *
     * @param key - Translation key for the string to be localized
     * @param initialResult - Initial translation result for the string
     * @param interpolation - Interpolation keys and values to replace
     * interpolation placeholders in the translated text
     * @returns result object with the localized text,
     */
    private handleTranslationPlaceholders;
    /**
     * Translates a translation placeholder key to its text and collects font properties.
     *
     * @param placeholderKey - Translation key for the placeholder
     * @param fontProps - Font properties sets to collect font information
     * @param interpolation - Interpolation keys and values to replace
     * string interpolation placeholders in the translated text
     * @returns result object with the translated text and whether it is a fallback translation
     */
    private translatePlaceholder;
    /**
     * Extracts translation key placeholders from a string.
     *
     * @remarks Translation key placeholders are denoted by double square brackets,
     * e.g., "The translated word is [[RED]]", and RED is a key for translation.
     *
     * @param s - string to search for placeholders
     * @returns an array of placeholders found in the string, without the square
     * brackets
     */
    private getTranslationPlaceholders;
    /**
     * Logs warnings if the string to be localized has conflicting font
     * properties.
     *
     * @remarks This can happen due to multiple placeholders in the string
     * that specify different font sizes, font names, or font names arrays.
     *
     * @param key - Translation key for which the string is being localized
     * @param fontProps - font properties sets collected from the placeholders
     */
    private warnConflictingFontProperties;
    /**
     * Returns the translation text for the given key in the current locale.
     *
     * @remarks Optional interpolation keys and values can be provided to replace
     * placeholders in the translated text. Placeholders are denoted by double
     * curly braces.
     *
     * @param key - key to look up in the translation
     * @param options - `TranslationOptions`, such as interpolation keys/values
     * and whether to translate using the fallback locale
     * @returns the translation text for the key in the current locale, or
     * undefined if the key is not found
     *
     * @example
     *
     * ```
     * const translation: Translation = {
     *   "en-US": {
     *     "GREETING": "Hello, {{name}}."
     *   }
     * }
     * ...
     * i18n.t("GREETING", { name: "World" }); // returns "Hello, World."
     *
     * ```
     */
    t(key: string, options?: TranslationOptions): string | undefined;
    /**
     * Returns the translation text and font information for the given key in the
     * current locale.
     *
     * @remarks Optional interpolation keys and values can be provided to replace
     * placeholders in the translated text. Placeholders are denoted by double
     * curly braces. See method {@link I18n.t()} for interpolation example.
     *
     * @param key - key to look up in the translation
     * @param options - `TranslationOptions`, such as interpolation keys/values
     * and whether to translate using the fallback locale
     * @returns the translation text and font information for the key in the
     * current locale, or undefined if the key is not found
     */
    tf(key: string, options?: TranslationOptions): TextAndFont | undefined;
    private getKeyText;
    private getKeyTextAndFont;
    private insertInterpolations;
    get translation(): Translation;
    set translation(value: Translation);
    private getEnvironmentLocale;
    private mergeAdditionalTranslation;
    static makeLocalizationParameters(): GameParameters;
    private isTextWithFontCustomization;
    private isStringOrTextWithFontCustomization;
    private isStringArray;
    private isString;
}

/**
 * Base interface for all m2c2kit events.
 *
 * @remarks I would have named it Event, but that would collide with
 * the existing DOM Event
 */
interface M2Event<T> {
    /** Type of event. */
    type: M2EventType | string;
    /** The object on which the event occurred. If the event has gone through serialization, the string will be the object's UUID (if an `M2Node`) or class name. */
    target: T | string;
    /** Has the event been taken care of by the listener and not be dispatched to other targets? */
    handled?: boolean;
    /** Timestamp of the event, `from performance.now()` */
    timestamp: number;
    /** Timestamp of th event, from `new Date().toISOString()` */
    iso8601Timestamp: string;
    /** Sequence number of event.
     * @remarks Sequence number is guaranteed to reflect order of events, but
     * not necessarily contiguous, e.g., could be 1, 2, 5, 10, 11, 24.
     * */
    sequence?: number;
}
interface DomPointerDownEvent extends M2Event<Element> {
    type: "DomPointerDown";
    target: Element;
    x: number;
    y: number;
}
interface CompositeEvent extends M2NodeEvent {
    /** The Composite on which the event occurred. If the event has gone through serialization, the string will be the composite's UUID.  */
    target: Composite | string;
    type: "Composite";
    /** The type of the composite node. */
    compositeType: string;
    /** The type of the composite event. */
    compositeEventType: string;
    /** The composite event properties */
    [key: string]: number | string | boolean | object | null | undefined;
}
interface M2NodeNewEvent extends M2Event<M2Node> {
    type: "NodeNew";
    target: M2Node;
    /** The type of the new node. */
    nodeType: M2NodeType | string;
    /** If a composite node, the type of the composite. */
    compositeType?: string;
    /** The options of the at the time of instantiation. This includes options for any base types and interfaces. */
    nodeOptions: M2NodeOptions;
}
interface M2NodeAddChildEvent extends M2Event<M2Node> {
    type: "NodeAddChild";
    target: M2Node;
    /** The node's unique identifier (UUID). */
    uuid: string;
    /** The child node's unique identifier (UUID). */
    childUuid: string;
}
interface M2NodeRemoveChildEvent extends M2Event<M2Node> {
    type: "NodeRemoveChild";
    target: M2Node;
    /** The node's unique identifier (UUID). */
    uuid: string;
    /** The child node's unique identifier (UUID). */
    childUuid: string;
}
interface ScenePresentEvent extends M2Event<M2Node> {
    type: "ScenePresent";
    target: Scene;
    /** The node's unique identifier (UUID). */
    uuid: string;
    /** Transition type of the presented scene. */
    transitionType: TransitionType;
    direction?: TransitionDirection;
    duration?: number;
    easingType?: string;
}
interface M2NodePropertyChangeEvent extends M2Event<M2Node> {
    type: "NodePropertyChange";
    target: M2Node;
    /** The node's unique identifier (UUID). */
    uuid: string;
    /** The property that changed. */
    property: string;
    /** The new value of the property. */
    value: string | number | boolean | object | null | undefined;
}
interface BrowserImageDataReadyEvent extends M2Event<ImageManager> {
    type: "BrowserImageDataReady";
    target: ImageManager;
    /** The image name. */
    imageName: string;
    /** Width to scale image to */
    width: number;
    /** Height to scale image to */
    height: number;
    /** The image data URL. */
    dataUrl?: string;
    /** SVG string */
    svgString?: string;
}
interface I18nDataReadyEvent extends M2Event<I18n> {
    type: "I18nDataReadyEvent";
    target: I18n;
    localizationOptions: LocalizationOptions;
}
/**
 * The different events that are dispatched by m2c2kit core.
 */
declare const M2EventType: {
    readonly ActivityStart: "ActivityStart";
    readonly ActivityEnd: "ActivityEnd";
    readonly ActivityCancel: "ActivityCancel";
    readonly ActivityData: "ActivityData";
    readonly GameWarmupStart: "GameWarmupStart";
    readonly GameWarmupEnd: "GameWarmupEnd";
    readonly TapDown: "TapDown";
    readonly TapUp: "TapUp";
    readonly TapUpAny: "TapUpAny";
    readonly TapLeave: "TapLeave";
    readonly PointerDown: "PointerDown";
    readonly PointerUp: "PointerUp";
    readonly PointerMove: "PointerMove";
    readonly PointerLeave: "PointerLeave";
    readonly KeyDown: "KeyDown";
    readonly KeyUp: "KeyUp";
    readonly Drag: "Drag";
    readonly DragStart: "DragStart";
    readonly DragEnd: "DragEnd";
    readonly Composite: "Composite";
    readonly FrameDidSimulatePhysics: "FrameDidSimulatePhysics";
    readonly SceneSetup: "SceneSetup";
    readonly SceneAppear: "SceneAppear";
    readonly ScenePresent: "ScenePresent";
    readonly NodeNew: "NodeNew";
    readonly NodeAddChild: "NodeAddChild";
    readonly NodeRemoveChild: "NodeRemoveChild";
    readonly NodePropertyChange: "NodePropertyChange";
    readonly DomPointerDown: "DomPointerDown";
    readonly BrowserImageDataReady: "BrowserImageDataReady";
    readonly I18nDataReadyEvent: "I18nDataReadyEvent";
};
type M2EventType = (typeof M2EventType)[keyof typeof M2EventType];

/**
 * Base interface for all m2c2kit event listeners.
 */
interface M2EventListener<T> {
    /** Type of event to listen for. */
    type: M2EventType | string;
    /** Callback function to be called when the event is dispatched. */
    callback: (event: T) => void;
    /** Optional key (string identifier) used to identify the event listener. */
    key?: string;
}

interface M2NodeEventListener<M2NodeEvent> extends M2EventListener<M2NodeEvent> {
    /** For composites that raise events, type of the composite node. */
    compositeType?: string;
    /** For composites that raise events, type of the composite event. */
    compositeEventType?: string;
    /** UUID of the node that the event listener is listening for. */
    nodeUuid: string;
}

/**
 * Describes an interaction between the pointer (mouse, touches) and a node.
 *
 * @remarks I would have named it PointerEvent, but that would collide with
 * the existing DOM PointerEvent.
 */
interface M2PointerEvent extends M2NodeEvent {
    /** Point that was tapped on node, relative to the node coordinate system */
    point: Point;
    /** Buttons being pressed when event was fired. Taken from DOM MouseEvent.buttons */
    buttons: number;
}

/**
 * Describes an interaction of a pointer (mouse, touches) pressing a node.
 *
 * @remarks Unlike M2PointerEvent, TapEvent considers how the pointer, while
 * in the down state, moves in relation to the bounds of the node.
 */
interface TapEvent extends M2NodeEvent {
    /** Point that was tapped on node, relative to the node coordinate system */
    point: Point;
    /** Buttons being pressed when event was fired. Taken from DOM MouseEvent.buttons */
    buttons: number;
}

interface TextOptions {
    /** Text to be displayed */
    text?: string;
    /** Name of font to use for text. Must have been previously loaded */
    fontName?: string;
    /** Color of text. Default is Constants.DEFAULT_FONT_COLOR (WebColors.Black) */
    fontColor?: RgbaColor;
    /** Size of text. Default is Constants.DEFAULT_FONT_SIZE (16) */
    fontSize?: number;
    /** Map of placeholders to values for use in string interpolation during localization. */
    interpolation?: StringInterpolationMap;
    /** If true, try to use a localized version of the text. Default is true. */
    localize?: boolean;
}

/**
 * Width and height on two-dimensional space
 */
interface Size {
    /** Horizontal width, x-axis */
    width: number;
    /** Vertical height, y-axis */
    height: number;
}

/**
 * Describes a drag and drop operation.
 *
 * @remarks I would have named it DragEvent, but that would collide with
 * the existing DOM DragEvent.
 */
interface M2DragEvent extends M2NodeEvent {
    /** Position of the node at the time of the M2DragEvent, relative to the parent node coordinate system. */
    position: Point;
    /** Buttons being pressed when event was fired. Taken from DOM MouseEvent.buttons. */
    buttons: number;
}

declare function handleInterfaceOptions(node: M2Node, options: M2NodeOptions): void;
declare abstract class M2Node implements M2NodeOptions {
    type: M2NodeType;
    isDrawable: boolean;
    isShape: boolean;
    isText: boolean;
    private _suppressEvents;
    options: M2NodeOptions;
    constructionTimeStamp: number;
    constructionIso8601TimeStamp: string;
    constructionSequence: number;
    name: string;
    _position: Point;
    _scale: number;
    _alpha: number;
    _zRotation: number;
    protected _isUserInteractionEnabled: boolean;
    protected _draggable: boolean;
    protected _hidden: boolean;
    layout: Layout;
    _game?: Game;
    parent?: M2Node;
    children: M2Node[];
    absolutePosition: Point;
    protected _size: Size;
    absoluteScale: number;
    absoluteAlpha: number;
    absoluteAlphaChange: number;
    actions: Action[];
    queuedAction?: Action;
    eventListeners: M2NodeEventListener<M2NodeEvent>[];
    readonly uuid: string;
    needsInitialization: boolean;
    userData: any;
    loopMessages: Set<string>;
    nodeEvents: M2Event<M2Node>[];
    /** Is the node in a pressed state? E.g., did the user put the pointer
     * down on the node and not yet release it? */
    pressed: boolean;
    withinHitArea: boolean;
    /** Is the node in a pressed state AND is the pointer within the node's
     * hit area? For example, a user may put the pointer down on the node, but
     * then move the pointer, while still down, beyond the node's hit area. In
     * this case, pressed = true, but pressedAndWithinHitArea = false. */
    pressedAndWithinHitArea: boolean;
    /** When the node initially enters the pressed state, what is the pointer
     * offset? (offset from the canvas's origin to the pointer position). We
     * save this because it will be needed if this press then led to a drag. */
    pressedInitialPointerOffset: Point;
    /** What was the previous pointer offset when the node was in a dragging
     * state? */
    draggingLastPointerOffset: Point;
    /** Is the node in a dragging state? */
    dragging: boolean;
    constructor(options?: M2NodeOptions);
    initialize(): void;
    protected get completeNodeOptions(): M2NodeOptions;
    /**
     * Save the node's construction event in the event store.
     */
    protected saveNodeNewEvent(): void;
    /**
     * Saves the node's property change event in the event store.
     *
     * @param property - property name
     * @param value - property value
     */
    protected savePropertyChangeEvent(property: string, value: string | number | boolean | object | null | undefined): void;
    /**
     * Saves the node's event.
     *
     * @remarks If the game event store is not available, the event is saved
     * within the node's `nodeEvents` event array. It will be added to the game
     * event store when the node is added to the game.
     *
     * @param event - event to save
     */
    protected saveEvent(event: M2Event<M2Node>): void;
    /**
     * The game which this node is a part of.
     *
     * @remarks Throws error if node is not part of the game object.
     */
    get game(): Game;
    /**
     * Determines if the node has been added to the game object.
     *
     * @returns true if node has been added
     */
    private isPartOfGame;
    /**
     * Overrides toString() and returns a human-friendly description of the node.
     *
     * @remarks Inspiration from https://stackoverflow.com/a/35361695
     */
    toString: () => string;
    /**
     * Adds a child to this parent node. Throws exception if the child's name
     * is not unique with respect to other children of this parent, or if the
     * child has already been added to another parent.
     *
     * @param child - The child node to add
     */
    addChild(child: M2Node): void;
    /**
     * Saves the child's events to the parent node.
     *
     * @remarks When a child is added to a parent, the parent receives all the
     * child's events and saves them.
     *
     * @param child - child node to save events to parent node
     */
    private saveChildEvents;
    /**
     * Removes all children from the node.
     */
    removeAllChildren(): void;
    /**
     * Removes the specific child from this parent node. Throws exception if
     * this parent does not contain the child.
     *
     * @param child
     */
    removeChild(child: M2Node): void;
    /**
     * Removes the children from the parent. Throws error if the parent does not
     * contain all of the children.
     *
     * @param children - An array of children to remove from the parent node
     */
    removeChildren(children: Array<M2Node>): void;
    /**
     * Searches all descendants by name and returns first matching node.
     *
     * @remarks Descendants are children and children of children, recursively.
     * Throws exception if no descendant with the given name is found.
     *
     * @param name - Name of the descendant node to return
     * @returns
     */
    descendant<T extends M2Node>(name: string): T;
    /**
     * Returns all descendant nodes.
     *
     * @remarks Descendants are children and children of children, recursively.
     */
    get descendants(): Array<M2Node>;
    /**
     * Returns all ancestor nodes, not including the node itself.
     */
    get ancestors(): Array<M2Node>;
    /**
     * Determines if this node or ancestor is part of an active action that
     * affects it appearance.
     *
     * @remarks This is used to determine if the node should be rendered with
     * anti-aliasing or not. Anti-aliasing on some devices causes a new shader
     * to be compiled during the action, which causes jank.
     *
     * @returns true if part of active action affecting appearance
     */
    involvedInActionAffectingAppearance(): boolean;
    /**
     * Determines if the node is a transitioning Scene or a descendant of a
     * transitioning Scene.
     *
     * @returns true if transitioning
     */
    involvedInSceneTransition(): boolean;
    /**
     * Executes a callback when the user presses down on the node.
     *
     * @remarks TapDown is a pointer down (mouse click or touches begin) within
     * the bounds of the node.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onTapDown(callback: (tapEvent: TapEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user releases a press, that has been fully
     * within the node, from the node.
     *
     * @remarks TapUp is a pointer up (mouse click release or touches end) within
     * the bounds of the node and the pointer, while down, has never moved
     * beyond the bounds of the node.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}ue.
     */
    onTapUp(callback: (tapEvent: TapEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user releases a press from the node within
     * the bounds of the node.
     *
     * @remarks TapUpAny is a pointer up (mouse click release or touches end)
     * within the bounds of the node and the pointer, while down, is allowed to
     * have been beyond the bounds of the node during the press before the
     * release.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onTapUpAny(callback: (tapEvent: TapEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user moves the pointer (mouse, touches) beyond
     * the bounds of the node while the pointer is down.
     *
     * @remarks TapLeave occurs when the pointer (mouse, touches) that has
     * previously pressed the node moves beyond the bounds of the node
     * before the press release.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onTapLeave(callback: (tapEvent: TapEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the pointer first is down on the node.
     *
     * @remarks PointerDown is a pointer down (mouse click or touches begin) within
     * the bounds of the node. It occurs under the same conditions as TapDown.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onPointerDown(callback: (m2PointerEvent: M2PointerEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user releases a press from the node within
     * the bounds of the node.
     *
     * @remarks PointerUp is a pointer up (mouse click release or touches end)
     * within the bounds of the node. It does not require that there was a
     * previous PointerDown on the node.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onPointerUp(callback: (m2PointerEvent: M2PointerEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user moves the pointer (mouse or touches)
     * within the bounds of the node.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onPointerMove(callback: (m2PointerEvent: M2PointerEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user moves the pointer (mouse or touches)
     * outside the bounds of the node.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onPointerLeave(callback: (m2PointerEvent: M2PointerEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user begins dragging a node.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onDragStart(callback: (m2DragEvent: M2DragEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user continues dragging a node.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onDrag(callback: (m2DragEvent: M2DragEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user stop dragging a node.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onDragEnd(callback: (m2DragEvent: M2DragEvent) => void, options?: CallbackOptions): void;
    addEventListener<T extends M2NodeEvent>(type: M2EventType | string, callback: (ev: T) => void, callbackOptions?: CallbackOptions): void;
    private parseLayoutConstraints;
    private calculateYFromConstraint;
    private calculateXFromConstraint;
    /**
     * Calculates the absolute alpha of the node, taking into account the
     * alpha of all ancestor parent nodes.
     *
     * @remarks Alpha has multiplicative inheritance from all ancestors.
     *
     * @param alpha - Opacity of the node
     * @param ancestors - Array of ancestor parent nodes
     * @returns
     */
    private calculateAbsoluteAlpha;
    update(): void;
    /**
     * Draws each child node that is Drawable and is not hidden, by zPosition
     * order (highest zPosition on top).
     *
     * @param canvas - CanvasKit canvas
     */
    drawChildren(canvas: Canvas): void;
    /**
     * Runs an action on this node.
     *
     * @remarks If the node is part of an active scene, the action runs
     * immediately. Otherwise, the action will run when the node's scene
     * becomes active. Calling run() multiple times on a node will add
     * to existing actions, not replace them.
     *
     * @param action - The action to run
     * @param key - key (string identifier) used to identify the action.
     * Only needed if the action will be referred to later
     */
    run(action: Action, key?: string): void;
    /**
     * Remove an action from this node. If the action is running, it will be
     * stopped.
     *
     * @param key - key (string identifier) of the action to remove
     */
    removeAction(key: string): void;
    /**
     * Remove all actions from this node. If actions are running, they will be
     * stopped.
     */
    removeAllActions(): void;
    /**
     * Duplicates a node using deep copy.
     *
     * @remarks This is a deep recursive clone (node and children).
     * The uuid property of all duplicated nodes will be newly created,
     * because uuid must be unique.
     *
     * @param newName - optional name of the new, duplicated node. If not
     * provided, name will be the new uuid
     */
    abstract duplicate(newName?: string): M2Node;
    protected getNodeOptions(): M2NodeOptions;
    protected getDrawableOptions(): DrawableOptions;
    protected getTextOptions(): TextOptions;
    /**
     * Gets the scene that contains this node by searching up the ancestor tree recursively. Throws exception if node is not part of a scene.
     *
     * @returns Scene that contains this node
     */
    get canvasKit(): CanvasKit;
    get parentSceneAsNode(): M2Node;
    get size(): Size;
    set size(size: Size);
    get position(): Point;
    set position(position: Point);
    get zRotation(): number;
    set zRotation(zRotation: number);
    get scale(): number;
    set scale(scale: number);
    get alpha(): number;
    set alpha(alpha: number);
    get isUserInteractionEnabled(): boolean;
    set isUserInteractionEnabled(isUserInteractionEnabled: boolean);
    get hidden(): boolean;
    set hidden(hidden: boolean);
    get draggable(): boolean;
    set draggable(draggable: boolean);
    get suppressEvents(): boolean;
    set suppressEvents(value: boolean);
    /**
     * For a given directed acyclic graph, topological ordering of the vertices will be identified using BFS
     * @param adjList Adjacency List that represent a graph with vertices and edges
     */
    private findTopologicalSort;
}

interface MoveActionOptions {
    /** Destination point. The point is relative to the node's parent coordinate system */
    point: Point;
    /** Duration of move, in milliseconds */
    duration: number;
    /** Easing function for movement; default is linear */
    easing?: EasingFunction;
    /** Should the action run during screen transitions? Default is no */
    runDuringTransition?: boolean;
}

interface WaitActionOptions {
    /** Duration of wait, in milliseconds */
    duration: number;
    /** Should the action run during screen transitions? Default is no */
    runDuringTransition?: boolean;
}

interface CustomActionOptions {
    /** callback - The callback function to be executed  */
    callback: () => void;
    /** Should the action run during screen transitions? Default is no */
    runDuringTransition?: boolean;
}

interface ScaleActionOptions {
    /** The scaling ratio. 1 is no change, greater than 1 is make bigger, less than 1 is make smaller */
    scale: number;
    /** Duration of scale, in milliseconds */
    duration: number;
    /** Should the action run during screen transitions? Default is no */
    runDuringTransition?: boolean;
}

interface FadeAlphaActionOptions {
    /** Opacity of the node. 0 is fully transparent, 1 is fully opaque. */
    alpha: number;
    /** Duration of scale, in milliseconds */
    duration: number;
    /** Should the action run during screen transitions? Default is no */
    runDuringTransition?: boolean;
}

interface RotateActionOptions {
    /** Relative amount to rotate the node, in counter-clockwise radians */
    byAngle?: number;
    /** Absolute angle to which rotate the node, in counter-clockwise radians */
    toAngle?: number;
    /** If `toAngle` is provided, should the rotation be performed in the direction that leads to the smallest rotation? Default is true */
    shortestUnitArc?: boolean;
    /** Duration of rotation, in milliseconds */
    duration: number;
    /** Should the action run during screen transitions? Default is false */
    runDuringTransition?: boolean;
}

interface PlayActionOptions {
    /** Should the action run during screen transitions? Default is no */
    runDuringTransition?: boolean;
}

/**
 * An ActionContainer is an Action that can contain other actions.
 *
 * @remarks An ActionContainer is a parent action that can have other
 * actions as children. The `Sequence`, `Group`, `Repeat,` and
 * `RepeatForever` actions implement `ActionContainer`.
 */
interface ActionContainer extends Action {
    /**
     * Immediate children of a parent action.
     */
    children: Array<Action>;
    /**
     * All children of a parent action and those children's children, recursively.
     */
    descendants: Array<Action>;
}

/** The type of action */
declare enum ActionType {
    Sequence = "Sequence",
    Group = "Group",
    Wait = "Wait",
    Custom = "Custom",
    Move = "Move",
    Scale = "Scale",
    FadeAlpha = "FadeAlpha",
    Rotate = "Rotate",
    Play = "Play",
    Repeat = "Repeat",
    RepeatForever = "RepeatForever"
}

/**
 * A class for for working with numeric values that may be currently unknown,
 * but may be known in the future.
 *
 * @remarks Most m2c2kit actions have a known duration, such as waiting for a
 * given duration or moving a node to a specific position across a specific
 * duration: the duration is explicitly provided when the `Action` is created.
 * However, some actions have a duration that is not known when the `Action` is
 * created, but it will be known in the future. So far, the only action that
 * requires this is the `play` action. In the browser, a sound file cannot be
 * decoded by the `AudioContext` interface (which will calculate the duration)
 * until the user has interacted with the page, which could be after the
 * `Action` has been created. This is a problem because a `sequence` action
 * needs to know the duration of all its children in order to calculate its own
 * duration and when each of the child actions will start. To solve this
 * problem, the `Futurable` class is a simple implementation of the Composite
 * pattern that allows for the creation of a numeric value that may be known in
 * the future. If a value is not known at creation time, it is represented by
 * `Infinity`. The `Futurable` class supports addition and subtraction of
 * another `Futurable` and numbers. When the numeric value of a `Futurable` is
 * requested, it evaluates the expression and returns the numeric value. If any
 * of the terms in the expression is a `Futurable`, it will recursively
 * evaluate them. If any of the terms are unknown (represented by `Infinity`),
 * it will return `Infinity`. If a previous unknown value becomes known, any
 * other `Futurable` that depends on it will also become known.
 */
declare class Futurable {
    /** The numbers, operators, and other Futurables that represent a value. */
    private expression;
    /** Log a warning to console if a expression is this length. */
    private readonly WARNING_EXPRESSION_LENGTH;
    constructor(value?: Futurable | number);
    /**
     * Appends a number or another Futurable to this Futurable's expression.
     *
     * @remarks This method does a simple array push, but checks the length of
     * the expression array and warns if it gets "too long." This may indicate
     * a logic error, unintended recursion, etc. because our use cases will
     * likely not have expressions that are longer than
     * `Futural.WARNING_EXPRESSION_LENGTH` elements.
     *
     * @param value - value to add to the expression.
     */
    private pushToExpression;
    /**
     * Assigns a value, either known or Futurable, to this Futurable.
     *
     * @remarks This method clears the current expression.
     *
     * @param value - value to assign to this Futurable.
     */
    assign(value: number | Futurable): void;
    /**
     * Performs addition on this Futurable.
     *
     * @remarks This method modifies the Futurable by adding the term(s) to the
     * Futurable's expression.
     *
     * @param terms - terms to add to this Futurable.
     * @returns the modified Futurable.
     */
    add(...terms: Array<Futurable | number>): this;
    /**
     * Performs subtraction on this Futurable.
     *
     * @remarks This method modifies the Futurable by subtracting the term(s)
     * from the Futurable's expression.
     *
     * @param terms - terms to subtract from this Futurable.
     * @returns the modified Futurable.
     */
    subtract(...terms: Array<Futurable | number>): this;
    /**
     * Adds an operation (an operator and term(s)) to the Futurable's
     * expression.
     *
     * @param operator - Add or Subtract.
     * @param terms - terms to add to the expression.
     */
    private appendOperation;
    /**
     * Gets the numeric value of this Futurable.
     *
     * @remarks This method evaluates the expression of the Futurable and
     * returns the numeric value. If any of the terms in the expression are
     * Futurables, it will recursively evaluate them. If any of the terms are
     * unknown (represented by Infinity), it will return Infinity.
     *
     * @returns the numeric value of this Futurable.
     */
    get value(): number;
}

/**
 * An extension of `ActionContainer` that can repeat another action.
 *
 * @remarks A `RepeatingActionContainer` is a parent action that repeats
 * another action for a specified number of repetitions, as provided in the
 * `count` property. The `Repeat` and `RepeatForever` actions implement
 * `RepeatingActionContainer`.
 */
interface RepeatingActionContainer extends ActionContainer {
    /** Number of times the action will repeat. */
    count: number;
    /** Number of completions done. */
    completedRepetitions: number;
    /** How long, in milliseconds, the repeating action has run. This is updated
     * only at the end of a repetition. */
    cumulativeDuration: number;
    /** Returns true when the action is running and the action's children have
     * just completed a repetition */
    repetitionHasCompleted: boolean;
}

interface RepeatActionOptions {
    /** Action to repeat */
    action: Action;
    /** Number of times to repeat the action */
    count: number;
    /** Should the action run during screen transitions? Default is no */
    runDuringTransition?: boolean;
}

interface RepeatForeverActionOptions {
    /** Action to repeat */
    action: Action;
    /** Should the action run during screen transitions? Default is no */
    runDuringTransition?: boolean;
}

/**
 * The Action class has static methods for creating actions to be executed by
 * an M2Node.
 */
declare abstract class Action {
    abstract type: ActionType;
    startOffset: Futurable;
    started: boolean;
    running: boolean;
    private _completed;
    /**
     * Start time of a running action is always known; it is not a `Futurable`.
     * -1 indicates that the root action has not yet started running.
     */
    runStartTime: number;
    duration: Futurable;
    runDuringTransition: boolean;
    parent?: ActionContainer;
    key?: string;
    constructor(runDuringTransition?: boolean);
    /**
     * Prepares the Action for evaluation.
     *
     * @remarks Calculates start times for all actions in the hierarchy
     * and returns a copy of the action that is prepared for evaluation during
     * the update loop.
     *
     * @param key - optional string to identify an action
     * @returns action prepared for evaluation
     */
    initialize(key?: string): Action;
    /**
     * Clones the action, and any actions it contains, recursively.
     *
     * @remarks We need to clone an action before running it because actions
     * have state that is updated over time such as whether they are running or
     * not, etc. If we didn't clone actions, two nodes reusing the same action
     * would share state. On `Action`, this method is abstract and is
     * implemented in each subclass.
     *
     * @returns a clone of the action
     */
    abstract clone(): Action;
    /**
     * Parses the action hierarchy and assigns each action its parent and
     * root action.
     *
     * @remarks Uses recursion to handle arbitrary level of nesting parent
     * actions within parent actions. When this method is called from the
     * `initialize()` method, the root action is both the `action` and the
     * `rootAction`. This is because the action is the top-level action in the
     * hierarchy. When the method calls itself recursively, the `rootAction`
     * remains the same, but the `action` is a child action or the action of a
     * repeating action.
     *
     * @param action - the action to assign parents to
     * @param rootAction - top-level action passed to the run method
     * @param key - optional string to identify an action. The key is assigned
     * to every action in the hierarchy.
     */
    private assignParents;
    /**
     * Sets the runDuringTransition property based on descendants.
     *
     * @remarks This ensures that a parent action has its `runDuringTransition`
     * property set to true if any of its descendants have their
     * `runDuringTransition` property set to true. Parent actions do not have a
     * way for the user to set this property directly; it is inferred (propagated
     * up) from the descendants.
     *
     * @param action to propagate runDuringTransition property to
     */
    private propagateRunDuringTransition;
    /**
     * Assigns durations to all actions in the hierarchy.
     *
     * @remarks Uses recursion to handle arbitrary level of nesting parent
     * actions within parent actions.
     *
     * @param action - the action to assign durations to
     */
    private assignDurations;
    /**
     * Calculates the duration of an action, including any children actions
     * the action may contain.
     *
     * @remarks Uses recursion to handle arbitrary level of nesting parent
     * actions within parent actions
     *
     * @param action
     * @returns the calculated duration
     */
    private calculateDuration;
    /**
     * Assigns start offsets to all actions in the hierarchy.
     *
     * @remarks Uses recursion to handle arbitrary level of nesting parent
     * actions within parent actions.
     *
     * @param action - the action to assign start offsets to
     */
    private assignStartOffsets;
    /**
     * Calculates the start offset. This is when an action should start,
     * relative to the start time of its parent (if it has a parent).
     *
     * @param action - the action to calculate the start offset for
     * @returns the start offset as a Futurable
     */
    private calculateStartOffset;
    /**
     * Evaluates an action, updating the node's properties as needed.
     *
     * @remarks This method is called every frame by the M2Node's `update()`
     * method.
     *
     * @param action - the Action to be evaluated and possibly run
     * @param node - the `M2Node` that the action will be run on
     * @param now - the current elapsed time, from `performance.now()`
     * @param dt - the time since the last frame (delta time)
     */
    static evaluateAction(action: Action, node: M2Node, now: number, dt: number): void;
    private static evaluateRepeatingActions;
    private static evaluateRotateAction;
    private static evaluateFadeAlphaAction;
    private static evaluateScaleAction;
    private static evaluateMoveAction;
    private static evaluateWaitAction;
    private static evaluatePlayAction;
    private static evaluateCustomAction;
    /**
     * Assigns RunStartTime to all actions in the hierarchy.
     *
     * @remarks Uses recursion to handle arbitrary level of nesting parent
     * actions within parent actions.
     *
     * @param action - the action to assign RunStartTime to
     */
    assignRunStartTimes(action: Action, runStartTime: number): void;
    /**
     * Configures action to be run again.
     *
     * @remarks This method is called on a repeating action's children when they
     * need to be run again.
     *
     * @param action - action to restart
     * @param now - current time
     */
    restartAction(action: Action, now: number): void;
    /**
     * Determines if the action should be running.
     *
     * @remarks An action should be running if current time is in the interval
     * [ start time + start offset, start time + start offset + duration ]
     *
     * @param now - current time
     * @returns true if the action should be running
     */
    shouldBeRunning(now: number): boolean;
    /**
     * Creates an action that will move a node to a point on the screen.
     *
     * @param options - {@link MoveActionOptions}
     * @returns The move action
     */
    static move(options: MoveActionOptions): MoveAction;
    /**
     * Creates an action that will wait a given duration before it is considered
     * complete.
     *
     * @param options - {@link WaitActionOptions}
     * @returns The wait action
     */
    static wait(options: WaitActionOptions): WaitAction;
    /**
     * Creates an action that will execute a callback function.
     *
     * @param options - {@link CustomActionOptions}
     * @returns The custom action
     */
    static custom(options: CustomActionOptions): CustomAction;
    /**
     * Creates an action that will play a sound.
     *
     * @remarks This action can only be used with a SoundPlayer node.
     * It will throw an error if used with any other node type.
     *
     * @param options - {@link PlayActionOptions}
     * @returns The play action
     */
    static play(options?: PlayActionOptions): PlayAction;
    /**
     * Creates an action that will scale the node's size.
     *
     * @remarks Scaling is relative to any inherited scaling, which is
     * multiplicative. For example, if the node's parent is scaled to 2.0 and
     * this node's action scales to 3.0, then the node will appear 6 times as
     * large as original.
     *
     * @param options - {@link ScaleActionOptions}
     * @returns The scale action
     */
    static scale(options: ScaleActionOptions): ScaleAction;
    /**
     * Creates an action that will change the node's alpha (opacity).
     *
     * @remarks Alpha has multiplicative inheritance. For example, if the node's
     * parent is alpha .5 and this node's action fades alpha to .4, then the
     * node will appear with alpha .2.
     *
     * @param options - {@link FadeAlphaActionOptions}
     * @returns The fadeAlpha action
     */
    static fadeAlpha(options: FadeAlphaActionOptions): FadeAlphaAction;
    /**
     * Creates an action that will rotate the node.
     *
     * @remarks Rotate actions are applied to their children. In addition to this
     * node's rotate action, all ancestors' rotate actions will also be applied.
     *
     * @param options - {@link RotateActionOptions}
     * @returns The rotate action
     */
    static rotate(options: RotateActionOptions): RotateAction;
    /**
     * Creates an array of actions that will be run in order.
     *
     * @remarks The next action will not begin until the current one has
     * finished. The sequence will be considered completed when the last action
     * has completed.
     *
     * @param actions - One or more actions that form the sequence
     * @returns
     */
    static sequence(actions: Array<Action>): SequenceAction;
    /**
     * Create an array of actions that will be run simultaneously.
     *
     * @remarks All actions within the group will begin to run at the same time.
     * The group will be considered completed when the longest-running action
     * has completed.
     *
     * @param actions - One or more actions that form the group
     * @returns
     */
    static group(actions: Array<Action>): GroupAction;
    /**
     * Creates an action that will repeat another action a given number of times.
     *
     * @param options - {@link RepeatActionOptions}
     * @returns The repeat action
     */
    static repeat(options: RepeatActionOptions): RepeatAction;
    /**
     * Creates an action that will repeat another action forever.
     *
     * @remarks A repeat forever action is a special case of a repeat action
     * where the count is set to infinity.
     *
     * @param options - {@link RepeatForeverActionOptions}
     * @returns The repeat forever action
     */
    static repeatForever(options: RepeatForeverActionOptions): RepeatForeverAction;
    /**
     * Type guard that returns true if the action is a parent action.
     *
     * @remarks Parent actions are Group, Sequence, Repeat, and RepeatForever
     * actions.
     *
     * @param action - action to check
     * @returns true if the action is a parent action
     */
    isParent(action: Action): action is ActionContainer;
    /**
     * Type guard that returns true if the action can repeat.
     *
     * @remarks Repeating actions are Repeat and RepeatForever actions.
     *
     * @param action - action to check
     * @returns true if the action is a RepeatAction or RepeatForeverAction
     */
    private isRepeating;
    /**
     * Indicates whether the action has completed.
     */
    get completed(): boolean;
    set completed(value: boolean);
}
declare class SequenceAction extends Action implements ActionContainer {
    type: ActionType;
    children: Array<Action>;
    constructor(actions: Array<Action>);
    clone(): SequenceAction;
    /**
     * Indicates whether the action has completed, taking into account all its
     * child actions.
     *
     * @remarks Is read-only for parent actions.
     */
    get completed(): boolean;
    get descendants(): Action[];
}
declare class GroupAction extends Action implements ActionContainer {
    type: ActionType;
    children: Action[];
    constructor(actions: Array<Action>);
    clone(): GroupAction;
    /**
     * Indicates whether the action has completed, taking into account all its
     * child actions.
     *
     * @remarks Is read-only for parent actions.
     */
    get completed(): boolean;
    get descendants(): Action[];
}
declare class RepeatAction extends Action implements RepeatingActionContainer {
    type: ActionType;
    count: number;
    children: Array<Action>;
    completedRepetitions: number;
    cumulativeDuration: number;
    constructor(action: Action, count: number, runDuringTransition?: boolean);
    clone(): RepeatAction;
    /**
     * Indicates whether the action has completed, taking into account all its
     * child actions and the number of repetitions.
     *
     * @remarks Is read-only for parent actions.
     */
    get completed(): boolean;
    get descendantsAreCompleted(): boolean;
    /**
     * Indicates whether a single repetition of a repeating action has just
     * completed.
     *
     * @returns returns true if a repetition has completed
     */
    get repetitionHasCompleted(): boolean;
    get descendants(): Action[];
}
declare class RepeatForeverAction extends RepeatAction {
    type: ActionType;
    count: number;
    constructor(action: Action, runDuringTransition?: boolean);
    clone(): RepeatForeverAction;
}
declare class CustomAction extends Action {
    type: ActionType;
    callback: () => void;
    constructor(callback: () => void, runDuringTransition?: boolean);
    clone(): CustomAction;
}
declare class PlayAction extends Action {
    type: ActionType;
    constructor(runDuringTransition?: boolean);
    clone(): PlayAction;
}
declare class WaitAction extends Action {
    type: ActionType;
    constructor(duration: Futurable, runDuringTransition: boolean);
    clone(): WaitAction;
}
declare class MoveAction extends Action {
    type: ActionType;
    point: Point;
    startPoint: Point;
    dx: number;
    dy: number;
    easing: EasingFunction;
    constructor(point: Point, duration: Futurable, easing: EasingFunction, runDuringTransition: boolean);
    clone(): MoveAction;
}
declare class ScaleAction extends Action {
    type: ActionType;
    scale: number;
    delta: number;
    constructor(scale: number, duration: Futurable, runDuringTransition?: boolean);
    clone(): ScaleAction;
}
declare class FadeAlphaAction extends Action {
    type: ActionType;
    alpha: number;
    delta: number;
    constructor(alpha: number, duration: Futurable, runDuringTransition?: boolean);
    clone(): FadeAlphaAction;
}
declare class RotateAction extends Action {
    type: ActionType;
    byAngle?: number;
    toAngle?: number;
    shortestUnitArc?: boolean;
    delta: number;
    finalValue: number;
    constructor(byAngle: number | undefined, toAngle: number | undefined, shortestUnitArc: boolean | undefined, duration: Futurable, runDuringTransition?: boolean);
    clone(): RotateAction;
}

interface ActivityCallbacks {
    /** Callback executed when the activity lifecycle changes, such as when it ends. */
    onActivityLifecycle?: (event: ActivityLifecycleEvent) => void;
    /** Callback executed when an activity creates some data. */
    onActivityResults?: (event: ActivityResultsEvent) => void;
}

interface ActivityEventListener<ActivityEvent> extends M2EventListener<ActivityEvent> {
    /** UUID of the activity that the event listener is listening for. */
    activityUuid: string;
}

declare class CanvasKitHelpers {
    /**
     * Frees up resources that were allocated by CanvasKit.
     *
     * @remarks This frees objects created in WebAssembly by
     * canvaskit-wasm. JavaScript garbage collection won't
     * free these wasm objects.
     */
    static Dispose(objects: Array<undefined | null | Font | Paint | ParagraphBuilder | Paragraph | Image | Typeface | TypefaceFontProvider | FontMgr | Path>): void;
    static makePaint(canvasKit: CanvasKit, color: RgbaColor, style: PaintStyle, isAntialiased: boolean): Paint;
}

/**
 * A collection of lines to draw.
 */
interface M2Path {
    /** The subpath that compose up the path */
    subpaths: Array<Array<Point>>;
}

/**
 * Subpaths and methods for creating them.
 *
 * @remarks Subpaths are an array of lines that are drawn together.
 */
declare class MutablePath implements M2Path {
    _subpaths: Point[][];
    get subpaths(): Array<Array<Point>>;
    protected currentPath: Point[];
    /**
     * Starts a new subpath at a given point.
     *
     * @param point - location at which to start the new subpath
     */
    move(point: Point): void;
    /**
     * Adds a straight line to the current subpath.
     *
     * @remarks The line is added from the last point in the current subpath to
     * the given point.
     *
     * @param point - location where the line will end
     */
    addLine(point: Point): void;
    /**
     * Removes all subpaths from the shape.
     */
    clear(): void;
    /**
     * Makes a deep copy.
     *
     * @returns a deep copy
     */
    duplicate(): MutablePath;
}

/**
 * Properties that describe line colors and widths in a `M2ColorfulPath`.
 */
interface LinePresentation {
    strokeColor: RgbaColor;
    lineWidth: number;
    subpathIndex: number;
    pointIndex: number;
}

/**
 * Multi-color subpaths and methods for creating them.
 *
 * @remarks Subpaths are an array of lines that are drawn together.
 */
declare class ColorfulMutablePath extends MutablePath {
    /** Stroke color to be applied to subsequent lines. */
    strokeColor: RgbaColor;
    /** Line width to be applied to subsequent lines. */
    lineWidth: number;
    /** Colors and widths of lines in the path. */
    linePresentations: Array<LinePresentation>;
    /**
     * Adds a straight line to the current subpath
     *
     * @remarks The line is added from the last point in the current subpath to
     * the given point, with the current stroke color and line width.
     *
     * @param point - location where the line will end
     */
    addLine(point: Point): void;
    /**
     * Checks if the current line presentation (stroke color and line width) is
     * different from the last line presentation.
     *
     * @returns true if the current line presentation is different from the last
     */
    private isNewLinePresentation;
    /**
     * Removes all subpaths from the shape and resets the stroke color and line
     * width to their default values.
     */
    clear(): void;
    /**
     * Makes a deep copy.
     *
     * @returns a deep copy
     */
    duplicate(): ColorfulMutablePath;
}

/**
 * Reasonable defaults to use if values are not specified.
 */
declare class Constants {
    /** Size of the font showing frames per second */
    static readonly FPS_DISPLAY_TEXT_FONT_SIZE = 12;
    /** Color of the font showing frames per second */
    static readonly FPS_DISPLAY_TEXT_COLOR: RgbaColor;
    /** Frequency, in milliseconds, at which to update frames per second metric shown on the screen */
    static readonly FPS_DISPLAY_UPDATE_INTERVAL = 1000;
    /** Maximum number of activity metrics to log. */
    static readonly MAXIMUM_RECORDED_ACTIVITY_METRICS = 32;
    /** The frames per second will be logged in game metrics if the FPS is lower than this value */
    static readonly FPS_METRIC_REPORT_THRESHOLD = 59;
    /** Scene color, if none is specified. */
    static readonly DEFAULT_SCENE_BACKGROUND_COLOR: RgbaColor;
    /** Shape fill color, if none is specified. */
    static readonly DEFAULT_SHAPE_FILL_COLOR: RgbaColor;
    /** Color of paths in a shape, if none is specified. */
    static readonly DEFAULT_PATH_STROKE_COLOR: RgbaColor;
    /** Line width of paths in a shape, if none is specified. */
    static readonly DEFAULT_PATH_LINE_WIDTH = 2;
    /** Color of text in Label and TextLine, if none is specified. */
    static readonly DEFAULT_FONT_COLOR: RgbaColor;
    /** Font size in Label and TextLine, if none is specified. */
    static readonly DEFAULT_FONT_SIZE = 16;
    static readonly LIMITED_FPS_RATE = 5;
    static readonly FREE_NODES_SCENE_NAME = "__freeNodesScene";
    static readonly OUTGOING_SCENE_NAME = "__outgoingScene";
    static readonly OUTGOING_SCENE_SPRITE_NAME = "__outgoingSceneSprite";
    static readonly OUTGOING_SCENE_IMAGE_NAME = "__outgoingSceneSnapshot";
    static readonly SESSION_INITIALIZATION_POLLING_INTERVAL_MS = 50;
    /** Placeholder that will be populated during the build process. */
    static readonly MODULE_METADATA_PLACEHOLDER: ModuleMetadata;
    static readonly DEFAULT_ROOT_ELEMENT_ID = "m2c2kit";
    static readonly ERUDA_URL = "https://cdn.jsdelivr.net/npm/eruda@3.4.1/eruda.js";
    static readonly ERUDA_SRI = "sha384-daS5bEfWdSq146t9c4BureB/fQWO3lHohseXBelPqKvbOUx2D6PE3TxcQ9jrKZDM";
}

/**
 * This enum is used internally for processing the layout constraints. We use
 * an enum to avoid magic strings. NOTE: the casing in ConstraintType must
 * match the casing in Constraints.ts. Thus, this enum's members are in
 * lowercase, which is not typical Typescript style.
 */
declare enum ConstraintType {
    topToTopOf = "topToTopOf",
    topToBottomOf = "topToBottomOf",
    bottomToTopOf = "bottomToTopOf",
    bottomToBottomOf = "bottomToBottomOf",
    startToStartOf = "startToStartOf",
    startToEndOf = "startToEndOf",
    endToEndOf = "endToEndOf",
    endToStartOf = "endToStartOf"
}

declare enum Dimensions {
    MatchConstraint = 0
}

/**
 * Custom error class for m2c2kit errors.
 */
declare class M2Error extends Error {
    constructor(...params: string[]);
}

type M2NodeConstructor = new (options?: M2NodeOptions) => M2Node;

/**
 * Utility class for comparing equality of m2c2kit objects.
 *
 * @deprecated Use the class `Equal` instead.
 */
declare class Equals {
    /**
     * Compares two RgbaColor objects and returns true if they are equal.
     *
     * @remarks If either of the colors is undefined, the comparison will
     * return false. RgbaColor is an array of 4 numbers, and thus is a
     * reference type. We need this method to compare two RgbaColor objects
     * for value equality.
     *
     * @deprecated Use the methods in `Equal` instead.
     *
     * @param color1
     * @param color2
     * @returns
     */
    static rgbaColor(color1?: RgbaColor, color2?: RgbaColor): boolean;
}

interface RectOptions {
    /** Position of rectangle */
    origin?: Point;
    /** Size of rectangle */
    size?: Size;
    /** X coordinate of rectangle position; this can be used instead of setting the origin property */
    x?: number;
    /** Y coordinate of rectangle position; this can be used instead of setting the origin property */
    y?: number;
    /** Width of rectangle; this can be used instead of setting the size property */
    width?: number;
    /** Height of rectangle; this can be used instead of setting the size property */
    height?: number;
}

/**
 * A collection of multi-color lines to draw.
 *
 * @remarks Unlike `M2Path`, this interface allows for lines of different
 * colors and widths to be drawn in the same path.
 */
interface M2ColorfulPath extends M2Path {
    /** Colors and widths of lines in the path. */
    linePresentations: Array<LinePresentation>;
}

/**
 * A path created from an SVG string path.
 */
interface SvgStringPath {
    /** SVG string from which to create the path */
    pathString?: string;
    /** SVG string from which to create the path @deprecated Use `pathString` */
    svgPathString?: string;
    /** If provided, scale the SVG path to this height, and scale the width to keep the original SVG proportions */
    height?: number;
    /** If provided, scale the SVG path to this width, and scale the height to keep the original SVG proportions */
    width?: number;
}

type ValueType = string | number | boolean | null | undefined | Array<ValueType> | {
    [key: string]: ValueType;
} | Point | RectOptions | M2Path | M2ColorfulPath | SvgStringPath | Size;
/**
 * Utility class for comparing equality of m2c2kit objects.
 *
 */
declare class Equal {
    /**
     * Compares two RgbaColor objects and returns true if they are equal.
     *
     * @remarks If either of the colors is undefined, the comparison will
     * return false. RgbaColor is an array of 4 numbers, and thus is a
     * reference type. We need this method to compare two RgbaColor objects
     * for value equality.
     *
     * @param color1
     * @param color2
     * @returns
     */
    static rgbaColor(color1?: RgbaColor, color2?: RgbaColor): boolean;
    /**
     * Compares two values for deep equality.
     *
     * @remarks Supported values are string, number, boolean, null, undefined,
     * and object (note that arrays are objects in JavaScript).
     *
     * @param value1 - value to compare
     * @param value2 - value to compare
     * @returns true if values have deep equality
     */
    static value(value1: ValueType, value2: ValueType): boolean;
    /**
     * Compares two objects for deep equality.
     *
     * @remarks In JavaScript, arrays are objects, so this method will also
     * compare arrays for deep equality.
     *
     * @param obj1 - object to compare
     * @param obj2 - object to compare
     * @returns true if objects have deep equality
     */
    private static objectsDeepEqual;
}

/**
 * Bounding box of a node.
 *
 * @remarks In the m2c2kit coordinate system, the origin (0, 0) is at the top
 * left corner.
 */
interface BoundingBox {
    /** The minimum x value of the bounding box */
    xMin: number;
    /** The maximum x value of the bounding box */
    xMax: number;
    /** The minimum y value of the bounding box */
    yMin: number;
    /** The maximum y value of the bounding box */
    yMax: number;
}

interface RotationTransform {
    /** Counterclockwise radians of the rotation */
    radians: number;
    /** Point around which to rotate */
    center: Point;
}
declare class M2c2KitHelpers {
    /**
     * Returns the URL as it appears in the game's manifest.json file.
     *
     * @remarks This is used to return the hashed URL.
     *
     * @param game - game object
     * @param url - the URL
     * @returns the hashed URL from the manifest, or the original URL if there is no manifest or the URL is not in the manifest.
     */
    static getUrlFromManifest(game: Game, url: string): string;
    /**
     * Does the URL have a scheme?
     *
     * @param url - the URL to test
     * @returns true if the url begins with a scheme (e.g., "http://",
     * "https://", "file://", etc.)
     */
    static urlHasScheme(url: string): boolean;
    /**
     * Converts a value to a JSON schema type or one of types.
     *
     * @remarks The value can be of the target type, or a string that can be
     * parsed into the target type. For example, a string `"3"` can be converted
     * to a number, and a string `'{ "color" : "red" }'` can be converted to an
     * object. If the target type if an object or array, the value can be a
     * string parsable into the target type: this string can be the string
     * representation of the object or array, or the URI encoded string.
     * Throws an error if the value cannot be converted to the type or one of the
     * types. Converting an object, null, or array to a string is often not the
     * desired behavior, so a warning is logged if this occurs.
     *
     * @param value - the value to convert
     * @param type - A JSON Schema type or types to convert the value to, e.g.,
     * "string" or ["string", "null"]
     * @returns the converted value
     */
    static convertValueToType(value: string | number | boolean | Array<unknown> | object | null, type: JsonSchemaDataType | JsonSchemaDataType[] | undefined): unknown;
    /**
     * Load scripts from URLs.
     *
     * @remarks This is for debugging purposes only. If this is unwanted, it
     * can be disabled on the server side with an appropriate Content
     * Security Policy (CSP) header.
     *
     * @param urls - URLs with scripts to load
     */
    static loadScriptUrls(urls: string[]): void;
    /**
     * Loads eruda from a CDN and initializes it.
     *
     * @remarks This is for debugging purposes only. If this is unwanted, it
     * can be disabled on the server side with an appropriate Content
     * Security Policy (CSP) header.
     * eruda is a dev console overlay for mobile web browsers and web views.
     * see https://github.com/liriliri/eruda
     *
     * @param pollingIntervalMs - milliseconds between each attempt
     * @param maxAttempts - how many attempts to make
     */
    static loadEruda(pollingIntervalMs?: number, maxAttempts?: number): void;
    /**
     * Registers a `M2Node` class with the global class registry.
     *
     * @remarks This is used to register a class so that it can be
     * instantiated by the `M2NodeFactory`.
     *
     * @param nodeClass - class or classes to register.
     */
    static registerM2NodeClass(...nodeClass: Array<M2NodeConstructor>): void;
    /**
     * Creates timestamps based on when the current frame's update began.
     *
     * @remarks When recording events related to node creation, node
     * parent-child relationships, and node properties, the timestamps should be
     * based on when current frame's update began -- not the current time. While
     * current time is most accurate for recording user interactions (use
     * `M2c2KitHelpers.createTimestamps()` for user interactions), the frame's
     * update is the best way to ensure that node events that occurred in the same
     * frame are recorded with the same timestamp and thus are replayed in the
     * correct order. For example, a node may be created, added to a scene, and
     * have its hidden property set to true, all in the same frame. If the
     * current timestamps were used for all these events, it could happen that
     * the hidden property is set slightly after the node is added to the scene.
     * When replayed, this could cause the node to be visible for a single frame
     * if the queue of replay events pulls only the creation and addition events.
     * By using the frame's update time, we ensure that all events related to a
     * node are recorded with the same timestamp and are replayed in the same
     * frame.
     * If game has not yet begun to run (i.e., frame updates have not yet started),
     * the timestamps will be based on the current time.
     *
     * @returns object with timestamps
     */
    static createFrameUpdateTimestamps(): {
        timestamp: number;
        iso8601Timestamp: string;
    };
    /**
     * Creates timestamps based on the current time.
     *
     * @remarks Use `M2c2KitHelpers.createFrameUpdateTimestamps()` when requesting
     * timestamps for events related to node creation, parent-child
     * relationships, and properties.
     * See {@link createFrameUpdateTimestamps()} for explanation.
     *
     * @returns object with `timestamp` and `iso8601Timestamp` properties
     */
    static createTimestamps(): {
        timestamp: number;
        iso8601Timestamp: string;
    };
    /**
     * Calculates the four points of the bounding box of the node, taking
     * into account the node's rotation (as well as the rotation of its
     * ancestors).
     *
     * @remarks This method is used to calculate the rotated bounding box of an
     * node when in order to determine if a point is inside the node in
     * response to DOM pointer events. This method is NOT used to prepare the
     * CanvasKit canvas for drawing the node.
     *
     * @param drawableNode
     * @returns array of points representing the rotated node
     */
    static calculateRotatedPoints(drawableNode: IDrawable & M2Node): Point[];
    /**
     * Rotates the canvas so the node appears rotated when drawn.
     *
     * @remarks Nodes inherit rotations from their ancestors. Each ancestor,
     * however, rotates around its own anchor point. Thus, we must rotate the
     * canvas around the anchor point of each ancestor as well as the node's
     * anchor point.
     *
     * @param canvas - CanvasKit canvas to rotate
     * @param drawableNode - Node to rotate the canvas for
     */
    static rotateCanvasForDrawableNode(canvas: Canvas, drawableNode: IDrawable & M2Node): void;
    /**
     * Calculates the absolute bounding box of the node before any rotation
     * is applied.
     *
     * @remarks The absolute bounding box is the bounding box of the node
     * relative to the scene's origin (0, 0).
     *
     * @param node
     * @returns the bounding box of the node
     */
    static calculateNodeAbsoluteBoundingBox(node: M2Node): BoundingBox;
    /**
     * Converts an angle from radians to degrees.
     *
     * @remarks In m2c2kit, radians are counter clockwise from the positive
     * x-axis, but the rotate method in CanvasKit uses degrees clockwise. Thus
     * we negate after conversion from radians to degrees.
     *
     * @param radians - The angle in radians
     * @returns The angle in degrees
     */
    static radiansToDegrees(radians: number): number;
    /**
     * Normalizes an angle in radians to the range [0, 2*Math.PI)
     *
     * @param radians - angle in radians
     * @returns normalized angle in radians
     */
    static normalizeAngleRadians(radians: number): number;
    /**
     * Checks if two points are on the same side of a line.
     *
     * @remarks The line is defined by two points, a and b. The function uses
     * the cross product to determine the relative position of the points.
     *
     * @param p1 - point to check
     * @param p2 - point to check
     * @param a - point that defines one end of the line
     * @param b - point that defines the other end of the line
     * @returns true if p1 and p2 are on the same side of the line, or false
     * otherwise
     */
    static arePointsOnSameSideOfLine(p1: Point, p2: Point, a: Point, b: Point): boolean;
    /**
     * Checks if a point is inside a rectangle.
     *
     * @remarks The rectangle may have been rotated (sides might not be parallel
     * to the axes).
     *
     * @param point - The Point to check
     * @param rect - An array of four Points representing the vertices of the
     * rectangle in clockwise order
     * @returns true if the Point is inside the rectangle
     */
    static isPointInsideRectangle(point: Point, rect: Point[]): boolean;
    /**
     * Checks if the node or any of its ancestors have been rotated.
     *
     * @param node - node to check
     * @returns true if the node or any of its ancestors have been rotated
     */
    static nodeOrAncestorHasBeenRotated(node: M2Node): boolean;
    /**
     * Converts a bounding box to an array of four points representing the
     * vertices of the rectangle.
     *
     * @remarks In m2c2kit, the y-axis is inverted: origin is in the upper-left.
     * Vertices are returned in clockwise order starting from the upper-left.
     *
     * @param boundingBox
     * @returns An array of four points
     */
    static boundingBoxToPoints(boundingBox: BoundingBox): Point[];
    /**
     * Finds the centroid of a rectangle.
     *
     * @param points - An array of four points representing the vertices of the
     * rectangle.
     * @returns array of points representing the centroid of the rectangle.
     */
    static findCentroid(points: Point[]): Point;
    /**
     * Rotates a point, counterclockwise, around another point by an angle in
     * radians.
     *
     * @param point - Point to rotate
     * @param radians - angle in radians
     * @param center - Point to rotate around
     * @returns rotated point
     */
    static rotatePoint(point: Point, radians: number, center: Point): Point;
    /**
     * Calculates the rotation transforms to apply to node, respecting any
     * ancestor rotations.
     *
     * @param drawableNode - node to calculate rotation transforms for
     * @returns array of rotation transforms to apply
     */
    static calculateRotationTransforms(drawableNode: IDrawable & M2Node): RotationTransform[];
}

/**
 * FontData holds metadata about the font (names, url) and the raw bytes of
 * the font TTF in an ArrayBuffer. This ArrayBuffer font data cannot be used
 * by canvaskit directly. These data are later used to create a canvaskit
 * TypeFace in FontManager.loadFonts().
 */
interface FontData {
    fontUrl: string;
    fontName: string;
    fontFamilyName: string;
    fontArrayBuffer: ArrayBuffer;
    isDefault: boolean;
}

declare global {
    var m2c2Globals: GlobalVariables;
}
interface GlobalVariables {
    now: number;
    iso8601Now: string;
    deltaTime: number;
    canvasScale: number;
    /**
     * rootScale is the scaling factor to be applied to scenes to scale up or
     * down to fit the device's window while preserving the aspect ratio the
     * game was designed for
     */
    rootScale: number;
    canvasCssWidth: number;
    canvasCssHeight: number;
    erudaRequested?: boolean;
    erudaInitialized?: boolean;
    addedScriptUrls: string[];
    /**
     * A dictionary of all `M2Node` classes that have been registered.
     * This is used to instantiate `M2Node` objects from their class name.
     *
     * @remarks The type should be `{ [key: string]: M2NodeConstructor }` or
     * `M2NodeClassRegistry`. But, this creates problems in Jest: I could not
     *  get ts-jest to compile when the type of a global variable is not a
     * simple type. Instead, the type of `m2NodeClassRegistry` is `object`,
     * and I will assert it to `M2NodeClassRegistry` when needed.
     */
    m2NodeClassRegistry: object;
    get eventSequence(): number;
    __sequence: number;
}

interface IText {
    text?: string;
    fontName?: string;
    fontColor?: RgbaColor;
    fontSize?: number;
    interpolation?: StringInterpolationMap;
    localize?: boolean;
}

declare enum LabelHorizontalAlignmentMode {
    Center = 0,
    Left = 1,
    Right = 2
}

interface LabelOptions extends M2NodeOptions, DrawableOptions, TextOptions {
    /** Text to be displayed. When operating with localization, text within double square brackets will be replaced with the value of the key in the translation. For example, if the text is `The translated word is [[RED]]`, `[[RED]]` will be replaced with the translation. If no localization is used, or a translation for the key is missing, then the text will be rendered as is. Tags for bold (`b`), italic (`i`), underline (`u`), overline(`o`), and strikethrough (`s`) are supported, e.g., `<b><u>Bold and underline</u></b>`. Note that while bold and italic and be combined, only one of underline, overline, and strikethrough can be used on a text segment. */
    text?: string;
    /** Horizontal alignment of label text. see {@link LabelHorizontalAlignmentMode}. Default is LabelHorizontalAlignmentMode.center  */
    horizontalAlignmentMode?: LabelHorizontalAlignmentMode;
    /** Maximum width of label text before wrapping occurs. Default is the canvas width */
    preferredMaxLayoutWidth?: number;
    /** Background color  of label text. Default is no background color */
    backgroundColor?: RgbaColor;
    /** Names of multiple fonts to use for text. For example, if a text font and an emoji font are to be used together. Must have been previously loaded */
    fontNames?: Array<string>;
}

declare class Label extends M2Node implements IDrawable, IText, LabelOptions {
    readonly type = M2NodeType.Label;
    isDrawable: boolean;
    isText: boolean;
    private _anchorPoint;
    private _zPosition;
    private _text;
    private _fontName;
    private _fontNames;
    private _fontColor;
    private _fontSize;
    private _interpolation;
    private _horizontalAlignmentMode;
    private _preferredMaxLayoutWidth;
    private _backgroundColor?;
    private _localize;
    private paragraph?;
    private paraStyle?;
    private builder?;
    private _fontPaint?;
    private _backgroundPaint?;
    private localizedFontSize;
    private localizedFontName;
    private localizedFontNames;
    private textAfterLocalization;
    private plainText;
    private styleSegments;
    /**
     * Single or multi-line text formatted and rendered on the screen.
     *
     * @remarks Label (in contrast to TextLine) has enhanced text support for
     * line wrapping, centering/alignment, and background colors.
     *
     * @param options - {@link LabelOptions}
     */
    constructor(options?: LabelOptions);
    get completeNodeOptions(): {
        horizontalAlignmentMode: LabelHorizontalAlignmentMode;
        preferredMaxLayoutWidth: number | undefined;
        backgroundColor: RgbaColor | undefined;
        fontNames: string[] | undefined;
        text?: string;
        fontName?: string;
        fontColor?: RgbaColor;
        fontSize?: number;
        interpolation?: StringInterpolationMap;
        localize?: boolean;
        anchorPoint?: Point;
        zPosition?: number;
        name?: string;
        position?: Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        isUserInteractionEnabled?: boolean;
        draggable?: boolean;
        hidden?: boolean;
        layout?: Layout;
        uuid?: string;
        suppressEvents?: boolean;
    };
    initialize(): void;
    /**
     * Parses text with formatting tags and returns plain text and style segments.
     * Supports <b> for bold, <i> for italics, and <u> for underline.
     * Properly handles nested tags like <b><u>bold and underlined</u></b>.
     * Throws errors for malformed tags, but treats unknown tags as plain text.
     *
     * @param text - The text with formatting tags
     * @returns The parsed text result
     * @throws Error if tags are improperly nested or unclosed
     */
    private parseFormattedText;
    /**
     * Adds text segments with consistent styling to the paragraph builder.
     *
     * @param builder - {@link ParagraphBuilder}
     * @param styleSegments - Segments of text with consistent styling
     * @param defaultStyle - Default style to apply
     */
    private addStyleSegmentsToParagraphBuilder;
    /**
     * Helper that adds text to the paragraph builder with the specified style.
     *
     * @param builder - {@link ParagraphBuilder}
     * @param text - The text to add
     * @param defaultStyle - The default style to apply
     * @param styleModifiers - Additional style modifications
     * @returns void
     */
    private addTextWithStyle;
    /**
     * Determines the M2Font objects that need to be ready in order to draw
     * the Label.
     *
     * @remarks It needs a FontManager because it may need to look up the
     * default font.
     *
     * @param fontManager - {@link FontManager}
     * @returns an array of M2Font objects that are required for the Label
     */
    private getRequiredLabelFonts;
    dispose(): void;
    get text(): string;
    set text(text: string);
    get interpolation(): StringInterpolationMap;
    set interpolation(interpolation: StringInterpolationMap);
    get fontName(): string | undefined;
    set fontName(fontName: string | undefined);
    get fontNames(): Array<string> | undefined;
    set fontNames(fontNames: Array<string> | undefined);
    get fontColor(): RgbaColor;
    set fontColor(fontColor: RgbaColor);
    get fontSize(): number;
    set fontSize(fontSize: number);
    get horizontalAlignmentMode(): LabelHorizontalAlignmentMode;
    set horizontalAlignmentMode(horizontalAlignmentMode: LabelHorizontalAlignmentMode);
    get preferredMaxLayoutWidth(): number | undefined;
    set preferredMaxLayoutWidth(preferredMaxLayoutWidth: number | undefined);
    get backgroundColor(): RgbaColor | undefined;
    set backgroundColor(backgroundColor: RgbaColor | undefined);
    get localize(): boolean;
    set localize(localize: boolean);
    get anchorPoint(): Point;
    set anchorPoint(anchorPoint: Point);
    get zPosition(): number;
    set zPosition(zPosition: number);
    private get backgroundPaint();
    private set backgroundPaint(value);
    private get fontPaint();
    private set fontPaint(value);
    /**
     * Duplicates a node using deep copy.
     *
     * @remarks This is a deep recursive clone (node and children).
     * The uuid property of all duplicated nodes will be newly created,
     * because uuid must be unique.
     *
     * @param newName - optional name of the new, duplicated node. If not
     * provided, name will be the new uuid
     */
    duplicate(newName?: string): Label;
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
}

/**
 * This class is used internally for processing layout constraints that
 * have been defined according to the Constraints interface.
 *
 * Imagine we have two nodes, A and B. B's position is set
 * using its position property. A's position is set using the layout
 * constraint "bottomToTopOf B." A is the focal node in this example.
 * What this means is that A's y coordinate will be computed such that
 * the bottom of A is the top of B. If A and B are squares, then A sits
 * on top of B with no gap.
 */
declare class LayoutConstraint {
    type: ConstraintType;
    alterNode: M2Node;
    verticalConstraint: boolean;
    focalNodeMinimum: boolean;
    alterNodeMinimum: boolean;
    verticalTypes: ConstraintType[];
    focalNodeMinimumTypes: ConstraintType[];
    alterNodeMinimumTypes: ConstraintType[];
    constructor(type: ConstraintType, alterNode: M2Node);
}

/**
 * A class to create, start, and stop named timers that measure elapsed time in milliseconds.
 *
 * @deprecated Use Timer class instead. To migrate to the Timer class, use Timer.startNew() to create and start a new timer instead
 * of LegacyTimer.start().
 */
declare class LegacyTimer {
    private startTime;
    private stopTime;
    private stopped;
    /**
     * cumulativeElapsed is a cumulative total of elapsed time while the timer
     * was in previous started (running) states, NOT INCLUDING the possibly
     * active run's duration
     */
    private cumulativeElapsed;
    private name;
    private static _timers;
    constructor(name: string);
    /**
     * Aliases performance.now()
     *
     * @remarks The m2c2kit Timer class is designed to measure elapsed durations
     * after a designated start point for a uniquely named timer. However, if a
     * timestamp based on the
     * [time origin](https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp#the_time_origin)
     * is needed, this method can be used.
     *
     * @deprecated Use Timer class.
     *
     * @returns a [DOMHighResTimeStamp](https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp)
     */
    static now(): number;
    /**
     * Starts a millisecond-resolution timer based on
     * [performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now).
     *
     * @remarks The method throws an error if a timer with the given
     * name is already in a started state.
     *
     * @deprecated Use Timer class. Use Timer.startNew() to create and start a new timer or Timer.new() to create a new timer without starting it.
     *
     * @param name - The name of the timer to be started
     */
    static start(name: string): void;
    /**
     * Stops a timer.
     *
     * @remarks The method throws an error if a timer with the given
     * name is already in a stopped state, or if a timer with the
     * given name has not been started.
     *
     * @deprecated Use Timer class.
     *
     * @param name - The name of the timer to be stopped
     */
    static stop(name: string): void;
    /**
     * Restarts a timer.
     *
     * @remarks The timer elapsed duration is set to 0 and it starts anew.
     * The method throws an error if a timer with the given
     * name does not exist (if there is not a started or stopped timer
     * with the given name).
     *
     * @deprecated Use Timer class. Use Timer.startNew() to create and start a new timer with the same name.
     *
     * @param name - The name of the timer to be restarted
     */
    static restart(name: string): void;
    /**
     * Returns the total time elapsed, in milliseconds, of the timer.
     *
     * @remarks The total time elapsed will include all durations from multiple
     * starts and stops of the timer, if applicable. A timer's elapsed duration
     * can be read while it is in started or stopped state. The method throws
     * an error if a timer with the given name does not exist.
     *
     * @deprecated Use Timer class.
     *
     * @param name - The name of the timer whose elapsed duration is requested
     */
    static elapsed(name: string): number;
    /**
     * Removes a timer.
     *
     * @remarks After removal, no additional methods can be used with a timer
     * of the given name, other than to start a new timer with the given name,
     * whose duration will begin at 0 again. The method throws an error if
     * a timer with the given name does not exist.
     *
     * @deprecated Use Timer class.
     *
     * @param name - The name of the timer to be removed
     */
    static remove(name: string): void;
    /**
     * Remove all timers.
     *
     * @remarks This method will {@link remove} any timers in a started or
     * stopped state. This method is idempotent; method is safe to call even
     * if there are no timers to remove; no errors are thrown if there are
     * not any timers that can be removed.
     *
     * @deprecated Use Timer class.
     */
    static removeAll(): void;
    /**
     * Checks if a timer of the given name exists.
     *
     * @remarks The method checks if there is a timer with the given name.
     *
     * @deprecated Use Timer class.
     *
     * @param name - The name of the timer to check for existence
     * @returns boolean
     */
    static exists(name: string): boolean;
}

/** Base interface for all Plugin events. */
interface PluginEvent extends M2Event<Plugin> {
    target: Plugin;
}

declare class RandomDraws {
    /**
     * Draws a single random integer from a uniform distribution of integers in
     * the specified range.
     *
     * @param minimumInclusive - Lower bound of range
     * @param maximumInclusive - Upper bound of range
     * @returns A sampled integer
     */
    static SingleFromRange(minimumInclusive: number, maximumInclusive: number): number;
    /**
     * Draws random integers, without replacement, from a uniform distribution
     * of integers in the specified range.
     *
     * @param n - Number of draws
     * @param minimumInclusive - Lower bound of range
     * @param maximumInclusive - Upper bound of range
     * @returns An array of integers
     */
    static FromRangeWithoutReplacement(n: number, minimumInclusive: number, maximumInclusive: number): Array<number>;
    /**
     * Draw random grid cell locations, without replacement, from a uniform
     * distribution of all grid cells. Grid cell locations are zero-based,
     * i.e., upper-left is (0,0).
     *
     * @param n - Number of draws
     * @param rows  - Number of rows in grid; must be at least 1
     * @param columns - Number of columns in grid; must be at least 1
     * @param predicate - Optional lambda function that takes a grid row number
     * and grid column number pair and returns a boolean to indicate if the pair
     * should be allowed. For example, if one wanted to constrain the random
     * grid location to be along the diagonal, the predicate would be:
     * (row, column) => row === column
     * @returns Array of grid cells. Each cell is object in form of:
     * &#123 row: number, column: number &#125;. Grid cell locations are zero-based
     */
    static FromGridWithoutReplacement(n: number, rows: number, columns: number, predicate?: (row: number, column: number) => boolean): Array<{
        row: number;
        column: number;
    }>;
}

/**
 * Assessments that generate scoring data must implement the ScoringProvider
 * interface
 */
interface ScoringProvider {
    /**
     * Calculates scores based on the provided activity data and optional
     * additional parameters.
     *
     * @param data - Activity data from which to calculate scores.
     * @param extras - Optional additional parameters that are needed for an
     * activity's scoring calculations. This can include things like
     * game parameters, user context, or other metadata that is relevant
     * to the scoring logic. The structure of this object is not
     * defined by this interface, as it can vary widely between different
     * activities.
     * @returns The calculated scores object or an array of such objects. If an
     * array of is returned, it should have length 1.
     */
    calculateScores(data: ActivityKeyValueData[], extras?: {
        [key: string]: unknown;
    }): ActivityKeyValueData | Array<ActivityKeyValueData>;
}

declare enum ShapeType {
    Undefined = "Undefined",
    Rectangle = "Rectangle",
    Circle = "Circle",
    Path = "Path"
}

interface ShapeOptions extends M2NodeOptions, DrawableOptions {
    shapeType?: ShapeType;
    /** If provided, shape will be a circle with given radius */
    circleOfRadius?: number;
    /** If provided, shape will be a rectangle as specified in {@link Rect} */
    rect?: RectOptions;
    /** Radius of rectangle's corners */
    cornerRadius?: number;
    /** Color with which to fill shape. Default is Constants.DEFAULT_SHAPE_FILL_COLOR (WebColors.Red)  */
    fillColor?: RgbaColor;
    /** Color with which to outline shape. Default is no color for rectangle and circle, red for path. */
    strokeColor?: RgbaColor;
    /** Width of outline. Default is undefined for rectangle and circle, 2 for path. */
    lineWidth?: number;
    /** A path from which to create the shape */
    path?: M2Path | M2ColorfulPath | SvgStringPath;
    /** Size of container "view box" for M2Path and M2ColorfulPath shapes. Leave undefined for circle, rectangle, and SvgStringPath shapes. */
    size?: Size;
    /** Should the shape be drawn with anti-aliasing. Default is yes. */
    isAntialiased?: boolean;
}

declare class Shape extends M2Node implements IDrawable, ShapeOptions {
    readonly type = M2NodeType.Shape;
    isDrawable: boolean;
    isShape: boolean;
    private _anchorPoint;
    private _zPosition;
    shapeType: ShapeType;
    private _circleOfRadius?;
    private _rect?;
    private _path?;
    ckPath: Path | null;
    ckPathWidth?: number;
    ckPathHeight?: number;
    private _cornerRadius;
    private _fillColor;
    private _strokeColor?;
    private _lineWidth?;
    private _isAntialiased;
    private _fillColorPaintAntialiased?;
    private _strokeColorPaintAntialiased?;
    private _fillColorPaintNotAntialiased?;
    private _strokeColorPaintNotAntialiased?;
    private svgPathRequestedWidth?;
    private svgPathRequestedHeight?;
    private svgPathScaleForResizing;
    private svgPathWidth;
    private svgPathHeight;
    private svgPreviousAbsoluteX;
    private svgPreviousAbsoluteY;
    private svgFirstPathDraw;
    private colorfulPathPaints;
    /**
     * Rectangular, circular, or path-based shape
     *
     * @param options - {@link ShapeOptions}
     */
    constructor(options?: ShapeOptions);
    get completeNodeOptions(): {
        circleOfRadius: number | undefined;
        rect: RectOptions | undefined;
        cornerRadius: number;
        fillColor: RgbaColor;
        strokeColor: RgbaColor | undefined;
        lineWidth: number | undefined;
        path: M2Path | M2ColorfulPath | SvgStringPath | undefined;
        size: Size | undefined;
        isAntialiased: boolean;
        anchorPoint?: Point;
        zPosition?: number;
        name?: string;
        position?: Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        isUserInteractionEnabled?: boolean;
        draggable?: boolean;
        hidden?: boolean;
        layout?: Layout;
        uuid?: string;
        suppressEvents?: boolean;
    };
    initialize(): void;
    get anchorPoint(): Point;
    set anchorPoint(anchorPoint: Point);
    get zPosition(): number;
    set zPosition(zPosition: number);
    dispose(): void;
    /**
     * Duplicates a node using deep copy.
     *
     * @remarks This is a deep recursive clone (node and children).
     * The uuid property of all duplicated nodes will be newly created,
     * because uuid must be unique.
     *
     * @param newName - optional name of the new, duplicated node. If not
     * provided, name will be the new uuid
     */
    duplicate(newName?: string): Shape;
    update(): void;
    draw(canvas: Canvas): void;
    private applyAlphaToPaints;
    private drawPathFromM2Path;
    private drawPathFromSvgString;
    private calculateSvgPathY;
    private calculateSvgPathX;
    private saveSvgPathAbsolutePosition;
    private calculateTransformationMatrix;
    private pathNeedsTransform;
    private shapeIsSvgStringPath;
    private shapeIsM2Path;
    private pathIsM2ColorfulPath;
    private drawCircle;
    private drawRectangle;
    private drawCircleWithCanvasKit;
    private drawRectangleWithCanvasKit;
    private calculateCKRoundedRectangle;
    private getFillPaint;
    private getStrokePaint;
    warmup(canvas: Canvas): void;
    private warmupFilledCircle;
    private warmupStrokedCircle;
    private warmupFilledRectangle;
    private warmupStrokedRectangle;
    get circleOfRadius(): number | undefined;
    set circleOfRadius(circleOfRadius: number | undefined);
    get rect(): RectOptions | undefined;
    set rect(rect: RectOptions | undefined);
    get cornerRadius(): number;
    set cornerRadius(cornerRadius: number | undefined);
    get lineWidth(): number | undefined;
    set lineWidth(lineWidth: number | undefined);
    get path(): M2Path | M2ColorfulPath | SvgStringPath | undefined;
    set path(path: M2Path | M2ColorfulPath | SvgStringPath | undefined);
    get fillColor(): RgbaColor;
    set fillColor(fillColor: RgbaColor);
    get strokeColor(): RgbaColor | undefined;
    set strokeColor(strokeColor: RgbaColor | undefined);
    get isAntialiased(): boolean;
    set isAntialiased(isAntialiased: boolean);
    get fillColorPaintAntialiased(): Paint;
    set fillColorPaintAntialiased(value: Paint);
    get strokeColorPaintAntialiased(): Paint;
    set strokeColorPaintAntialiased(value: Paint);
    get fillColorPaintNotAntialiased(): Paint;
    set fillColorPaintNotAntialiased(value: Paint);
    get strokeColorPaintNotAntialiased(): Paint;
    set strokeColorPaintNotAntialiased(value: Paint);
}

interface SoundPlayerOptions extends M2NodeOptions {
    /** Name of sound to play. Must have been previously loaded */
    soundName: string;
}

declare class SoundPlayer extends M2Node implements SoundPlayerOptions {
    readonly type = M2NodeType.SoundPlayer;
    isDrawable: boolean;
    soundName: string;
    /**
     * Node for playing sounds.
     *
     * @param options - {@link SoundPlayerOptions}
     */
    constructor(options: SoundPlayerOptions);
    initialize(): void;
    /**
     * Remove an action from this node. If the action is running, it will be
     * stopped.
     *
     * @privateRemarks This methods overrides the `removeAction` method from the
     * `M2Node` class. It is necessary to override this method because the
     * `SoundPlayer` class has a special case for removing actions that play
     * sounds.
     *
     * @param key - key (string identifier) of the action to remove
     */
    removeAction(key: string): void;
    /**
     * Remove all actions from this node. If actions are running, they will be
     * stopped.
     *
     * @privateRemarks This methods overrides the `removeAllActions` method from
     * the `M2Node` class. It is necessary to override this method because the
     * `SoundPlayer` class has a special case for removing actions that play
     * sounds.
     */
    removeAllActions(): void;
    /**
     * Stops the audio source node for a sound play action.
     *
     * @remarks When a SoundPlayer play action is removed, the audio source node
     * must be stopped and disconnected.
     *
     * @param playAction - the play action of the sound to stop
     */
    private stopSoundActionAudio;
    dispose(): void;
    /**
     * Duplicates a node using deep copy.
     *
     * @remarks This is a deep recursive clone (node and children).
     * The uuid property of all duplicated nodes will be newly created,
     * because uuid must be unique.
     *
     * @param newName - optional name of the new, duplicated node. If not
     * provided, name will be the new uuid
     */
    duplicate(newName?: string): SoundPlayer;
}

interface SoundRecorderOptions extends M2NodeOptions {
    /** Preferred MIME type to use for recording audio. `audio/webm` or `audio/mp4` is recommended. If omitted, it will use any MIME type supported by the device. */
    mimeType?: string;
    /** Additional MIME types to use for recording audio, in order of preference, if preferred type is not supported. `["audio/webm", "audio/mp4"]` is recommended. */
    backupMimeTypes?: Array<string>;
    /** Maximum duration, in milliseconds, to allow recording. If recording lasts longer than this duration, it will automatically be paused. This can be used to prevent excessively long recording and memory usage. */
    maximumDuration?: number;
    /** Additional audio constraints to be applied when requesting the audio device.
     * see https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
     * @remarks Use with caution. All kinds of constraints may not be supported
     * on all browsers, and specifying too restrictive constraints will result in
     * no available user audio device and an exception. Unusual constraints may
     * also result in an unexpected device being selected.
     * @example
     *  audioTrackConstraints: {
     *    channelCount: 1,
     *    noiseSuppression: { ideal: true },
     *  }
     * */
    audioTrackConstraints?: MediaTrackConstraints;
}

interface SoundRecorderResults {
    /** The MIME type of the recorded audio, possibly including the codec. */
    mimeType: string;
    /** The ISO 8601 device timestamp when the recording began. */
    beginIso8601Timestamp: string;
    /** The ISO 8601 device timestamp when the recording ended. */
    endIso8601Timestamp: string;
    /** The duration of the recording in milliseconds. @remarks The duration may be different from the timestamp end minus begin times if the recording was paused. */
    duration: number;
    /** The settings of the audio tracks when the recording began. */
    audioTrackSettings?: Array<MediaTrackSettings>;
    /** The recorded audio as a base 64 string. */
    audioBase64: string;
    /** The recorded audio as a Blob. */
    audioBlob: Blob;
}

declare class SoundRecorder extends M2Node implements Omit<SoundRecorderOptions, "backupMimeTypes"> {
    readonly type = M2NodeType.SoundRecorder;
    isDrawable: boolean;
    mimeType?: string;
    audioTrackConstraints?: MediaTrackConstraints;
    maximumDuration?: number;
    private _isRecording;
    private _isPaused;
    private mediaRecorder?;
    private audioChunks;
    private mediaTrackSettings?;
    private beginIso8601Timestamp?;
    private endIso8601Timestamp?;
    private timerUuid;
    /**
     * Node for recording sounds.
     *
     * @param options - {@link SoundRecorderOptions}
     */
    constructor(options?: SoundRecorderOptions);
    initialize(): void;
    /**
     * Starts recording audio from the microphone.
     *
     * @remarks If the `SoundRecorder` is already recording, an error will be
     * thrown. If permission to use the microphone has not been granted, the
     * browser will prompt the user to allow or deny access. Denial of access
     * will result in an error being thrown. To avoid this, use the
     * `queryPermission()` and `requestPermission()` methods to check and request
     * permission, respectively, and handle the results accordingly.
     */
    start(): Promise<void>;
    /**
     * Stops recording audio from the microphone.
     *
     * @remarks If the `stop()` method is not awaited, the method returns a
     * Promise and the useable data will be lost.
     *
     * @returns A promise that resolves to a {@link SoundRecorderResults} object.
     * The `audioBase64` property of the object contains the recorded audio as a
     * base64 string.
     */
    stop(): Promise<SoundRecorderResults>;
    pause(): void;
    resume(): void;
    /**
     * Checks if the microphone permission is granted.
     *
     * @remarks This does not request permission from the user. It only queries
     * the current microphone permission state.
     *
     * @returns The `state` property ("granted", "denied", or "prompt") of
     * `PermissionStatus` or undefined if the browser does not support the
     * "microphone" permission.
     * See https://developer.mozilla.org/en-US/docs/Web/API/PermissionStatus/state
     */
    queryPermission(): Promise<string | undefined>;
    /**
     * Requests permission to use the microphone, and possibly prompts the user
     * to allow or deny access.
     *
     * @returns true if the microphone permission is granted, false if denied.
     */
    requestPermission(): Promise<boolean>;
    /** Is the `SoundRecorder` currently recording? */
    get isRecording(): boolean;
    /** Is the `SoundRecorder` currently paused? */
    get isPaused(): boolean;
    update(): void;
    /**
     * Returns an array of supported audio MIME types for MediaRecorder.
     *
     * @remarks Adapted from https://stackoverflow.com/a/68236494
     * License: https://creativecommons.org/licenses/by-sa/4.0/
     *
     * @returns
     */
    private getMediaRecorderSupportedAudioMimeTypes;
    private blobToBase64;
    private getMimeTypeWithoutCodecs;
    private getSupportedBackupMimeType;
    dispose(): void;
    /**
     * Duplicates a node using deep copy.
     *
     * @remarks This is a deep recursive clone (node and children).
     * The uuid property of all duplicated nodes will be newly created,
     * because uuid must be unique.
     *
     * @param newName - optional name of the new, duplicated node. If not
     * provided, name will be the new uuid
     */
    duplicate(newName?: string): SoundRecorder;
}

interface SpriteOptions extends M2NodeOptions, DrawableOptions {
    /** Name of image to use for sprite. Must have been previously loaded */
    imageName?: string;
}

declare class Sprite extends M2Node implements IDrawable, SpriteOptions {
    readonly type = M2NodeType.Sprite;
    isDrawable: boolean;
    private _anchorPoint;
    private _zPosition;
    private _imageName;
    private m2Image?;
    private _paint?;
    /**
     * Visual image displayed on the screen.
     *
     * @remarks Images that will be used to create the sprite must be loaded during the Game.initialize() method prior to their use.
     *
     * @param options - {@link SpriteOptions}
     */
    constructor(options?: SpriteOptions);
    get completeNodeOptions(): {
        imageName: string;
        anchorPoint?: Point;
        zPosition?: number;
        name?: string;
        position?: Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        isUserInteractionEnabled?: boolean;
        draggable?: boolean;
        hidden?: boolean;
        layout?: Layout;
        uuid?: string;
        suppressEvents?: boolean;
    };
    initialize(): void;
    dispose(): void;
    get imageName(): string;
    set imageName(imageName: string);
    get anchorPoint(): Point;
    set anchorPoint(anchorPoint: Point);
    get zPosition(): number;
    set zPosition(zPosition: number);
    private set paint(value);
    private get paint();
    /**
     * Duplicates a node using deep copy.
     *
     * @remarks This is a deep recursive clone (node and children).
     * The uuid property of all duplicated nodes will be newly created,
     * because uuid must be unique.
     *
     * @param newName - optional name of the new, duplicated node. If not
     * provided, name will be the new uuid
     */
    duplicate(newName?: string): Sprite;
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
    /**
     * Draws a rectangle border around the image to indicate that a fallback
     * image is being used.
     *
     * @remarks The size of the rectangle is the same as the image, but because
     * the stroke width of the paint is wider than 1 pixel (see method
     * `configureImageLocalization()` in `ImageManager.ts`), the rectangle will
     * be larger than the image and thus be visible.
     *
     * @param canvas - CanvasKit canvas to draw on
     */
    private drawFallbackImageBorder;
}

interface StoryOptions {
    sceneNamePrefix?: string;
}

declare abstract class Story {
    static create(options?: StoryOptions): Array<Scene>;
}

interface TextLineOptions extends M2NodeOptions, DrawableOptions, TextOptions {
    width?: number;
}

declare class TextLine extends M2Node implements IDrawable, IText, TextLineOptions {
    readonly type = M2NodeType.TextLine;
    isDrawable: boolean;
    isText: boolean;
    private _zPosition;
    private _anchorPoint;
    private _text;
    private _fontName;
    private _fontColor;
    private _fontSize;
    private _interpolation;
    private _localize;
    private paint?;
    private font?;
    private typeface;
    private tryMissingTranslationPaint;
    private textForDraw;
    private fontForDraw?;
    private localizedFontSize;
    private localizedFontName;
    private localizedFontNames;
    /**
     * Single-line text rendered on the screen.
     *
     * @remarks TextLine has no paragraph formatting options; Label will be preferred in most use cases.
     *
     * @param options - {@link TextLineOptions}
     */
    constructor(options?: TextLineOptions);
    get completeNodeOptions(): {
        width: number;
        text?: string;
        fontName?: string;
        fontColor?: RgbaColor;
        fontSize?: number;
        interpolation?: StringInterpolationMap;
        localize?: boolean;
        anchorPoint?: Point;
        zPosition?: number;
        name?: string;
        position?: Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        isUserInteractionEnabled?: boolean;
        draggable?: boolean;
        hidden?: boolean;
        layout?: Layout;
        uuid?: string;
        suppressEvents?: boolean;
    };
    initialize(): void;
    /**
     * Determines the M2Font object that needs to be ready in order to draw
     * the TextLine.
     *
     * @remarks It needs a FontManager because it may need to look up the
     * default font.
     *
     * @param fontManager - {@link FontManager}
     * @returns a M2Font object that is required for the TextLine
     */
    private getRequiredTextLineFont;
    private createFontPaint;
    private createFont;
    get text(): string;
    set text(text: string);
    get fontName(): string | undefined;
    set fontName(fontName: string | undefined);
    get fontColor(): RgbaColor;
    set fontColor(fontColor: RgbaColor);
    get fontSize(): number;
    set fontSize(fontSize: number);
    get interpolation(): StringInterpolationMap;
    set interpolation(interpolation: StringInterpolationMap);
    get localize(): boolean;
    set localize(localize: boolean);
    get anchorPoint(): Point;
    set anchorPoint(anchorPoint: Point);
    get zPosition(): number;
    set zPosition(zPosition: number);
    dispose(): void;
    /**
     * Duplicates a node using deep copy.
     *
     * @remarks This is a deep recursive clone (node and children).
     * The uuid property of all duplicated nodes will be newly created,
     * because uuid must be unique.
     *
     * @param newName - optional name of the new, duplicated node. If not
     * provided, name will be the new uuid
     */
    duplicate(newName?: string): TextLine;
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
}

/**
 * A class to create, start, and stop named timers that measure elapsed time in milliseconds.
 */
declare class Timer {
    private startTime;
    private stopTime;
    private stopped;
    /**
     * cumulativeElapsed is a cumulative total of elapsed time while the timer
     * was in previous started (running) states, NOT INCLUDING the possibly
     * active run's duration
     */
    private cumulativeElapsed;
    private name;
    private static _timers;
    private constructor();
    /**
     * Aliases performance.now()
     *
     * @remarks The m2c2kit Timer class is designed to measure elapsed durations
     * after a designated start point for a uniquely named timer. However, if a
     * timestamp based on the
     * [time origin](https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp#the_time_origin)
     * is needed, this method can be used.
     *
     * @returns a [DOMHighResTimeStamp](https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp)
     */
    static now(): number;
    /**
     * Creates, but does not start, a new millisecond-resolution timer based on
     * [performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now).
     *
     * @remarks If a timer with the given name already exists, it will be created
     * and set back to zero, but not started.
     *
     * @param name - The name of the timer to be started
     */
    static new(name: string): void;
    /**
     * Creates and starts a new millisecond-resolution timer based on
     * [performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now).
     *
     * @remarks If a timer with the given name already exists, it will be created,
     * set back to zero, and started.
     *
     * @param name - The name of the timer to be started
     */
    static startNew(name: string): void;
    /**
     * Starts a stopped millisecond-resolution timer based on
     * [performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now).
     *
     * @remarks The method throws an error if a timer with the given name does
     * not exist or is not in a stopped state.
     *
     * @param name - The name of the timer to be started
     */
    static start(name: string): void;
    /**
     * Stops a timer.
     *
     * @remarks The method throws an error if a timer with the given
     * name is already in a stopped state, or if a timer with the
     * given name has not been started.
     *
     * @param name - The name of the timer to be stopped
     */
    static stop(name: string): void;
    /**
     * Returns the total time elapsed, in milliseconds, of the timer.
     *
     * @remarks The total time elapsed will include all durations from multiple
     * starts and stops of the timer, if applicable. A timer's elapsed duration
     * can be read while it is in started or stopped state. The method throws
     * an error if a timer with the given name does not exist.
     *
     * @param name - The name of the timer whose elapsed duration is requested
     */
    static elapsed(name: string): number;
    /**
     * Removes a timer.
     *
     * @remarks After removal, no additional methods can be used with a timer
     * of the given name, other than to create a new timer with the given name,
     * whose duration will be set at 0 again. The method throws an error if
     * a timer with the given name does not exist.
     *
     * @param name - The name of the timer to be removed
     */
    static remove(name: string): void;
    /**
     * Remove all timers.
     *
     * @remarks This method will {@link remove} any timers in a started or
     * stopped state. This method is idempotent; method is safe to call even
     * if there are no timers to remove; no errors are thrown if there are
     * not any timers that can be removed.
     */
    static removeAll(): void;
    /**
     * Checks if a timer of the given name exists.
     *
     * @remarks The method checks if there is a timer with the given name.
     *
     * @param name - The name of the timer to check for existence
     * @returns boolean
     */
    static exists(name: string): boolean;
}

declare class Uuid {
    static generate(): string;
    /**
     * Tests if a string is a valid UUID.
     *
     * @remarks Will match UUID versions 1 through 8, plus the nil UUID.
     *
     * @param uuid - the string to test
     * @returns true if the string is a valid UUID
     */
    static isValid(uuid: string | undefined | null): boolean;
}

declare class WebColors {
    static Transparent: RgbaColor;
    static MediumVioletRed: RgbaColor;
    static DeepPink: RgbaColor;
    static PaleVioletRed: RgbaColor;
    static HotPink: RgbaColor;
    static LightPink: RgbaColor;
    static Pink: RgbaColor;
    static DarkRed: RgbaColor;
    static Red: RgbaColor;
    static Firebrick: RgbaColor;
    static Crimson: RgbaColor;
    static IndianRed: RgbaColor;
    static LightCoral: RgbaColor;
    static Salmon: RgbaColor;
    static DarkSalmon: RgbaColor;
    static LightSalmon: RgbaColor;
    static OrangeRed: RgbaColor;
    static Tomato: RgbaColor;
    static DarkOrange: RgbaColor;
    static Coral: RgbaColor;
    static Orange: RgbaColor;
    static DarkKhaki: RgbaColor;
    static Gold: RgbaColor;
    static Khaki: RgbaColor;
    static PeachPuff: RgbaColor;
    static Yellow: RgbaColor;
    static PaleGoldenrod: RgbaColor;
    static Moccasin: RgbaColor;
    static PapayaWhip: RgbaColor;
    static LightGoldenrodYellow: RgbaColor;
    static LemonChiffon: RgbaColor;
    static LightYellow: RgbaColor;
    static Maroon: RgbaColor;
    static Brown: RgbaColor;
    static SaddleBrown: RgbaColor;
    static Sienna: RgbaColor;
    static Chocolate: RgbaColor;
    static DarkGoldenrod: RgbaColor;
    static Peru: RgbaColor;
    static RosyBrown: RgbaColor;
    static Goldenrod: RgbaColor;
    static SandyBrown: RgbaColor;
    static Tan: RgbaColor;
    static Burlywood: RgbaColor;
    static Wheat: RgbaColor;
    static NavajoWhite: RgbaColor;
    static Bisque: RgbaColor;
    static BlanchedAlmond: RgbaColor;
    static Cornsilk: RgbaColor;
    static DarkGreen: RgbaColor;
    static Green: RgbaColor;
    static DarkOliveGreen: RgbaColor;
    static ForestGreen: RgbaColor;
    static SeaGreen: RgbaColor;
    static Olive: RgbaColor;
    static OliveDrab: RgbaColor;
    static MediumSeaGreen: RgbaColor;
    static LimeGreen: RgbaColor;
    static Lime: RgbaColor;
    static SpringGreen: RgbaColor;
    static MediumSpringGreen: RgbaColor;
    static DarkSeaGreen: RgbaColor;
    static MediumAquamarine: RgbaColor;
    static YellowGreen: RgbaColor;
    static LawnGreen: RgbaColor;
    static Chartreuse: RgbaColor;
    static LightGreen: RgbaColor;
    static GreenYellow: RgbaColor;
    static PaleGreen: RgbaColor;
    static Teal: RgbaColor;
    static DarkCyan: RgbaColor;
    static LightSeaGreen: RgbaColor;
    static CadetBlue: RgbaColor;
    static DarkTurquoise: RgbaColor;
    static MediumTurquoise: RgbaColor;
    static Turquoise: RgbaColor;
    static Aqua: RgbaColor;
    static Cyan: RgbaColor;
    static Aquamarine: RgbaColor;
    static PaleTurquoise: RgbaColor;
    static LightCyan: RgbaColor;
    static Navy: RgbaColor;
    static DarkBlue: RgbaColor;
    static MediumBlue: RgbaColor;
    static Blue: RgbaColor;
    static MidnightBlue: RgbaColor;
    static RoyalBlue: RgbaColor;
    static SteelBlue: RgbaColor;
    static DodgerBlue: RgbaColor;
    static DeepSkyBlue: RgbaColor;
    static CornflowerBlue: RgbaColor;
    static SkyBlue: RgbaColor;
    static LightSkyBlue: RgbaColor;
    static LightSteelBlue: RgbaColor;
    static LightBlue: RgbaColor;
    static PowderBlue: RgbaColor;
    static Indigo: RgbaColor;
    static Purple: RgbaColor;
    static DarkMagenta: RgbaColor;
    static DarkViolet: RgbaColor;
    static DarkSlateBlue: RgbaColor;
    static BlueViolet: RgbaColor;
    static DarkOrchid: RgbaColor;
    static Fuchsia: RgbaColor;
    static Magenta: RgbaColor;
    static SlateBlue: RgbaColor;
    static MediumSlateBlue: RgbaColor;
    static MediumOrchid: RgbaColor;
    static MediumPurple: RgbaColor;
    static Orchid: RgbaColor;
    static Violet: RgbaColor;
    static Plum: RgbaColor;
    static Thistle: RgbaColor;
    static Lavender: RgbaColor;
    static MistyRose: RgbaColor;
    static AntiqueWhite: RgbaColor;
    static Linen: RgbaColor;
    static Beige: RgbaColor;
    static WhiteSmoke: RgbaColor;
    static LavenderBlush: RgbaColor;
    static OldLace: RgbaColor;
    static AliceBlue: RgbaColor;
    static Seashell: RgbaColor;
    static GhostWhite: RgbaColor;
    static Honeydew: RgbaColor;
    static FloralWhite: RgbaColor;
    static Azure: RgbaColor;
    static MintCream: RgbaColor;
    static Snow: RgbaColor;
    static Ivory: RgbaColor;
    static White: RgbaColor;
    static Black: RgbaColor;
    static DarkSlateGray: RgbaColor;
    static DimGray: RgbaColor;
    static SlateGray: RgbaColor;
    static Gray: RgbaColor;
    static LightSlateGray: RgbaColor;
    static DarkGray: RgbaColor;
    static Silver: RgbaColor;
    static LightGray: RgbaColor;
    static Gainsboro: RgbaColor;
    static RebeccaPurple: RgbaColor;
}

declare class WebGlInfo {
    /**
     * Returns graphics driver vendor and renderer information.
     *
     * @remarks Information is from parameters UNMASKED_VENDOR_WEBGL and
     * UNMASKED_RENDERER_WEBGL when asking for WEBGL_debug_renderer_info
     * from the WebGLRenderingContext.
     *
     * @returns string
     */
    static getRendererString(): string;
    /**
     * Removes the temporary canvas that was created to get WebGL information.
     */
    static dispose(): void;
}

export { Action, ActivityType, CanvasKitHelpers, ColorfulMutablePath, Composite, Constants, ConstraintType, CustomAction, Dimensions, Easings, Equal, Equals, EventStore, EventStoreMode, FadeAlphaAction, FontManager, Game, GroupAction, I18n, ImageManager, Label, LabelHorizontalAlignmentMode, LayoutConstraint, LegacyTimer, M2Error, M2EventType, M2ImageStatus, M2Node, M2NodeFactory, M2NodeType, M2SoundStatus, M2c2KitHelpers, MoveAction, MutablePath, NoneTransition, PlayAction, RandomDraws, RepeatAction, RepeatForeverAction, RotateAction, ScaleAction, Scene, SceneTransition, SequenceAction, Shape, ShapeType, SlideTransition, SoundManager, SoundPlayer, SoundRecorder, Sprite, Story, TextLine, Timer, Transition, TransitionDirection, TransitionType, Uuid, WaitAction, WebColors, WebGlInfo, handleInterfaceOptions };
export type { Activity, ActivityCallbacks, ActivityEvent, ActivityEventListener, ActivityKeyValueData, ActivityLifecycleEvent, ActivityResultsEvent, BrowserImage, BrowserImageDataReadyEvent, CallbackOptions, CompositeEvent, CompositeOptions, Constraints, CustomActionOptions, DefaultParameter, DomPointerDownEvent, DrawableOptions, EasingFunction, FadeAlphaActionOptions, FontAsset, FontData, GameData, GameEvent, GameOptions, GameParameters, GlobalVariables, I18nDataReadyEvent, IDataStore, IDrawable, IText, LabelOptions, Layout, LocaleSvg, M2ColorfulPath, M2DragEvent, M2Event, M2EventListener, M2Image, M2KeyboardEvent, M2NodeAddChildEvent, M2NodeConstructor, M2NodeEvent, M2NodeEventListener, M2NodeNewEvent, M2NodeOptions, M2NodePropertyChangeEvent, M2NodeRemoveChildEvent, M2Path, M2PointerEvent, M2Sound, MoveActionOptions, PlayActionOptions, Plugin, PluginEvent, Point, RectOptions, RgbaColor, ScaleActionOptions, SceneOptions, ScenePresentEvent, ScoringProvider, ScoringSchema, ShapeOptions, Size, SlideTransitionOptions, SoundAsset, SoundPlayerOptions, SoundRecorderOptions, SoundRecorderResults, SpriteOptions, StoryOptions, StringInterpolationMap, TapEvent, TextAndFont, TextLineOptions, TextLocalizationResult, TextOptions, TextWithFontCustomization, Translation, TranslationConfiguration, TranslationOptions, TrialData, TrialSchema, WaitActionOptions };
