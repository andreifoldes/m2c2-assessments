import * as _m2c2kit_core from '@m2c2kit/core';
import { CompositeOptions, Size, RgbaColor, M2Node, Composite, TextOptions, IText, StringInterpolationMap, M2NodeEvent, CallbackOptions, Point, ShapeOptions, CompositeEvent, LabelHorizontalAlignmentMode, Transition, StoryOptions, Story, Scene, SceneOptions } from '@m2c2kit/core';
import { Canvas } from 'canvaskit-wasm';

interface GridOptions extends CompositeOptions {
    /** Number of rows in the grid. Must be 1 or greater */
    rows: number;
    /** Number of columns in the grid. Must be 1 or greater */
    columns: number;
    /** Size of the grid in pixels */
    size: Size;
    /** Background color of the grid. Default is a transparent blue */
    backgroundColor?: RgbaColor;
    /** Width of the grid lines. Default is 1 */
    gridLineWidth?: number;
    /** Color of the grid lines. Default is red */
    gridLineColor?: RgbaColor;
}
interface GridChild {
    node: M2Node;
    row: number;
    column: number;
}
declare class Grid extends Composite implements GridOptions {
    compositeType: string;
    private _rows;
    private _columns;
    private _gridBackgroundColor;
    private _gridLineColor;
    private _gridLineWidth;
    cellWidth: number;
    cellHeight: number;
    private _gridChildren;
    private cellContainers;
    private _gridBackground?;
    /**
     * A rectangular grid that supports placement of nodes within the grid's
     * cells.
     *
     * @remarks This composite node is composed of rectangles and lines. It
     * has convenience functions for placing and clearing nodes on the grid
     * by row and column position (zero-based indexing)
     *
     * @param options - {@link GridOptions}
     */
    constructor(options: GridOptions);
    get completeNodeOptions(): {
        rows: number;
        columns: number;
        size: Size;
        backgroundColor: RgbaColor;
        gridLineWidth: number;
        gridLineColor: RgbaColor;
        anchorPoint?: _m2c2kit_core.Point;
        zPosition?: number;
        name?: string;
        position?: _m2c2kit_core.Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        isUserInteractionEnabled?: boolean;
        draggable?: boolean;
        hidden?: boolean;
        layout?: _m2c2kit_core.Layout;
        uuid?: string;
        suppressEvents?: boolean;
    };
    initialize(): void;
    private get gridBackground();
    private set gridBackground(value);
    /**
     * note: below we do not have getter and setter for size because the getter
     * and setter in M2Node will handle it.
     */
    get rows(): number;
    set rows(rows: number);
    get columns(): number;
    set columns(columns: number);
    get gridBackgroundColor(): RgbaColor;
    set gridBackgroundColor(backgroundColor: RgbaColor);
    get gridLineWidth(): number;
    set gridLineWidth(gridLineWidth: number);
    get gridLineColor(): RgbaColor;
    set gridLineColor(gridLineColor: RgbaColor);
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
    duplicate(newName?: string): Grid;
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
    /**
     * The child nodes that have been added to the grid.
     *
     * @remarks Do not set this property directly. Use the methods for adding
     * and removing grid children, such as `addAtCell()`, `removeAllAtCell()`,
     * `removeGridChild()`, and `removeAllGridChildren()`.
     */
    get gridChildren(): Array<GridChild>;
    set gridChildren(gridChildren: Array<GridChild>);
    /**
     * Removes all grid children from the grid.
     *
     * @remarks This retains grid lines and grid appearance.
     */
    removeAllGridChildren(): void;
    /**
     * Adds a node as a grid child to the grid at the specified row and column
     * position.
     *
     * @param node - node to add to the grid
     * @param row  - row position within grid to add node; zero-based indexing
     * @param column - column position within grid to add node; zero-based indexing
     */
    addAtCell(node: M2Node, row: number, column: number): void;
    /**
     * Removes all grid child nodes at the specified row and column position.
     *
     * @param row - row position within grid at which to remove grid children; zero-based indexing
     * @param column - column position within grid at which to remove grid children; zero-based indexing
     */
    removeAllAtCell(row: number, column: number): void;
    /**
     * Removes the grid child node from the grid.
     *
     * @param node - node to remove
     */
    removeGridChild(node: M2Node): void;
    addChild(child: M2Node): void;
    removeAllChildren(): void;
    removeChild(child: M2Node): void;
    removeChildren(children: M2Node[]): void;
}

interface ButtonOptions extends CompositeOptions, TextOptions {
    /** Size of button. Default is 200 wide by 50 high. */
    size?: Size;
    /** Corner radius of button; can be used to make rounded corners. Default is 9 */
    cornerRadius?: number;
    /** Background color of button. Default is WebColors.Black */
    backgroundColor?: RgbaColor;
    /** Color of button text. Default is WebColors.White */
    fontColor?: RgbaColor;
    /** Names of multiple fonts to use for text. For example, if a text font and an emoji font are to be used together. Must have been previously loaded */
    fontNames?: Array<string>;
    /** Size of button text. Default is 20. */
    fontSize?: number;
}
declare class Button extends Composite implements IText, ButtonOptions {
    compositeType: string;
    isText: boolean;
    private _backgroundColor;
    private _cornerRadius;
    private _fontSize;
    private _text;
    private _fontColor;
    private _fontName;
    private _fontNames;
    private _interpolation;
    private _localize;
    private backgroundPaint?;
    /**
     * A simple button of rectangle with text centered inside.
     *
     * @remarks This composite node is composed of a rectangle and text. To
     * respond to user taps, the isUserInteractionEnabled property must be set
     * to true and an appropriate callback must be set to handle the tap event.
     *
     * @param options - {@link ButtonOptions}
     */
    constructor(options: ButtonOptions);
    get completeNodeOptions(): {
        size: Size;
        cornerRadius: number;
        backgroundColor: RgbaColor;
        fontNames: string[] | undefined;
        text?: string;
        fontName?: string;
        fontColor?: RgbaColor;
        fontSize?: number;
        interpolation?: StringInterpolationMap;
        localize?: boolean;
        anchorPoint?: _m2c2kit_core.Point;
        zPosition?: number;
        name?: string;
        position?: _m2c2kit_core.Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        isUserInteractionEnabled?: boolean;
        draggable?: boolean;
        hidden?: boolean;
        layout?: _m2c2kit_core.Layout;
        uuid?: string;
        suppressEvents?: boolean;
    };
    initialize(): void;
    dispose(): void;
    get text(): string;
    set text(text: string);
    get backgroundColor(): RgbaColor;
    set backgroundColor(backgroundColor: RgbaColor);
    get fontColor(): RgbaColor;
    set fontColor(fontColor: RgbaColor);
    get fontName(): string | undefined;
    set fontName(fontName: string | undefined);
    get fontNames(): Array<string> | undefined;
    set fontNames(fontNames: Array<string> | undefined);
    get cornerRadius(): number;
    set cornerRadius(cornerRadius: number);
    get fontSize(): number;
    set fontSize(fontSize: number);
    get interpolation(): StringInterpolationMap;
    set interpolation(interpolation: StringInterpolationMap);
    get localize(): boolean;
    set localize(localize: boolean);
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
    duplicate(newName?: string): Button;
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
}

interface DialogOptions extends CompositeOptions {
    /** Size of dialog box */
    size?: Size;
    /** Corner radius of dialog box; can be used to make rounded corners */
    cornerRadius?: number;
    /** Background color of dialog box. Default is WebColors.White */
    backgroundColor?: RgbaColor;
    /** Color of button text. Default is WebColors.White */
    fontColor?: RgbaColor;
    overlayAlpha?: number;
    positiveButtonText?: string;
    negativeButtonText?: string;
    positiveButtonColor?: RgbaColor;
    negativeButtonColor?: RgbaColor;
    messageText?: string;
}
declare enum DialogResult {
    Dismiss = "Dismiss",
    Positive = "Positive",
    Negative = "Negative"
}
interface DialogEvent extends M2NodeEvent {
    dialogResult: DialogResult;
}
declare class Dialog extends Composite {
    compositeType: string;
    private _backgroundColor;
    cornerRadius: number;
    overlayAlpha: number;
    contentText: string;
    positiveButtonText: string;
    negativeButtonText: string;
    private _fontColor;
    private backgroundPaint?;
    constructor(options?: DialogOptions);
    show(): void;
    onDialogResult(callback: (dialogResultEvent: DialogEvent) => void, options?: CallbackOptions): void;
    initialize(): void;
    get backgroundColor(): RgbaColor;
    set backgroundColor(backgroundColor: RgbaColor);
    get fontColor(): RgbaColor;
    set fontColor(fontColor: RgbaColor);
    get hidden(): boolean;
    set hidden(hidden: boolean);
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
    duplicate(newName?: string): Dialog;
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
}

interface DrawPadOptions extends CompositeOptions {
    /** Size of the DrawPad */
    size: Size;
    /** Color of drawn lines. Default is red. */
    lineColor?: RgbaColor;
    /** Width of drawn lines. Default is 1 */
    lineWidth?: number;
    /** Background color of the DrawPad. Default is transparent. */
    backgroundColor?: RgbaColor;
    /** Width of the border. Default is 1 */
    borderWidth?: number;
    /** Color of the border. Default is black */
    borderColor?: RgbaColor;
    /** Does the DrawPad respond to user interaction? Default is true. */
    isUserInteractionEnabled?: boolean;
    /** Should drawing resume when the pointer, in a down state, returns to the DrawPad area after exiting it while drawing? Default is false. */
    resumeDrawingOnReturn?: boolean;
    /** Should the user be permitted to draw only one continuous line? If so, no more drawing is allowed after the first stroke ends. */
    continuousDrawingOnly?: boolean;
    /** If `continuousDrawingOnly`, this is the maximum pixel distance from the last stroke's end point that the user is allowed to continue drawing with a new stroke. */
    continuousDrawingOnlyExceptionDistance?: number;
}
declare const DrawPadEventType: {
    readonly StrokeStart: "StrokeStart";
    readonly StrokeMove: "StrokeMove";
    readonly StrokeEnd: "StrokeEnd";
};
type DrawPadEventType = (typeof DrawPadEventType)[keyof typeof DrawPadEventType];
interface DrawPadEvent extends M2NodeEvent {
    type: DrawPadEventType;
    position: Point;
}
declare const DrawPadItemEventType: {
    readonly StrokeEnter: "StrokeEnter";
    readonly StrokeLeave: "StrokeLeave";
};
type DrawPadItemEventType = (typeof DrawPadItemEventType)[keyof typeof DrawPadItemEventType];
interface DrawPadItemEvent extends M2NodeEvent {
    type: DrawPadItemEventType;
}
interface StrokeInteraction {
    /** Type of user interaction with the stroke: StrokeStart, StrokeMove, or StrokeEnd. */
    type: DrawPadEventType;
    /** Position on the DrawPad where the interaction occurred. In the DrawPad coordinate system, (0, 0) is the upper-left corner. */
    position: Point;
    /** Device ISO8601 Timestamp of the interaction. */
    iso8601Timestamp: string;
    /** Was the interaction's position interpolated? (clipped to DrawPad boundary) because the user drew out of bounds? @remarks Only StrokeMove and StrokeEnd can be interpolated. A StrokeStart position can never begin out of bounds. */
    interpolated: boolean;
}
type DrawPadStroke = Array<StrokeInteraction>;
interface DrawPadItem {
    /**
     * Executes a callback when a DrawPad stroke begins on or enters the DrawPadItem.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onStrokeEnter(callback: (ev: DrawPadItemEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when a DrawPad stroke leaves the DrawPadItem.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onStrokeLeave(callback: (ev: DrawPadItemEvent) => void, options?: CallbackOptions): void;
    /** Is a DrawPad stroke currently within the bounds of the DrawPad item? */
    isStrokeWithinBounds: boolean;
    /** Position of the DrawPadItem within the DrawPad coordinate system, in which (0, 0) is the upper-left corner. */
    drawPadPosition: Point;
}
declare class DrawPad extends Composite {
    compositeType: string;
    resumeDrawingOnReturn: boolean;
    continuousDrawingOnly: boolean;
    continuousDrawingOnlyExceptionDistance: number | undefined;
    private _backgroundColor;
    private _borderColor;
    private _borderWidth;
    private _lineColor;
    private _lineWidth;
    /** The rectangular "pad" on which to draw */
    private drawArea?;
    /** The lines that are drawn */
    private drawShape?;
    private isDrawingPointerDown;
    private pointerIsDownAndPointerLeftDrawAreaWhenDown;
    private currentStrokesNotAllowed;
    private originalOptions;
    /** Array of strokes created on the DrawPad, with position and timestamps
     * of all interactions with each DrawPadStroke.
     */
    strokes: DrawPadStroke[];
    /**
     * A rectangular area on which the user can draw strokes (lines).
     *
     * @remarks This composite node is composed of a rectangle Shape and
     * another Shape that is formed from a path of points.
     *
     * @param options - {@link DrawPadOptions}
     */
    constructor(options: DrawPadOptions);
    get completeNodeOptions(): {
        /** Size of the DrawPad */
        size: Size;
        /** Color of drawn lines. Default is red. */
        lineColor?: RgbaColor;
        /** Width of drawn lines. Default is 1 */
        lineWidth?: number;
        /** Background color of the DrawPad. Default is transparent. */
        backgroundColor?: RgbaColor;
        /** Width of the border. Default is 1 */
        borderWidth?: number;
        /** Color of the border. Default is black */
        borderColor?: RgbaColor;
        isUserInteractionEnabled?: boolean;
        /** Should drawing resume when the pointer, in a down state, returns to the DrawPad area after exiting it while drawing? Default is false. */
        resumeDrawingOnReturn?: boolean;
        /** Should the user be permitted to draw only one continuous line? If so, no more drawing is allowed after the first stroke ends. */
        continuousDrawingOnly?: boolean;
        /** If `continuousDrawingOnly`, this is the maximum pixel distance from the last stroke's end point that the user is allowed to continue drawing with a new stroke. */
        continuousDrawingOnlyExceptionDistance?: number;
        name?: string;
        position?: Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        draggable?: boolean;
        hidden?: boolean;
        layout?: _m2c2kit_core.Layout;
        uuid?: string;
        suppressEvents?: boolean;
        anchorPoint?: Point;
        zPosition?: number;
    };
    initialize(): void;
    private initializeDrawShape;
    private initializeDrawArea;
    private dist;
    private handleTapDown;
    private addInterpolatedStrokeMove;
    private handleTapLeave;
    private handleTapUpAny;
    private handlePointerMove;
    update(): void;
    draw(canvas: Canvas): void;
    private raiseDrawPadEvent;
    private raiseDrawPadItemEvent;
    /**
     * Removes all strokes from the DrawPad.
     */
    clear(): void;
    warmup(canvas: Canvas): void;
    /**
     * Executes a callback when the user starts a stroke on the DrawPad.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onStrokeStart(callback: (ev: DrawPadEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user moves a stroke on the DrawPad.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onStrokeMove(callback: (ev: DrawPadEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user ends a stroke on the DrawPad.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onStrokeEnd(callback: (ev: DrawPadEvent) => void, options?: CallbackOptions): void;
    /**
     * Adds a node to the DrawPad.
     *
     * @remarks After the node is added to the DrawPad, its
     * position is adjusted to be relative to the DrawPad's coordinate
     * system, and it is made interactive. The method returns an object
     * which is the node as a DrawPadItem, which has additional methods,
     * properties, and events specific to it now being on a DrawPad. The node
     * now **must** be manipulated only using the DrawPadItem object. Using
     * the original node object will result in undefined behavior.
     *
     * @param node - the node to add to the DrawPad
     * @returns the node as a DrawPadItem
     */
    addItem<T extends M2Node>(node: T): T & DrawPadItem;
    /**
     * Takes a screenshot of the DrawPad.
     *
     * @returns a base64-encoded string of the DrawPad's current state in
     * PNG format.
     */
    takeScreenshot(): string;
    /**
     * Determines whether a point is within the DrawPad.
     *
     * @param point - The point to check
     * @returns True - if the point is within the DrawPad, false otherwise
     */
    private isPointWithinDrawPad;
    /**
     * Interpolates a point to the border of the DrawPad based on a line that
     * crosses the DrawPad border. The line is formed by the current "out of
     * bounds" point the and previous "within bounds" point.
     *
     * @param currentPoint - The current point
     * @param previousPoint - The previous point
     * @param drawPadSize - The size of the DrawPad
     * @returns A new point on the border of the DrawPad
     */
    private interpolateToDrawPadBorder;
    private arrayBufferToBase64String;
    get backgroundColor(): RgbaColor;
    set backgroundColor(backgroundColor: RgbaColor);
    get borderColor(): RgbaColor;
    set borderColor(borderColor: RgbaColor);
    get borderWidth(): number;
    set borderWidth(borderWidth: number);
    get lineColor(): RgbaColor;
    set lineColor(lineColor: RgbaColor);
    get lineWidth(): number;
    set lineWidth(lineWidth: number);
    duplicate(newName?: string): DrawPad;
}

/**
 * Additional, optional properties for a key in the `VirtualKeyboard`.
 *
 * @remarks This is used to define special keys (e.g., Shift, Backspace),
 * keys with icons, and keys of custom size.
 */
interface KeyConfiguration {
    /** Width of the key in units of a regular key width. Default is 1. */
    widthRatio?: number;
    /** Width of the key in units of a regular key height. Default is 1. */
    heightRatio?: number;
    /** Identifier for the key. */
    code: string;
    /** Label to be shown on the key. */
    labelText?: string;
    /** Label to be shown on the key when shift is activated. */
    labelTextShifted?: string;
    /** True is the key should be hidden. */
    blank?: boolean;
    /** True is the key is a shift key. */
    isShift?: boolean;
    /** ShapeOptions of the optional icon to show on the key. */
    keyIconShapeOptions?: ShapeOptions;
}
/**
 * A row in the `VirtualKeyboard`.
 *
 * @remarks Each row is an array of objects that defines a key, where each
 * object can be one of the following:
 * -  a string, e.g., `a`. The string is the key in the keyboard's unshifted
 * state (`a`), and the string's value after applying `toUpperCase()` is the key
 * in the keyboard's shifted state (`A`).
 * - an array of two strings, e.g., `["1", "!"]`. The first string is the key
 * in the keyboard's unshifted state (`1`), and the second string is the key
 * in the keyboard's shifted state (`!`).
 * - A `KeyConfiguration` object, which can be used to further customize the
 * key's appearance and behavior.
 */
type VirtualKeyboardRow = Array<string | Array<string> | KeyConfiguration>;
interface VirtualKeyboardOptions extends CompositeOptions {
    size: Size;
    /** Percent of the keyboard width that should be used for padding on the left and right sides. Default is .02 */
    keyboardHorizontalPaddingPercent?: number;
    /** Percent of the keyboard height that should be used for padding on the top and bottom sides. Default is .025 */
    keyboardVerticalPaddingPercent?: number;
    /** Percent of each key's width that should be used for padding on the left and right sides. Default is .10 */
    keyHorizontalPaddingPercent?: number;
    /** Percent of each key's height that should be used for padding on the top and bottom sides. Default is .10 */
    keyVerticalPaddingPercent?: number;
    /** Configuration of keyboard rows. Order is from top to bottom rows. */
    rows?: Array<VirtualKeyboardRow>;
    /** How many regular-sized keys should fit in a row? This is used for scaling purposes. If not provided, it will be inferred from the row configuration. */
    keysPerRow?: number;
    /** Size of font for keys. */
    fontSize?: number;
    /** The fonts for the key labels, if not the default font. */
    fontNames?: Array<string> | undefined;
    /** Comma-separated list of keys to hide. */
    hiddenKeys?: string;
    /** If true, only capital letters will be shown. */
    capitalLettersOnly?: boolean;
    /** Color of keys. */
    keyColor?: RgbaColor;
    /** Color of keys when pressed. */
    keyDownColor?: RgbaColor;
    /** Color of special keys when pressed. */
    specialKeyDownColor?: RgbaColor;
    /** Background color of keyboard. */
    backgroundColor?: RgbaColor;
    /** If true, a preview of the key that will be pressed will be shown. */
    showKeyDownPreview?: boolean;
}
interface VirtualKeyboardEvent extends CompositeEvent {
    type: "Composite";
    compositeType: "VirtualKeyboard";
    compositeEventType: "VirtualKeyboardKeyUp" | "VirtualKeyboardKeyDown" | "VirtualKeyboardKeyLeave";
    target: VirtualKeyboard | string;
    /** String that is generated when key is pressed, with any modifiers (e.g., Shift) applied. */
    key: string;
    /** Code for the key, not taking into account any modifiers. */
    code: string;
    /** True if the Shift key is pressed. */
    shiftKey: boolean;
    /** Metadata related to the key tap. */
    keyTapMetadata: KeyTapMetadata;
}
interface KeyTapMetadata {
    /** Size of the key. */
    size: Size;
    /** Point on the key where the tap event occurred. */
    point: Point;
    /** Buttons pressed when the key was tapped. */
    buttons: number;
}
declare class VirtualKeyboard extends Composite {
    readonly compositeType = "VirtualKeyboard";
    private keyboardHorizontalPaddingPercent;
    private keyboardVerticalPaddingPercent;
    private keyHorizontalPaddingPercent;
    private keyVerticalPaddingPercent;
    private keyboardRows;
    private keysPerRow;
    private fontSize;
    private fontNames;
    private hiddenKeys;
    private capitalLettersOnly;
    private keyColor;
    private keyDownColor;
    private specialKeyDownColor;
    private backgroundColor;
    private showKeyDownPreview;
    private originalOptions;
    private shiftActivated;
    private keyShapes;
    private keyLabels;
    private letterCircle?;
    private letterCircleLabel?;
    /**
     * An on-screen keyboard that can be used to enter text.
     *
     * @param options - {@link VirtualKeyboardOptions}
     */
    constructor(options: VirtualKeyboardOptions);
    get completeNodeOptions(): {
        size: Size;
        /** Percent of the keyboard width that should be used for padding on the left and right sides. Default is .02 */
        keyboardHorizontalPaddingPercent?: number;
        /** Percent of the keyboard height that should be used for padding on the top and bottom sides. Default is .025 */
        keyboardVerticalPaddingPercent?: number;
        /** Percent of each key's width that should be used for padding on the left and right sides. Default is .10 */
        keyHorizontalPaddingPercent?: number;
        /** Percent of each key's height that should be used for padding on the top and bottom sides. Default is .10 */
        keyVerticalPaddingPercent?: number;
        /** Configuration of keyboard rows. Order is from top to bottom rows. */
        rows?: Array<VirtualKeyboardRow>;
        /** How many regular-sized keys should fit in a row? This is used for scaling purposes. If not provided, it will be inferred from the row configuration. */
        keysPerRow?: number;
        /** Size of font for keys. */
        fontSize?: number;
        /** The fonts for the key labels, if not the default font. */
        fontNames?: Array<string> | undefined;
        /** Comma-separated list of keys to hide. */
        hiddenKeys?: string;
        /** If true, only capital letters will be shown. */
        capitalLettersOnly?: boolean;
        /** Color of keys. */
        keyColor?: RgbaColor;
        /** Color of keys when pressed. */
        keyDownColor?: RgbaColor;
        /** Color of special keys when pressed. */
        specialKeyDownColor?: RgbaColor;
        /** Background color of keyboard. */
        backgroundColor?: RgbaColor;
        /** If true, a preview of the key that will be pressed will be shown. */
        showKeyDownPreview?: boolean;
        name?: string;
        position?: Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        isUserInteractionEnabled?: boolean;
        draggable?: boolean;
        hidden?: boolean;
        layout?: _m2c2kit_core.Layout;
        uuid?: string;
        suppressEvents?: boolean;
        anchorPoint?: Point;
        zPosition?: number;
    };
    initialize(): void;
    /**
     * Executes a callback when the user presses down on a key.
     *
     * @param callback - function to execute
     * @param options
     */
    onKeyDown(callback: (virtualKeyboardEvent: VirtualKeyboardEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user releases a key.
     *
     * @param callback - function to execute
     * @param options
     */
    onKeyUp(callback: (virtualKeyboardEvent: VirtualKeyboardEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the user has pressed a key with the pointer, but
     * moves the pointer outside the key bounds before releasing the pointer.
     *
     * @remarks Typically, this event will not be used, since it is a user's
     * inaccurate interaction with the keyboard. However, it can be used to
     * provide feedback to the user that they have moved the pointer outside the
     * key bounds, and thus the key stroke will not be registered.
     *
     * @param callback - function to execute
     * @param options
     */
    onKeyLeave(callback: (virtualKeyboardEvent: VirtualKeyboardEvent) => void, options?: CallbackOptions): void;
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
    duplicate(newName?: string | undefined): M2Node;
    private handleKeyShapeTapDown;
    private handleKeyShapeTapUp;
    private handleKeyShapeTapLeave;
    private getKeyAsString;
    /**
     * Converts the keyboard rows to the internal keyboard configuration.
     *
     * @remarks This normalizes the keyboard rows so that each key is a
     * full `KeyConfigurationWithShape` object, instead of a string or array of
     * strings.
     *
     * @param keyboardRows
     * @returns the keyboard for internal use
     */
    private internalKeyboardRowsToInternalKeyboardConfiguration;
    handleCompositeEvent(event: VirtualKeyboardEvent): void;
    private handleKeyDownEvent;
    private handleKeyUpEvent;
    private handleKeyLeaveEvent;
    private showKeyboardShifted;
    private showKeyboardNotShifted;
    private createDefaultKeyboardRows;
    private addVirtualKeyboardEventListener;
    /**
     * Does the `VirtualKeyboard` respond to user events? Default is true.
     */
    get isUserInteractionEnabled(): boolean;
    /**
     * Does the `VirtualKeyboard` respond to user events? Default is true.
     */
    set isUserInteractionEnabled(isUserInteractionEnabled: boolean);
}

interface InstructionScene {
    /** Primary instruction text */
    text?: string;
    /** Interpolation for text */
    textInterpolation?: StringInterpolationMap;
    /** Margin from left screen edge to primary instruction text. Default is 48 */
    textMarginStart?: number;
    /** Margin from right to primary instruction text. Default is 48 */
    textMarginEnd?: number;
    /** Horizontal alignment of primary instruction text. see {@link LabelHorizontalAlignmentMode}. Default is LabelHorizontalAlignmentMode.left. */
    textAlignmentMode?: LabelHorizontalAlignmentMode;
    /** Default is to center primary instructions vertically within the scene (textVerticalBias = .5).  Setting textVerticalBias less than .5 will pull the text towards the top. Setting textVerticalBias greater than .5 will pull the text towards the bottom */
    textVerticalBias?: number;
    /** Font size of primary instruction text. Default is 16 */
    textFontSize?: number;
    /** A text heading to appear at the top of the scene */
    title?: string;
    /** Interpolation for title */
    titleInterpolation?: StringInterpolationMap;
    /** Margin from top of screen edge to title text. Default is 48 */
    titleMarginTop?: number;
    /** Font size of title text. Default is 16 */
    titleFontSize?: number;
    /** Name of optional image to show */
    imageName?: string;
    /** Default is to center image vertically within the scene (imageVerticalBias = .5).  Setting imageVerticalBias less than .5 will pull the image towards the top. Setting imageVerticalBias greater than .5 will pull the image towards the bottom */
    imageVerticalBias?: number;
    /** If the image appears below the primary instruction text (imageAboveText = false), this is the margin from the bottom of the primary instruction text to the top of the image */
    imageMarginTop?: number;
    /** If the image appears above the primary instruction text (imageAboveText = true), this is the margin from the bottom of the image to the top of the primary instruction text */
    imageMarginBottom?: number;
    /** If an image is provided, should it appear above the primary text? Default is true */
    imageAboveText?: boolean;
    /** Background color for instruction scene. Will override what is set in InstructionsOptions */
    backgroundColor?: RgbaColor;
    /** Button text for the back button. Will override what is set in InstructionsOptions */
    backButtonText?: string;
    /** Interpolation for back button text */
    backButtonTextInterpolation?: StringInterpolationMap;
    /** Button text for the next button. Will override what is set in InstructionsOptions */
    nextButtonText?: string;
    /** Interpolation map for next button text */
    nextButtonTextInterpolation?: StringInterpolationMap;
    /** Width of back button. Will override what is set in InstructionsOptions */
    backButtonWidth?: number;
    /** Width of next button. Will override what is set in InstructionsOptions */
    nextButtonWidth?: number;
    /** Height of back button. Will override what is set in InstructionsOptions */
    backButtonHeight?: number;
    /** Height of next button. Will override what is set in InstructionsOptions */
    nextButtonHeight?: number;
    /** Color of back button. Will override what is set in InstructionsOptions */
    backButtonBackgroundColor?: RgbaColor;
    /** Color of back button text. Will override what is set in InstructionsOptions */
    backButtonFontColor?: RgbaColor;
    /** Color of next button. Will override what is set in InstructionsOptions */
    nextButtonBackgroundColor?: RgbaColor;
    /** Color of next button text. Will override what is set in InstructionsOptions */
    nextButtonFontColor?: RgbaColor;
    /** Scene transition when advancing to the next instruction scene. Will override what is set in InstructionsOptions */
    nextSceneTransition?: Transition;
    /** Scene transition when returning to the previous instruction scene. Will override what is set in InstructionsOptions */
    backSceneTransition?: Transition;
}
interface InstructionsOptions extends StoryOptions {
    /** Name to prefix to each instruction scene name. Default is "instructions." For example, if screenNamePrefix is "instructions", instruction scenes will be named "instructions-01", "instructions-02", etc. */
    sceneNamePrefix?: string;
    /** Name of scene that follows the last instruction scene. Clicking the "next" button on the last instruction screen will advance to this screen */
    postInstructionsScene?: string;
    /** Array of instruction scenes that form the instructions */
    instructionScenes: Array<InstructionScene>;
    /** Background color for instruction scenes. Can be overridden within a single instruction scene */
    backgroundColor?: RgbaColor;
    /** Scene transition when advancing to the next instruction scene. Default is push transition, to the left, 500 milliseconds duration. Can be overridden within a single instruction scene */
    nextSceneTransition?: Transition;
    /** Scene transition when returning to the previous instruction scene. Default is push transition, to the right, 500 milliseconds duration. Can be overridden within a single instruction scene */
    backSceneTransition?: Transition;
    /** Button text for the back button. Default is "Back". Can be overridden within a single instruction scene */
    backButtonText?: string;
    /** Interpolation map for back button text */
    backButtonTextInterpolation?: StringInterpolationMap;
    /** Button text for the next button. Default is "Next". Can be overridden within a single instruction scene */
    nextButtonText?: string;
    /** Interpolation map for next button text */
    nextButtonTextInterpolation?: StringInterpolationMap;
    /** Width of back button. Default is 125. Can be overridden within a single instruction scene */
    backButtonWidth?: number;
    /** Width of next button. Default is 125. Can be overridden within a single instruction scene */
    nextButtonWidth?: number;
    /** Height of back button. Default is 50. Can be overridden within a single instruction scene */
    backButtonHeight?: number;
    /** Height of next button. Default is 50. Can be overridden within a single instruction scene */
    nextButtonHeight?: number;
    /** Color of back button. Default is WebColors.Black. Can be overridden within a single instruction scene */
    backButtonBackgroundColor?: RgbaColor;
    /** Color of back button text. Default is WebColors.White. Can be overridden within a single instruction scene */
    backButtonFontColor?: RgbaColor;
    /** Color of next button. Default is WebColors.Black. Can be overridden within a single instruction scene */
    nextButtonBackgroundColor?: RgbaColor;
    /** Color of next button text. Default is WebColors.White. Can be overridden within a single instruction scene */
    nextButtonFontColor?: RgbaColor;
}
declare class Instructions extends Story {
    /**
     * Creates an array of scenes containing instructions on how to complete the assessment
     *
     * @param options - {@link InstructionsOptions}
     * @returns instruction scenes
     */
    static create(options: InstructionsOptions): Array<Scene>;
    /**
     * Creates an array of scenes containing instructions on how to complete the assessment
     *
     * @deprecated Use {@link Instructions.create} instead (lower case method name "create")
     *
     * @param options - {@link InstructionsOptions}
     * @returns instruction scenes
     */
    static Create(options: InstructionsOptions): Array<Scene>;
}

interface CountdownTimerOptions extends CompositeOptions {
    /** Duration of the countdown, in milliseconds. Must be multiple of 1000. Default is 3000. */
    milliseconds?: number;
    /** Duration of each tick interval, in milliseconds. Default is 1000. */
    tickIntervalMilliseconds?: number;
    /** Font name for timer text (numbers). */
    fontName?: string;
    /** Font size for timer text (numbers). Default is 50. */
    fontSize?: number;
    /** Font size for timer text (numbers). Default is white. */
    fontColor?: RgbaColor;
    /** String to show when the timer reaches zero. Default is "0". This could be changed to another value, such as "GO!" */
    zeroString?: string;
    /** Shape of the timer. Default is a Royal Blue circle with a radius of 100. */
    timerShape?: TimerShape;
    /** Default is to center the timer text (numbers) vertically within the timer shape (verticalBias = .5). Setting verticalBias less than .5 will pull the text towards the top of the timer shape. Setting verticalBias greater than .5 will pull the text towards the bottom of the timer shape. */
    textVerticalBias?: number;
}
interface TimerShape {
    circle?: {
        /** Radius of the circle timer shape. */
        radius: number;
    };
    rectangle?: {
        /** Width of the rectangle timer shape. */
        width: number;
        /** Height of the rectangle timer shape. */
        height: number;
        /** Corner radius of the rectangle timer shape. Default is 0. */
        cornerRadius?: number;
    };
    /** Color of the timer shape. Default is Royal Blue. */
    fillColor?: RgbaColor;
}
interface CountdownTimerEvent extends CompositeEvent {
    type: "Composite";
    compositeType: "CountdownTimer";
    compositeEventType: "CountdownTimerTick" | "CountdownTimerComplete";
    millisecondsRemaining: number;
    target: CountdownTimer | string;
}
declare class CountdownTimer extends Composite implements CountdownTimerOptions {
    readonly compositeType = "CountdownTimer";
    private originalOptions;
    private _milliseconds;
    private _tickIntervalMilliseconds;
    private _fontName;
    private _fontSize;
    private _fontColor;
    private _zeroString;
    private _timerShape;
    private _textVerticalBias;
    private countdownSequence;
    private timerShapeNode?;
    private timerNumberLabel?;
    private _isRunning;
    private hasStopped;
    /**
     * A countdown timer displays a number that counts down to zero.
     *
     * @param options
     */
    constructor(options: CountdownTimerOptions);
    get completeNodeOptions(): {
        /** Duration of the countdown, in milliseconds. Must be multiple of 1000. Default is 3000. */
        milliseconds?: number;
        /** Duration of each tick interval, in milliseconds. Default is 1000. */
        tickIntervalMilliseconds?: number;
        /** Font name for timer text (numbers). */
        fontName?: string;
        /** Font size for timer text (numbers). Default is 50. */
        fontSize?: number;
        /** Font size for timer text (numbers). Default is white. */
        fontColor?: RgbaColor;
        /** String to show when the timer reaches zero. Default is "0". This could be changed to another value, such as "GO!" */
        zeroString?: string;
        /** Shape of the timer. Default is a Royal Blue circle with a radius of 100. */
        timerShape?: TimerShape;
        /** Default is to center the timer text (numbers) vertically within the timer shape (verticalBias = .5). Setting verticalBias less than .5 will pull the text towards the top of the timer shape. Setting verticalBias greater than .5 will pull the text towards the bottom of the timer shape. */
        textVerticalBias?: number;
        name?: string;
        position?: _m2c2kit_core.Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        isUserInteractionEnabled?: boolean;
        draggable?: boolean;
        hidden?: boolean;
        layout?: _m2c2kit_core.Layout;
        uuid?: string;
        suppressEvents?: boolean;
        anchorPoint?: _m2c2kit_core.Point;
        zPosition?: number;
    };
    initialize(): void;
    private tick;
    /**
     * Starts the countdown timer.
     *
     * @remarks Calling `start()` on a timer whose state is running (already started)
     * or stopped will raise an error.
     */
    start(): void;
    /**
     * Stops the countdown timer.
     *
     * @remarks This method is idempotent. Calling `stop()` on a stopped timer
     * has no effect and will not raise an error. This can be called on a
     * CountdownTimer in any state.
     */
    stop(): void;
    /**
     * Resets the countdown timer to its initial state so it can be started
     * again.
     *
     * @remarks This method is idempotent. Calling reset() multiple times will
     * not raise an error. This can be called on a CountdownTimer in any state.
     */
    reset(): void;
    /**
     * Returns true if the countdown timer is running.
     */
    get isRunning(): boolean;
    handleCompositeEvent(event: CountdownTimerEvent): void;
    /**
     * Executes a callback when the timer ticks.
     *
     * @remarks The callback is also executed when the timer completes.
     *
     * @param callback - function to execute
     * @param options
     */
    onTick(callback: (countdownTimerEvent: CountdownTimerEvent) => void, options?: CallbackOptions): void;
    /**
     * Executes a callback when the timer completes.
     *
     * @remarks This is the last tick of the timer.
     *
     * @param callback - function to execute.
     * @param options
     */
    onComplete(callback: (countdownTimerEvent: CountdownTimerEvent) => void, options?: CallbackOptions): void;
    private addCountdownTimerEventListener;
    get milliseconds(): number;
    set milliseconds(milliseconds: number);
    get tickIntervalMilliseconds(): number;
    set tickIntervalMilliseconds(tickIntervalMilliseconds: number);
    get fontColor(): RgbaColor;
    set fontColor(fontColor: RgbaColor);
    get fontName(): string | undefined;
    set fontName(fontName: string | undefined);
    get fontSize(): number;
    set fontSize(fontSize: number);
    get zeroString(): string;
    set zeroString(zeroString: string);
    get timerShape(): TimerShape;
    set timerShape(shape: TimerShape);
    get textVerticalBias(): number;
    set textVerticalBias(textVerticalBias: number);
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
    duplicate(newName?: string | undefined): CountdownTimer;
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
}

interface CountdownSceneOptions extends SceneOptions {
    /** Duration of the countdown, in milliseconds. */
    milliseconds: number;
    /** Duration of the slide transition, in milliseconds, to the next scene after the countdown completes. Default is 500. */
    transitionDurationMilliseconds?: number;
    /** A custom transition to use to present next scene after the countdown completes. */
    transition?: Transition;
    /** Duration in milliseconds to stay on zero before transitioning to the next scene. Default is zero. This option should be used if `transition` is set to `Transition.none()`. Otherwise, the zero will flash for a single frame before presenting the next scene. */
    zeroDwellMilliseconds?: number;
    /** Text shown below the countdown shape. Default is "GET READY". */
    text?: string;
    /** Font name for text  */
    textFontName?: string;
    /** Font size for text. Default is 50. */
    textFontSize?: number;
    /** Font color for text. Default is black. */
    textFontColor?: RgbaColor;
    /** Distance between bottom of countdown shape and text. Default is 32. */
    textMarginTop?: number;
    /** Font name for timer numbers. */
    timerNumbersFontName?: string;
    /** Font size for timer numbers. Default is 50. */
    timerNumbersFontSize?: number;
    /** Font size for timer numbers. Default is white. */
    timerNumbersFontColor?: RgbaColor;
    /** String to show when the timer reaches zero. Default is "0". This could be changed to another value, such as "GO!" */
    zeroString?: string;
    /** Shape of the timer. Default is a Royal Blue circle with a radius of 100 centered vertically. */
    timerShape?: TimerShape;
    /** Default is to center the timer shape vertically within the scene (verticalBias = .5). Setting verticalBias less than .5 will pull the shape towards the top. Setting verticalBias greater than .5 will pull the shape towards the bottom. */
    shapeVerticalBias?: number;
}
declare class CountdownScene extends Scene {
    /**
     * A scene that counts down from a specified number to zero, then transitions to the next scene.
     *
     * @param options - {@link CountdownSceneOptions}
     */
    constructor(options: CountdownSceneOptions);
}

interface LocalePickerOptions extends CompositeOptions {
    /** Background color of dialog box. Default is WebColors.White */
    backgroundColor?: RgbaColor;
    /** Locales to choose from in the dialog box. Default is the locales in the game's `Translation`. */
    localeOptions?: Array<LocaleOption>;
    /** What to show as the currently selected locale in the picker. Default is the game's current locale. */
    currentLocale?: string;
    /** Alpha level for the overlay that dims the scene underneath the dialog box. Default is .5 */
    overlayAlpha?: number;
    /** Size of dialog box. Default is automatically sized to fit the number of locale options. */
    size?: Size;
    /** Corner radius of dialog box; can be used to make rounded corners */
    cornerRadius?: number;
    /** Font size of locale options in dialog box. Default is 24. */
    fontSize?: number;
    /** Font color of locale options in dialog box. Default is WebColors.Black */
    fontColor?: RgbaColor;
    /** Image to use for LocalePicker. Default is a globe SVG, 32x32. */
    icon?: LocalePickerIcon;
    /** Position of the LocalePicker icon. Default is &#123; x: 32, y: 32 &#125; */
    iconPosition: Point;
    /** Should the selection in the LocalePicker automatically switch the game's locale? Default is true. */
    automaticallyChangeLocale?: boolean;
}
interface LocalePickerIcon {
    /** The HTML SVG tag, in string form, that will be rendered to display the locale.
     * Must begin with &#60;svg> and end with &#60;/svg> */
    svgString?: string;
    /** Name of image to use for LocalePicker. Must have been previously loaded */
    imageName?: string;
    /** Height to scale image to */
    height: number;
    /** Width to scale image to */
    width: number;
}
interface LocaleOption {
    /** Human-readable text description of the locale. */
    text: string;
    /** SVG of the locale. */
    svg?: LocaleSvg;
    /** Locale in language-country format, xx-YY. */
    locale: string;
}
interface LocalePickerResult {
    /** Locale that was selected. Is undefined if dialog was dismissed. */
    locale?: string;
}
interface LocalePickerEvent extends CompositeEvent {
    type: "Composite";
    compositeType: "LocalePicker";
    compositeEventType: "LocalePickerResult";
    result: LocalePickerResult;
}
interface LocaleSvg {
    /** The HTML SVG tag, in string form, that will be rendered to display the locale.
     * Must begin with &#60;svg> and end with &#60;/svg> */
    svgString: string;
    /** Height to scale image to */
    height: number;
    /** Width to scale image to */
    width: number;
}
declare class LocalePicker extends Composite {
    readonly compositeType = "LocalePicker";
    private readonly DEFAULT_FONT_SIZE;
    automaticallyChangeLocale: boolean;
    private _localeOptions;
    private _backgroundColor;
    private _fontSize;
    private _fontColor;
    private _currentLocale?;
    private _cornerRadius;
    private _overlayAlpha;
    private _icon;
    private _iconPosition;
    private iconSprite?;
    /**
     * Wrap displayed locale in double angle quotes if it is the current locale.
     * Note: Although the code editor will allow us to enter almost any
     * unicode character, it will not render correctly if the font does
     * not support the character. Thus, be careful to use characters that
     * are supported by the font. For example, check a page like
     * https://www.fontspace.com/roboto-font-f13281 to see which characters
     * are supported by Roboto Regular, which is often the default font in
     * m2c2kit. Emoji or checkmarks like ✓ are not in Roboto Regular!
     */
    private readonly LEFT_SELECTION_INDICATOR;
    private readonly RIGHT_SELECTION_INDICATOR;
    /**
     * An icon and dialog box for selecting a locale from a list of options.
     *
     * @remarks This composite node is composed of a dialog box that appears
     * when the user taps a globe icon. Typically, the `LocalePicker` will be
     * added as a free node to the game so that it exists independently of
     * the game's scenes. The dialog box contains a list of locales that the
     * user can choose from. By default, this list is populated with the locales
     * in the game's `Translation` object. When the user selects a locale, the
     * dialog box disappears and the locale is set as the game's current locale.
     *  The dialog box is automatically sized to fit the number of locale
     * options.
     *
     * @example
     * let localePicker: LocalePicker;
     * if (game.getParameter<boolean>("show_locale_picker")) {
     *   localePicker = new LocalePicker();
     *   game.addFreeNode(localePicker);
     * }
     *
     * @param options - {@link LocalePickerOptions}
     */
    constructor(options?: LocalePickerOptions);
    /**
     * Executes a callback when the user selects a locale.
     *
     * @param callback - function to execute
     * @param options - {@link CallbackOptions}
     */
    onResult(callback: (localePickerEvent: LocalePickerEvent) => void, options?: CallbackOptions): void;
    initialize(): void;
    private handleLocaleSelection;
    private setDialogVisibility;
    get backgroundColor(): RgbaColor;
    set backgroundColor(backgroundColor: RgbaColor);
    get fontSize(): number;
    set fontSize(fontSize: number);
    get fontColor(): RgbaColor;
    set fontColor(fontColor: RgbaColor);
    get cornerRadius(): number;
    set cornerRadius(cornerRadius: number);
    get overlayAlpha(): number;
    set overlayAlpha(alpha: number);
    get icon(): LocalePickerIcon;
    set icon(icon: LocalePickerIcon);
    get iconPosition(): Point;
    set iconPosition(position: Point);
    get localeOptions(): Array<LocaleOption>;
    set localeOptions(options: Array<LocaleOption>);
    get currentLocale(): string | undefined;
    set currentLocale(locale: string | undefined);
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
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
    duplicate(newName?: string): LocalePicker;
}

interface SliderOptions extends CompositeOptions {
    /** The size of the track that the thumb moves along. */
    trackSize?: Size;
    /** The color of the track. */
    trackColor?: RgbaColor;
    /** The size of the thumb that the user drags. */
    thumbSize?: Size;
    /** The color of the thumb. */
    thumbColor?: RgbaColor;
    /** The minimum value of the slider. */
    min?: number;
    /** The maximum value of the slider. */
    max?: number;
    /** The initial value of the slider. */
    value?: number;
}
interface SliderEvent extends CompositeEvent {
    type: "Composite";
    compositeType: "Slider";
    compositeEventType: "SliderValueChanged";
    target: Slider | string;
    value: number;
}
declare class Slider extends Composite implements SliderOptions {
    readonly compositeType = "Slider";
    private originalOptions;
    private _trackSize;
    private _trackColor;
    private _thumbSize;
    private _thumbColor;
    private _min;
    private _max;
    private _value;
    private thumbLabel?;
    private _thumbShape?;
    private get thumbShape();
    private set thumbShape(value);
    /**
     * A slider to select a value from a range by dragging a thumb along a track.
     *
     * @experimental Slider is a work in progress and will change in future versions.
     *
     * @param options - {@link SliderOptions}
     */
    constructor(options: SliderOptions);
    get completeNodeOptions(): {
        /** The size of the track that the thumb moves along. */
        trackSize?: Size;
        /** The color of the track. */
        trackColor?: RgbaColor;
        /** The size of the thumb that the user drags. */
        thumbSize?: Size;
        /** The color of the thumb. */
        thumbColor?: RgbaColor;
        /** The minimum value of the slider. */
        min?: number;
        /** The maximum value of the slider. */
        max?: number;
        /** The initial value of the slider. */
        value?: number;
        name?: string;
        position?: _m2c2kit_core.Point;
        scale?: number;
        alpha?: number;
        zRotation?: number;
        isUserInteractionEnabled?: boolean;
        draggable?: boolean;
        hidden?: boolean;
        layout?: _m2c2kit_core.Layout;
        uuid?: string;
        suppressEvents?: boolean;
        anchorPoint?: _m2c2kit_core.Point;
        zPosition?: number;
    };
    initialize(): void;
    updateThumbLabel(): void;
    /**
     * Executes a callback when the slider value changes.
     *
     * @param callback - function to execute
     * @param options
     */
    onValueChanged(callback: (sliderEvent: SliderEvent) => void, options?: CallbackOptions): void;
    private addSliderEventListener;
    get trackSize(): Size;
    set trackSize(value: Size);
    get trackColor(): RgbaColor;
    set trackColor(value: RgbaColor);
    get thumbSize(): Size;
    set thumbSize(value: Size);
    get thumbColor(): RgbaColor;
    set thumbColor(value: RgbaColor);
    get value(): number;
    set value(value: number);
    get min(): number;
    set min(value: number);
    get max(): number;
    set max(value: number);
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
    duplicate(newName?: string | undefined): Slider;
    update(): void;
    draw(canvas: Canvas): void;
    warmup(canvas: Canvas): void;
}

export { Button, type ButtonOptions, CountdownScene, type CountdownSceneOptions, CountdownTimer, type CountdownTimerEvent, type CountdownTimerOptions, Dialog, type DialogEvent, type DialogOptions, DialogResult, DrawPad, type DrawPadEvent, DrawPadEventType, type DrawPadItem, type DrawPadItemEvent, DrawPadItemEventType, type DrawPadOptions, type DrawPadStroke, Grid, type GridChild, type GridOptions, type InstructionScene, Instructions, type InstructionsOptions, type KeyConfiguration, type KeyTapMetadata, type LocaleOption, LocalePicker, type LocalePickerEvent, type LocalePickerIcon, type LocalePickerOptions, type LocalePickerResult, Slider, type SliderEvent, type SliderOptions, type StrokeInteraction, type TimerShape, VirtualKeyboard, type VirtualKeyboardEvent, type VirtualKeyboardOptions, type VirtualKeyboardRow };
