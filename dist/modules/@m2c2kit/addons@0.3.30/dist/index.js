import { M2c2KitHelpers, Composite, WebColors, M2Error, Shape, EventStoreMode, Equal, Label, CanvasKitHelpers, M2EventType, Timer, MutablePath, Easings, Story, Transition, TransitionDirection, LabelHorizontalAlignmentMode, Scene, Dimensions, Sprite, Action } from '@m2c2kit/core';

class Grid extends Composite {
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
  constructor(options) {
    super(options);
    this.compositeType = "Grid";
    // Grid options
    this._rows = 0;
    this._columns = 0;
    // default Grid is: transparent blue, red lines, line width 1
    this._gridBackgroundColor = [0, 0, 255, 0.25];
    this._gridLineColor = WebColors.Red;
    this._gridLineWidth = 1;
    this._gridChildren = new Array();
    this.cellContainers = new Array();
    if (options.size) {
      this.size = options.size;
    } else {
      throw new M2Error("grid size must be specified");
    }
    if (options.rows) {
      if (options.rows >= 1) {
        this.rows = options.rows;
      } else {
        throw new M2Error("grid rows must be at least 1");
      }
    } else {
      throw new M2Error("grid rows must be specified");
    }
    if (options.columns) {
      if (options.columns >= 1) {
        this.columns = options.columns;
      } else {
        throw new M2Error("grid columns must be at least 1");
      }
    } else {
      throw new M2Error("grid columns must be specified");
    }
    if (options.backgroundColor) {
      this.gridBackgroundColor = options.backgroundColor;
    }
    if (options.gridLineColor) {
      this.gridLineColor = options.gridLineColor;
    }
    if (options.gridLineWidth) {
      this.gridLineWidth = options.gridLineWidth;
    }
    this.cellWidth = this.size.width / this.columns;
    this.cellHeight = this.size.height / this.rows;
    this.saveNodeNewEvent();
  }
  get completeNodeOptions() {
    return {
      ...this.options,
      ...this.getNodeOptions(),
      ...this.getDrawableOptions(),
      rows: this.rows,
      columns: this.columns,
      size: this.size,
      backgroundColor: this.gridBackgroundColor,
      gridLineWidth: this.gridLineWidth,
      gridLineColor: this.gridLineColor
    };
  }
  initialize() {
    this.descendants.forEach((d) => {
      if (d.parent === this) {
        super.removeChild(d);
      } else {
        d.parent?.removeChild(d);
      }
    });
    this.gridBackground = new Shape({
      name: "__" + this.name + "-gridRectangle",
      rect: { size: this.size },
      fillColor: this.gridBackgroundColor,
      strokeColor: this.gridLineColor,
      lineWidth: this.gridLineWidth,
      isUserInteractionEnabled: this.isUserInteractionEnabled,
      suppressEvents: true
    });
    super.addChild(this.gridBackground);
    this.gridBackground.isUserInteractionEnabled = this.isUserInteractionEnabled;
    for (let col = 1; col < this.columns; col++) {
      const verticalLine = new Shape({
        name: "__" + this.name + "-gridVerticalLine-" + (col - 1),
        rect: {
          size: { width: this.gridLineWidth, height: this.size.height },
          origin: { x: -this.size.width / 2 + this.cellWidth * col, y: 0 }
        },
        fillColor: this.gridLineColor,
        suppressEvents: true
      });
      this.gridBackground.addChild(verticalLine);
    }
    for (let row = 1; row < this.rows; row++) {
      const horizontalLine = new Shape({
        name: "__" + this.name + "-gridHorizontalLine-" + (row - 1),
        rect: {
          size: { width: this.size.width, height: this.gridLineWidth },
          origin: { x: 0, y: -this.size.height / 2 + this.cellHeight * row }
        },
        fillColor: this.gridLineColor,
        suppressEvents: true
      });
      this.gridBackground.addChild(horizontalLine);
    }
    this.cellContainers = new Array(this.rows).fill([]).map(() => new Array(this.columns));
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const cellContainer = new Shape({
          name: "__" + this.name + "-gridCellContainer-" + row + "-" + col,
          rect: {
            size: { width: this.cellWidth, height: this.cellHeight },
            origin: {
              x: -this.size.width / 2 + this.cellWidth * col + this.cellWidth / 2,
              y: -this.size.height / 2 + this.cellHeight * row + this.cellHeight / 2
            }
          },
          fillColor: WebColors.Transparent,
          lineWidth: 0,
          suppressEvents: true
        });
        this.gridBackground.addChild(cellContainer);
        this.cellContainers[row][col] = cellContainer;
      }
    }
    if (this.gridChildren.length > 0) {
      this.gridChildren.forEach((gridChild) => {
        if (!this.cellWidth || !this.cellHeight || !this.gridBackground) {
          throw new M2Error(
            "cellWidth, cellHeight, or gridBackground undefined or null"
          );
        }
        if (this.game.eventStore.mode === EventStoreMode.Replay) {
          const childNode = [
            ...this.game.nodes,
            ...this.game.materializedNodes
          ].find(
            (n) => (
              // gridChild.node is the uuid of the child node here!
              n.uuid === gridChild.node
            )
          );
          if (!childNode) {
            throw new M2Error("grid: child node not found");
          }
          childNode?.parent?.removeChild(childNode);
          this.cellContainers[gridChild.row][gridChild.column].addChild(
            childNode
          );
        } else {
          gridChild.node.parent?.removeChild(gridChild.node);
          this.cellContainers[gridChild.row][gridChild.column].addChild(
            gridChild.node
          );
        }
      });
    }
    this.needsInitialization = false;
  }
  get gridBackground() {
    if (!this._gridBackground) {
      throw new M2Error("gridBackground is null or undefined");
    }
    return this._gridBackground;
  }
  set gridBackground(gridBackground) {
    this._gridBackground = gridBackground;
  }
  /**
   * note: below we do not have getter and setter for size because the getter
   * and setter in M2Node will handle it.
   */
  get rows() {
    return this._rows;
  }
  set rows(rows) {
    if (Equal.value(this._rows, rows)) {
      return;
    }
    this._rows = rows;
    this.needsInitialization = true;
  }
  get columns() {
    return this._columns;
  }
  set columns(columns) {
    if (Equal.value(this._columns, columns)) {
      return;
    }
    this._columns = columns;
    this.needsInitialization = true;
  }
  get gridBackgroundColor() {
    return this._gridBackgroundColor;
  }
  set gridBackgroundColor(backgroundColor) {
    if (Equal.value(this._gridBackgroundColor, backgroundColor)) {
      return;
    }
    this._gridBackgroundColor = backgroundColor;
    this.needsInitialization = true;
  }
  get gridLineWidth() {
    return this._gridLineWidth;
  }
  set gridLineWidth(gridLineWidth) {
    if (Equal.value(this._gridLineWidth, gridLineWidth)) {
      return;
    }
    this._gridLineWidth = gridLineWidth;
    this.needsInitialization = true;
  }
  get gridLineColor() {
    return this._gridLineColor;
  }
  set gridLineColor(gridLineColor) {
    if (Equal.value(this._gridLineColor, gridLineColor)) {
      return;
    }
    this._gridLineColor = gridLineColor;
    this.needsInitialization = true;
  }
  // all nodes that make up grid are added as children, so they
  // have their own dispose methods
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  dispose() {
  }
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
  duplicate(newName) {
    const dest = new Grid({
      ...this.getNodeOptions(),
      ...this.getDrawableOptions(),
      rows: this.rows,
      columns: this.columns,
      size: this.size,
      backgroundColor: this.gridBackgroundColor,
      gridLineWidth: this.gridLineWidth,
      gridLineColor: this.gridLineColor,
      name: newName
    });
    if (this.children.length > 0) {
      dest.children = this.children.map((child) => {
        const clonedChild = child.duplicate();
        clonedChild.parent = dest;
        return clonedChild;
      });
    }
    return dest;
  }
  update() {
    super.update();
  }
  draw(canvas) {
    super.drawChildren(canvas);
  }
  warmup(canvas) {
    this.initialize();
    this.children.filter((child) => child.isDrawable).forEach((child) => {
      child.warmup(canvas);
    });
  }
  /**
   * The child nodes that have been added to the grid.
   *
   * @remarks Do not set this property directly. Use the methods for adding
   * and removing grid children, such as `addAtCell()`, `removeAllAtCell()`,
   * `removeGridChild()`, and `removeAllGridChildren()`.
   */
  get gridChildren() {
    return this._gridChildren;
  }
  set gridChildren(gridChildren) {
    this._gridChildren = gridChildren;
    this.needsInitialization = true;
    this.savePropertyChangeEvent(
      "gridChildren",
      this.gridChildren.map(
        (gridChild) => ({
          node: gridChild.node.uuid,
          row: gridChild.row,
          column: gridChild.column
        })
      )
    );
  }
  /**
   * Removes all grid children from the grid.
   *
   * @remarks This retains grid lines and grid appearance.
   */
  removeAllGridChildren() {
    if (this.gridChildren.length === 0) {
      return;
    }
    while (this.gridChildren.length) {
      this.gridChildren = this.gridChildren.slice(0, -1);
    }
    this.needsInitialization = true;
  }
  /**
   * Adds a node as a grid child to the grid at the specified row and column
   * position.
   *
   * @param node - node to add to the grid
   * @param row  - row position within grid to add node; zero-based indexing
   * @param column - column position within grid to add node; zero-based indexing
   */
  addAtCell(node, row, column) {
    if (row < 0 || row >= this.rows || column < 0 || column >= this.columns) {
      console.warn(
        `warning: addAtCell() requested to add node at row ${row}, column ${column}. This is outside the bounds of grid ${this.name}, which is size ${this.rows}x${this.columns}. Note that addAtCell() uses zero-based indexing. AddAtCell() will proceed, but may draw nodes outside the grid`
      );
    }
    this.gridChildren = [
      ...this.gridChildren,
      { node, row, column }
    ];
    this.needsInitialization = true;
  }
  /**
   * Removes all grid child nodes at the specified row and column position.
   *
   * @param row - row position within grid at which to remove grid children; zero-based indexing
   * @param column - column position within grid at which to remove grid children; zero-based indexing
   */
  removeAllAtCell(row, column) {
    this.gridChildren = this.gridChildren.filter(
      (gridChild) => gridChild.row !== row && gridChild.column !== column
    );
    this.needsInitialization = true;
  }
  /**
   * Removes the grid child node from the grid.
   *
   * @param node - node to remove
   */
  removeGridChild(node) {
    this.gridChildren = this.gridChildren.filter(
      (gridChild) => gridChild.node != node
    );
    this.needsInitialization = true;
  }
  // The Grid manages its own children (background, lines, and cell
  // containers). It is probably a mistake when the user tries to add or remove
  // these children. The user probably meant to add or remove grid children
  // instead. Warn the user about this.
  addChild(child) {
    console.warn(
      "Grid.addChild() was called -- did you mean to call addAtCell() instead?"
    );
    super.addChild(child);
  }
  removeAllChildren() {
    console.warn(
      "Grid.removeAllChildren() was called -- did you mean to call removeAllGridChildren() instead?"
    );
    super.removeAllChildren();
  }
  removeChild(child) {
    console.warn(
      "Grid.removeChild() was called -- did you mean to call removeGridChild() instead?"
    );
    super.removeChild(child);
  }
  removeChildren(children) {
    console.warn(
      "Grid.removeChildren() was called -- did you mean to call removeGridChild() instead?"
    );
    super.removeChildren(children);
  }
}
M2c2KitHelpers.registerM2NodeClass(Grid);

class Button extends Composite {
  // TODO: add default "behaviors" (?) like button click animation?
  /**
   * A simple button of rectangle with text centered inside.
   *
   * @remarks This composite node is composed of a rectangle and text. To
   * respond to user taps, the isUserInteractionEnabled property must be set
   * to true and an appropriate callback must be set to handle the tap event.
   *
   * @param options - {@link ButtonOptions}
   */
  constructor(options) {
    super(options);
    this.compositeType = "Button";
    this.isText = true;
    // Button options
    this._backgroundColor = WebColors.Black;
    this._cornerRadius = 9;
    this._fontSize = 20;
    this._text = "";
    this._fontColor = WebColors.White;
    this._interpolation = {};
    this._localize = true;
    if (options.text) {
      this.text = options.text;
    }
    if (options.size) {
      this.size = options.size;
    } else {
      this.size = { width: 200, height: 50 };
    }
    if (options.cornerRadius !== void 0) {
      this.cornerRadius = options.cornerRadius;
    }
    if (options.fontName) {
      this.fontName = options.fontName;
    }
    if (options.fontNames) {
      this.fontNames = options.fontNames;
    }
    if (options.fontSize !== void 0) {
      this.fontSize = options.fontSize;
    }
    if (options.fontColor) {
      this.fontColor = options.fontColor;
    }
    if (options.backgroundColor) {
      this.backgroundColor = options.backgroundColor;
    }
    if (options.interpolation) {
      this.interpolation = options.interpolation;
    }
    if (options.localize !== void 0) {
      this.localize = options.localize;
    }
    this.saveNodeNewEvent();
  }
  get completeNodeOptions() {
    return {
      ...this.options,
      ...this.getNodeOptions(),
      ...this.getDrawableOptions(),
      ...this.getTextOptions(),
      size: this.size,
      cornerRadius: this.cornerRadius,
      backgroundColor: this.backgroundColor,
      fontNames: this.fontNames
    };
  }
  initialize() {
    this.removeAllChildren();
    this.backgroundPaint = new this.canvasKit.Paint();
    this.backgroundPaint.setColor(
      this.canvasKit.Color(
        this.backgroundColor[0],
        this.backgroundColor[1],
        this.backgroundColor[2],
        this.backgroundColor[3]
      )
    );
    this.backgroundPaint.setStyle(this.canvasKit.PaintStyle.Fill);
    const buttonRectangle = new Shape({
      name: "__" + this.name + "-buttonRectangle",
      rect: { size: this.size },
      cornerRadius: this.cornerRadius,
      fillColor: this._backgroundColor,
      suppressEvents: true
    });
    this.addChild(buttonRectangle);
    const buttonLabel = new Label({
      name: "__" + this.name + "-buttonLabel",
      text: this.text,
      localize: this.localize,
      interpolation: this.interpolation,
      fontName: this.fontName,
      fontNames: this.fontNames,
      fontSize: this.fontSize,
      fontColor: this.fontColor,
      suppressEvents: true
    });
    buttonRectangle.addChild(buttonLabel);
    this.needsInitialization = false;
  }
  dispose() {
    CanvasKitHelpers.Dispose([this.backgroundPaint]);
  }
  get text() {
    return this._text;
  }
  set text(text) {
    if (Equal.value(this._text, text)) {
      return;
    }
    this._text = text;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("text", text);
  }
  get backgroundColor() {
    return this._backgroundColor;
  }
  set backgroundColor(backgroundColor) {
    if (Equal.value(this._backgroundColor, backgroundColor)) {
      return;
    }
    this._backgroundColor = backgroundColor;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("backgroundColor", backgroundColor);
  }
  get fontColor() {
    return this._fontColor;
  }
  set fontColor(fontColor) {
    if (Equal.value(this._fontColor, fontColor)) {
      return;
    }
    this._fontColor = fontColor;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("fontColor", fontColor);
  }
  get fontName() {
    return this._fontName;
  }
  set fontName(fontName) {
    if (this._fontName === fontName) {
      return;
    }
    this._fontName = fontName;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("fontName", fontName);
  }
  get fontNames() {
    return this._fontNames;
  }
  set fontNames(fontNames) {
    if (Equal.value(this._fontNames, fontNames)) {
      return;
    }
    this._fontNames = fontNames;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("fontNames", fontNames);
  }
  get cornerRadius() {
    return this._cornerRadius;
  }
  set cornerRadius(cornerRadius) {
    if (Equal.value(this._cornerRadius, cornerRadius)) {
      return;
    }
    this._cornerRadius = cornerRadius;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("cornerRadius", cornerRadius);
  }
  get fontSize() {
    return this._fontSize;
  }
  set fontSize(fontSize) {
    if (Equal.value(this._fontSize, fontSize)) {
      return;
    }
    this._fontSize = fontSize;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("fontSize", fontSize);
  }
  get interpolation() {
    return this._interpolation;
  }
  set interpolation(interpolation) {
    if (Equal.value(this._interpolation, interpolation)) {
      return;
    }
    this._interpolation = interpolation;
    Object.freeze(this._interpolation);
    this.needsInitialization = true;
    this.savePropertyChangeEvent("interpolation", interpolation);
  }
  get localize() {
    return this._localize;
  }
  set localize(localize) {
    if (Equal.value(this._localize, localize)) {
      return;
    }
    this._localize = localize;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("localize", localize);
  }
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
  duplicate(newName) {
    const dest = new Button({
      ...this.getNodeOptions(),
      ...this.getDrawableOptions(),
      ...this.getTextOptions(),
      size: this.size,
      cornerRadius: this.cornerRadius,
      backgroundColor: this.backgroundColor,
      fontColor: this.fontColor,
      name: newName,
      localize: this.localize,
      interpolation: JSON.parse(JSON.stringify(this.interpolation)),
      fontName: this.fontName,
      fontNames: JSON.parse(JSON.stringify(this.fontNames))
    });
    if (this.children.length > 0) {
      dest.children = this.children.map((child) => {
        const clonedChild = child.duplicate();
        clonedChild.parent = dest;
        return clonedChild;
      });
    }
    return dest;
  }
  update() {
    super.update();
  }
  draw(canvas) {
    super.drawChildren(canvas);
  }
  warmup(canvas) {
    this.initialize();
    this.children.filter((child) => child.isDrawable).forEach((child) => {
      child.warmup(canvas);
    });
  }
}
M2c2KitHelpers.registerM2NodeClass(Button);

var DialogResult = /* @__PURE__ */ ((DialogResult2) => {
  DialogResult2["Dismiss"] = "Dismiss";
  DialogResult2["Positive"] = "Positive";
  DialogResult2["Negative"] = "Negative";
  return DialogResult2;
})(DialogResult || {});
class Dialog extends Composite {
  // todo: add getters/setters so button can respond to changes in its options
  // todo: add default "behaviors" (?) like button click animation?
  constructor(options) {
    super(options);
    this.compositeType = "Dialog";
    this._backgroundColor = WebColors.White;
    this.cornerRadius = 9;
    this.overlayAlpha = 0.5;
    this.contentText = "";
    this.positiveButtonText = "";
    this.negativeButtonText = "";
    this._fontColor = WebColors.White;
    this.zPosition = Number.MAX_VALUE;
    this.hidden = true;
    if (!options) {
      return;
    }
    if (options.overlayAlpha) {
      this.overlayAlpha = options.overlayAlpha;
    }
    if (options.messageText) {
      this.contentText = options.messageText;
    }
    if (options.positiveButtonText) {
      this.positiveButtonText = options.positiveButtonText;
    }
    if (options.negativeButtonText) {
      this.negativeButtonText = options.negativeButtonText;
    }
    if (options.size) {
      this.size = options.size;
    }
    if (options.cornerRadius) {
      this.cornerRadius = options.cornerRadius;
    }
    if (options.fontColor) {
      this.fontColor = options.fontColor;
    }
    if (options.backgroundColor) {
      this.backgroundColor = options.backgroundColor;
    }
  }
  show() {
    this.hidden = false;
  }
  onDialogResult(callback, options) {
    const eventListener = {
      type: M2EventType.Composite,
      compositeType: "DialogResult",
      nodeUuid: this.uuid,
      callback
    };
    if (options?.replaceExisting) {
      this.eventListeners = this.eventListeners.filter(
        (listener) => !(listener.nodeUuid === eventListener.nodeUuid && listener.type === eventListener.type)
      );
    }
    this.eventListeners.push(eventListener);
  }
  initialize() {
    this.removeAllChildren();
    const overlay = new Shape({
      rect: {
        width: m2c2Globals.canvasCssWidth,
        height: m2c2Globals.canvasCssHeight,
        x: m2c2Globals.canvasCssWidth / 2,
        y: m2c2Globals.canvasCssHeight / 2
      },
      fillColor: [0, 0, 0, this.overlayAlpha],
      zPosition: -1,
      isUserInteractionEnabled: true
    });
    overlay.onTapDown((e) => {
      e.handled = true;
      this.hidden = true;
      if (this.eventListeners.length > 0) {
        this.eventListeners.filter((listener) => listener.type === M2EventType.Composite).forEach((listener) => {
          const dialogEvent = {
            type: M2EventType.Composite,
            target: this,
            handled: false,
            dialogResult: "Dismiss" /* Dismiss */,
            timestamp: Timer.now(),
            iso8601Timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
          listener.callback(dialogEvent);
        });
      }
    });
    this.addChild(overlay);
    const dialogBox = new Shape({
      rect: {
        width: 300,
        height: 150,
        x: m2c2Globals.canvasCssWidth / 2,
        y: m2c2Globals.canvasCssHeight / 2
      },
      cornerRadius: this.cornerRadius,
      fillColor: this.backgroundColor,
      isUserInteractionEnabled: true
    });
    dialogBox.onTapDown((e) => {
      e.handled = true;
    });
    this.addChild(dialogBox);
    const dialogBoxPrimaryText = new Label({
      text: this.contentText,
      fontSize: 24,
      position: { x: 200, y: 360 }
    });
    this.addChild(dialogBoxPrimaryText);
    const negativeButton = new Button({
      text: this.negativeButtonText,
      position: { x: 120, y: 440 },
      size: { width: 100, height: 40 },
      isUserInteractionEnabled: true,
      zPosition: 1
    });
    negativeButton.onTapDown((e) => {
      e.handled = true;
      this.hidden = true;
    });
    negativeButton.onTapDown((e) => {
      e.handled = true;
      this.hidden = true;
      if (this.eventListeners.length > 0) {
        this.eventListeners.filter((listener) => listener.type === M2EventType.Composite).forEach((listener) => {
          const dialogEvent = {
            type: M2EventType.Composite,
            target: this,
            handled: false,
            dialogResult: "Negative" /* Negative */,
            timestamp: Timer.now(),
            iso8601Timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
          listener.callback(dialogEvent);
        });
      }
    });
    const positiveButton = new Button({
      text: this.positiveButtonText,
      position: { x: 280, y: 440 },
      size: { width: 100, height: 40 },
      isUserInteractionEnabled: true,
      zPosition: 1
    });
    positiveButton.onTapDown((e) => {
      e.handled = true;
      this.hidden = true;
      if (this.eventListeners.length > 0) {
        this.eventListeners.filter((listener) => listener.type === M2EventType.Composite).forEach((listener) => {
          const dialogEvent = {
            type: M2EventType.Composite,
            target: this,
            handled: false,
            dialogResult: "Positive" /* Positive */,
            timestamp: Timer.now(),
            iso8601Timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
          listener.callback(dialogEvent);
        });
      }
    });
    this.addChild(negativeButton);
    this.addChild(positiveButton);
    this.needsInitialization = false;
  }
  get backgroundColor() {
    return this._backgroundColor;
  }
  set backgroundColor(backgroundColor) {
    this._backgroundColor = backgroundColor;
    this.needsInitialization = true;
  }
  get fontColor() {
    return this._fontColor;
  }
  set fontColor(fontColor) {
    this._fontColor = fontColor;
    this.needsInitialization = true;
  }
  get hidden() {
    return this._hidden;
  }
  set hidden(hidden) {
    this._hidden = hidden;
    this.needsInitialization = true;
  }
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
  duplicate(newName) {
    throw new M2Error(`duplicate not implemented. ${newName}`);
  }
  update() {
    super.update();
  }
  draw(canvas) {
    super.drawChildren(canvas);
  }
  warmup(canvas) {
    this.initialize();
    this.children.filter((child) => child.isDrawable).forEach((child) => {
      child.warmup(canvas);
    });
  }
}

const DrawPadEventType = {
  StrokeStart: "StrokeStart",
  StrokeMove: "StrokeMove",
  StrokeEnd: "StrokeEnd"
};
const DrawPadItemEventType = {
  StrokeEnter: "StrokeEnter",
  StrokeLeave: "StrokeLeave"
};
class DrawPad extends Composite {
  /**
   * A rectangular area on which the user can draw strokes (lines).
   *
   * @remarks This composite node is composed of a rectangle Shape and
   * another Shape that is formed from a path of points.
   *
   * @param options - {@link DrawPadOptions}
   */
  constructor(options) {
    super(options);
    this.compositeType = "DrawPad";
    this.resumeDrawingOnReturn = false;
    this.continuousDrawingOnly = false;
    this._backgroundColor = [0, 0, 0, 0];
    this._borderColor = WebColors.Black;
    this._borderWidth = 1;
    this._lineColor = WebColors.Red;
    this._lineWidth = 1;
    this.isDrawingPointerDown = false;
    this.pointerIsDownAndPointerLeftDrawAreaWhenDown = false;
    this.currentStrokesNotAllowed = false;
    /** Array of strokes created on the DrawPad, with position and timestamps
     * of all interactions with each DrawPadStroke.
     */
    this.strokes = new Array();
    this.originalOptions = JSON.parse(JSON.stringify(options));
    if (options.isUserInteractionEnabled === void 0) {
      this.isUserInteractionEnabled = true;
    }
    if (!options.size) {
      throw new M2Error("DrawPad size must be specified");
    }
    this.size = options.size;
    if (options.lineColor) {
      this.lineColor = options.lineColor;
    }
    if (options.lineWidth) {
      this.lineWidth = options.lineWidth;
    }
    if (options.backgroundColor) {
      this.backgroundColor = options.backgroundColor;
    }
    if (options.borderColor) {
      this.borderColor = options.borderColor;
    }
    if (options.borderWidth) {
      this.borderWidth = options.borderWidth;
    }
    if (options.resumeDrawingOnReturn !== void 0) {
      this.resumeDrawingOnReturn = options.resumeDrawingOnReturn;
    }
    if (options.continuousDrawingOnly !== void 0) {
      this.continuousDrawingOnly = options.continuousDrawingOnly;
    }
    if (options.continuousDrawingOnlyExceptionDistance !== void 0) {
      this.continuousDrawingOnlyExceptionDistance = options.continuousDrawingOnlyExceptionDistance;
    }
    this.saveNodeNewEvent();
  }
  get completeNodeOptions() {
    return {
      ...this.options,
      ...this.getNodeOptions(),
      ...this.getDrawableOptions(),
      ...this.originalOptions
    };
  }
  initialize() {
    this.initializeDrawShape();
    this.initializeDrawArea();
    this.needsInitialization = false;
  }
  initializeDrawShape() {
    if (!this.drawShape) {
      const mutablePath = new MutablePath();
      this.drawShape = new Shape({
        path: mutablePath,
        size: this.size
      });
      this.addChild(this.drawShape);
    }
    this.drawShape.strokeColor = this.lineColor;
    this.drawShape.lineWidth = this.lineWidth;
  }
  initializeDrawArea() {
    if (!this.drawArea) {
      this.drawArea = new Shape({
        rect: { size: this.size },
        isUserInteractionEnabled: true,
        suppressEvents: true
      });
      this.addChild(this.drawArea);
      this.drawArea.onTapDown((e) => {
        this.handleTapDown(e);
      });
      this.drawArea.onPointerMove((e) => {
        this.handlePointerMove(e);
      });
      this.drawArea.onTapUpAny(() => {
        this.handleTapUpAny();
      });
      this.drawArea.onTapLeave((e) => {
        this.handleTapLeave(e);
      });
    }
    this.drawArea.fillColor = this.backgroundColor;
    this.drawArea.strokeColor = this.borderColor;
    this.drawArea.lineWidth = this.borderWidth;
  }
  dist(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
  handleTapDown(e) {
    if (this.isUserInteractionEnabled) {
      if (!this.drawShape?.path) {
        throw new M2Error("DrawPad.handleTapDown(): no drawShape.path");
      }
      const path = this.drawShape.path;
      if (this.continuousDrawingOnly && path.subpaths.length !== 0) {
        const prevPoint = path.subpaths[path.subpaths.length - 1][path.subpaths[path.subpaths.length - 1].length - 1];
        const currentPoint = e.point;
        if (this.continuousDrawingOnlyExceptionDistance === void 0 || this.dist(prevPoint, currentPoint) > this.continuousDrawingOnlyExceptionDistance) {
          this.currentStrokesNotAllowed = true;
          return;
        }
      }
      this.currentStrokesNotAllowed = false;
      this.isDrawingPointerDown = true;
      path.move(e.point);
      const drawPadEvent = {
        type: DrawPadEventType.StrokeStart,
        target: this,
        handled: false,
        position: e.point,
        ...M2c2KitHelpers.createTimestamps()
      };
      this.strokes.push([
        {
          type: DrawPadEventType.StrokeStart,
          position: e.point,
          iso8601Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          interpolated: false
        }
      ]);
      this.raiseDrawPadEvent(drawPadEvent);
    }
  }
  addInterpolatedStrokeMove(point) {
    const strokeCount = this.strokes.length;
    const strokeInteractionCount = this.strokes[strokeCount - 1].length;
    const previousPoint = this.strokes[this.strokes.length - 1][strokeInteractionCount - 1].position;
    const interpolatedPoint = this.interpolateToDrawPadBorder(
      point,
      previousPoint,
      this.size
    );
    if (!this.drawShape?.path) {
      throw new M2Error(
        "DrawPad.addInterpolatedStrokeMove(): no drawShape.path"
      );
    }
    const path = this.drawShape.path;
    path.addLine(interpolatedPoint);
    const drawPadEvent = {
      type: DrawPadEventType.StrokeMove,
      target: this,
      handled: false,
      position: interpolatedPoint,
      ...M2c2KitHelpers.createTimestamps()
    };
    this.strokes[strokeCount - 1].push({
      type: DrawPadEventType.StrokeMove,
      position: interpolatedPoint,
      iso8601Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      interpolated: true
    });
    this.raiseDrawPadEvent(drawPadEvent);
    return interpolatedPoint;
  }
  handleTapLeave(e) {
    if (this.currentStrokesNotAllowed) {
      this.isDrawingPointerDown = false;
      return;
    }
    if (this.resumeDrawingOnReturn === false) {
      this.isDrawingPointerDown = false;
      const strokeCount = this.strokes.length;
      const strokeInteractionCount = this.strokes[strokeCount - 1].length;
      let pointWasInterpolated = false;
      let point = e.point;
      if (!this.isPointWithinDrawPad(e.point, this.size)) {
        point = this.addInterpolatedStrokeMove(e.point);
        pointWasInterpolated = true;
      }
      const drawPadEvent = {
        type: DrawPadEventType.StrokeEnd,
        position: this.strokes[strokeCount - 1][strokeInteractionCount - 1].position,
        target: this,
        handled: false,
        ...M2c2KitHelpers.createTimestamps()
      };
      this.strokes[strokeCount - 1].push({
        type: DrawPadEventType.StrokeEnd,
        position: pointWasInterpolated ? point : this.strokes[strokeCount - 1][strokeInteractionCount - 1].position,
        iso8601Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        interpolated: pointWasInterpolated
      });
      this.raiseDrawPadEvent(drawPadEvent);
      this.currentStrokesNotAllowed = true;
    } else {
      this.pointerIsDownAndPointerLeftDrawAreaWhenDown = true;
    }
  }
  handleTapUpAny() {
    if (this.currentStrokesNotAllowed) {
      this.isDrawingPointerDown = false;
      return;
    }
    if (this.isUserInteractionEnabled) {
      this.isDrawingPointerDown = false;
      this.pointerIsDownAndPointerLeftDrawAreaWhenDown = false;
      const strokeCount = this.strokes.length;
      const strokeInteractionCount = this.strokes[strokeCount - 1].length;
      const drawPadEvent = {
        type: DrawPadEventType.StrokeEnd,
        position: this.strokes[strokeCount - 1][strokeInteractionCount - 1].position,
        target: this,
        handled: false,
        ...M2c2KitHelpers.createTimestamps()
      };
      this.strokes[strokeCount - 1].push({
        type: DrawPadEventType.StrokeEnd,
        position: this.strokes[strokeCount - 1][strokeInteractionCount - 1].position,
        iso8601Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        interpolated: false
      });
      this.raiseDrawPadEvent(drawPadEvent);
    }
  }
  handlePointerMove(e) {
    if (this.isUserInteractionEnabled && this.isDrawingPointerDown) {
      if (!this.drawShape?.path) {
        throw new M2Error("DrawPad.handlePointerMove(): no drawShape.path");
      }
      const path = this.drawShape.path;
      if (this.isDrawingPointerDown && !this.pointerIsDownAndPointerLeftDrawAreaWhenDown) {
        path.addLine(e.point);
      }
      if (this.pointerIsDownAndPointerLeftDrawAreaWhenDown) {
        this.pointerIsDownAndPointerLeftDrawAreaWhenDown = false;
        path.move(e.point);
      }
      const drawPadEvent = {
        type: DrawPadEventType.StrokeMove,
        target: this,
        handled: false,
        position: e.point,
        ...M2c2KitHelpers.createTimestamps()
      };
      const strokeCount = this.strokes.length;
      this.strokes[strokeCount - 1].push({
        type: DrawPadEventType.StrokeMove,
        position: e.point,
        iso8601Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        interpolated: false
      });
      this.raiseDrawPadEvent(drawPadEvent);
    }
  }
  update() {
    super.update();
  }
  draw(canvas) {
    super.drawChildren(canvas);
  }
  raiseDrawPadEvent(event) {
    if (this.eventListeners.length > 0) {
      this.eventListeners.filter((listener) => listener.type === event.type).forEach((listener) => {
        listener.callback(event);
      });
    }
  }
  raiseDrawPadItemEvent(item, event) {
    if (item.eventListeners.length > 0) {
      item.eventListeners.filter((listener) => listener.type === event.type).forEach((listener) => {
        listener.callback(event);
      });
    }
  }
  /**
   * Removes all strokes from the DrawPad.
   */
  clear() {
    if (!this.drawShape?.path) {
      throw new M2Error("DrawPad.clear(): no drawShape.path");
    }
    const path = this.drawShape.path;
    path.clear();
    this.strokes = new Array();
  }
  warmup(canvas) {
    this.initialize();
    this.children.filter((child) => child.isDrawable).forEach((child) => {
      child.warmup(canvas);
    });
  }
  /**
   * Executes a callback when the user starts a stroke on the DrawPad.
   *
   * @param callback - function to execute
   * @param options - {@link CallbackOptions}
   */
  onStrokeStart(callback, options) {
    this.addEventListener(
      DrawPadEventType.StrokeStart,
      callback,
      options
    );
  }
  /**
   * Executes a callback when the user moves a stroke on the DrawPad.
   *
   * @param callback - function to execute
   * @param options - {@link CallbackOptions}
   */
  onStrokeMove(callback, options) {
    this.addEventListener(
      DrawPadEventType.StrokeMove,
      callback,
      options
    );
  }
  /**
   * Executes a callback when the user ends a stroke on the DrawPad.
   *
   * @param callback - function to execute
   * @param options - {@link CallbackOptions}
   */
  onStrokeEnd(callback, options) {
    this.addEventListener(
      DrawPadEventType.StrokeEnd,
      callback,
      options
    );
  }
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
  addItem(node) {
    Object.defineProperty(node, "drawPadPosition", {
      get: function() {
        const drawPad = node.parent;
        return {
          get x() {
            return node.position.x + drawPad.size.width / 2;
          },
          set x(value) {
            node.position.x = value - drawPad.size.width / 2;
          },
          get y() {
            return node.position.y + drawPad.size.height / 2;
          },
          set y(value) {
            node.position.y = value - drawPad.size.height / 2;
          }
        };
      },
      set: function(value) {
        const drawPad = node.parent;
        node.position.x = value.x - drawPad.size.width / 2;
        node.position.y = value.y - drawPad.size.height / 2;
      }
    });
    Object.defineProperty(node, "onStrokeEnter", {
      value: function(callback, options) {
        this.addEventListener(
          DrawPadItemEventType.StrokeEnter,
          callback,
          options
        );
      }
    });
    Object.defineProperty(node, "onStrokeLeave", {
      value: function(callback, options) {
        this.addEventListener(
          DrawPadItemEventType.StrokeLeave,
          callback,
          options
        );
      }
    });
    Object.defineProperty(node, "isStrokeWithinBounds", {
      value: false,
      writable: true
    });
    node.onPointerDown(() => {
      if (this.isDrawingPointerDown) {
        if (node.isStrokeWithinBounds === false) {
          node.isStrokeWithinBounds = true;
          const drawPadItemEvent = {
            type: DrawPadItemEventType.StrokeEnter,
            target: node,
            ...M2c2KitHelpers.createTimestamps()
          };
          this.raiseDrawPadItemEvent(node, drawPadItemEvent);
        }
      }
    });
    node.onPointerMove(() => {
      if (this.isDrawingPointerDown) {
        if (node.isStrokeWithinBounds === false) {
          node.isStrokeWithinBounds = true;
          const drawPadItemEvent = {
            type: DrawPadItemEventType.StrokeEnter,
            target: node,
            ...M2c2KitHelpers.createTimestamps()
          };
          this.raiseDrawPadItemEvent(node, drawPadItemEvent);
        }
      }
    });
    node.onPointerLeave(() => {
      if (this.isDrawingPointerDown) {
        if (node.isStrokeWithinBounds === true) {
          node.isStrokeWithinBounds = false;
          const drawPadItemEvent = {
            type: DrawPadItemEventType.StrokeLeave,
            target: node,
            ...M2c2KitHelpers.createTimestamps()
          };
          this.raiseDrawPadItemEvent(node, drawPadItemEvent);
        }
      }
    });
    node.onPointerUp(() => {
      if (node.isStrokeWithinBounds === true) {
        node.isStrokeWithinBounds = false;
        const drawPadItemEvent = {
          type: DrawPadItemEventType.StrokeLeave,
          target: node,
          ...M2c2KitHelpers.createTimestamps()
        };
        this.raiseDrawPadItemEvent(node, drawPadItemEvent);
      }
    });
    this.addChild(node);
    node.zPosition = -1;
    node.position.x = node.position.x - this.size.width / 2;
    node.position.y = node.position.y - this.size.height / 2;
    node.isUserInteractionEnabled = true;
    return node;
  }
  /**
   * Takes a screenshot of the DrawPad.
   *
   * @returns a base64-encoded string of the DrawPad's current state in
   * PNG format.
   */
  takeScreenshot() {
    const drawArea = this.drawArea;
    if (!drawArea) {
      throw new M2Error("DrawPad.takeScreenshot(): no drawArea");
    }
    const sx = (drawArea.absolutePosition.x - drawArea.size.width / 2) * m2c2Globals.canvasScale;
    const sy = (drawArea.absolutePosition.y - drawArea.size.height / 2) * m2c2Globals.canvasScale;
    const sw = drawArea.size.width * m2c2Globals.canvasScale;
    const sh = drawArea.size.height * m2c2Globals.canvasScale;
    const imageInfo = {
      alphaType: this.game.canvasKit.AlphaType.Unpremul,
      colorType: this.game.canvasKit.ColorType.RGBA_8888,
      colorSpace: this.game.canvasKit.ColorSpace.SRGB,
      width: sw,
      height: sh
    };
    const snapshot = this.game.snapshots[0];
    const pixelData = snapshot.readPixels(sx, sy, imageInfo);
    const croppedImage = this.game.canvasKit.MakeImage(
      imageInfo,
      pixelData,
      pixelData.length / sh
    );
    if (!croppedImage) {
      throw new M2Error("DrawPad.takeScreenshot(): no croppedImage");
    }
    const bytes = croppedImage.encodeToBytes();
    if (!bytes) {
      throw new M2Error(
        "DrawPad.takeScreenshot(): croppedImage.encodeToBytes() failed"
      );
    }
    croppedImage.delete();
    return this.arrayBufferToBase64String(bytes);
  }
  /**
   * Determines whether a point is within the DrawPad.
   *
   * @param point - The point to check
   * @returns True - if the point is within the DrawPad, false otherwise
   */
  isPointWithinDrawPad(point, drawPadSize) {
    return point.x >= 0 && point.x <= drawPadSize.width && point.y >= 0 && point.y <= drawPadSize.height;
  }
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
  interpolateToDrawPadBorder(currentPoint, previousPoint, drawPadSize) {
    const slope = (currentPoint.y - previousPoint.y) / (currentPoint.x - previousPoint.x);
    const intercept = currentPoint.y - slope * currentPoint.x;
    const newPoint = { x: 0, y: 0 };
    if (!Number.isFinite(slope)) {
      newPoint.x = currentPoint.x;
      if (currentPoint.y - previousPoint.y > 0) {
        newPoint.y = drawPadSize.height;
        return newPoint;
      }
      if (currentPoint.y - previousPoint.y < 0) {
        newPoint.y = 0;
        return newPoint;
      }
    }
    const yLeft = slope * 0 + intercept;
    const yRight = slope * drawPadSize.width + intercept;
    if (yLeft >= 0 && yLeft <= drawPadSize.height) {
      if (currentPoint.x - previousPoint.x < 0) {
        newPoint.x = 0;
        newPoint.y = yLeft;
        return newPoint;
      }
    }
    if (yRight >= 0 && yRight <= drawPadSize.height) {
      if (currentPoint.x - previousPoint.x > 0) {
        newPoint.x = drawPadSize.width;
        newPoint.y = yRight;
        return newPoint;
      }
    }
    const xTop = (0 - intercept) / slope;
    const xBottom = (drawPadSize.height - intercept) / slope;
    if (xTop >= 0 && xTop <= drawPadSize.width) {
      if (currentPoint.y - previousPoint.y < 0) {
        newPoint.x = xTop;
        newPoint.y = 0;
        return newPoint;
      }
    }
    if (xBottom >= 0 && xBottom <= drawPadSize.width) {
      if (currentPoint.y - previousPoint.y > 0) {
        newPoint.x = xBottom;
        newPoint.y = drawPadSize.height;
        return newPoint;
      }
    }
    return currentPoint;
  }
  arrayBufferToBase64String(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
  get backgroundColor() {
    return this._backgroundColor;
  }
  set backgroundColor(backgroundColor) {
    this._backgroundColor = backgroundColor;
    this.needsInitialization = true;
  }
  get borderColor() {
    return this._borderColor;
  }
  set borderColor(borderColor) {
    this._borderColor = borderColor;
    this.needsInitialization = true;
  }
  get borderWidth() {
    return this._borderWidth;
  }
  set borderWidth(borderWidth) {
    this._borderWidth = borderWidth;
    this.needsInitialization = true;
  }
  get lineColor() {
    return this._lineColor;
  }
  set lineColor(lineColor) {
    this._lineColor = lineColor;
    this.needsInitialization = true;
  }
  get lineWidth() {
    return this._lineWidth;
  }
  set lineWidth(lineWidth) {
    this._lineWidth = lineWidth;
    this.needsInitialization = true;
  }
  duplicate(newName) {
    throw new M2Error(
      `DrawPad.duplicate(): Method not implemented. ${newName}`
    );
  }
}
M2c2KitHelpers.registerM2NodeClass(DrawPad);

class VirtualKeyboard extends Composite {
  /**
   * An on-screen keyboard that can be used to enter text.
   *
   * @param options - {@link VirtualKeyboardOptions}
   */
  constructor(options) {
    super(options);
    this.compositeType = "VirtualKeyboard";
    this.keyboardRows = new Array();
    this.shiftActivated = false;
    this.keyShapes = new Array();
    this.keyLabels = new Array();
    this.originalOptions = JSON.parse(JSON.stringify(options));
    if (options.isUserInteractionEnabled === void 0) {
      this._isUserInteractionEnabled = true;
    }
    this.size = options.size;
    this.position = options.position ?? { x: 0, y: 0 };
    this.keyboardHorizontalPaddingPercent = options.keyboardHorizontalPaddingPercent ?? 0.02;
    this.keyboardVerticalPaddingPercent = options.keyboardVerticalPaddingPercent ?? 0.025;
    this.keyHorizontalPaddingPercent = options.keyHorizontalPaddingPercent ?? 0.1;
    this.keyVerticalPaddingPercent = options.keyVerticalPaddingPercent ?? 0.1;
    if (options.rows !== void 0) {
      this.keyboardRows = options.rows.map((row) => {
        const internalRow = row.map((key) => {
          if (key instanceof Object && !Array.isArray(key)) {
            const internalKeyConfig = key;
            if (key.keyIconShapeOptions) {
              key.keyIconShapeOptions.suppressEvents = true;
              internalKeyConfig.keyIcon = new Shape(key.keyIconShapeOptions);
              internalKeyConfig.keyIconShapeOptions = void 0;
            }
            return internalKeyConfig;
          } else {
            return key;
          }
        });
        return internalRow;
      });
    }
    this.keysPerRow = options.keysPerRow ?? NaN;
    this.fontSize = options.fontSize ?? NaN;
    this.fontNames = options.fontNames;
    this.hiddenKeys = options.hiddenKeys ?? "";
    this.capitalLettersOnly = options.capitalLettersOnly ?? false;
    this.keyColor = options.keyColor ?? WebColors.White;
    this.keyDownColor = options.keyDownColor ?? WebColors.Transparent;
    this.specialKeyDownColor = options.specialKeyDownColor ?? WebColors.LightSteelBlue;
    this.backgroundColor = options.backgroundColor ?? [242, 240, 244, 1];
    this.showKeyDownPreview = options.showKeyDownPreview ?? true;
    this.saveNodeNewEvent();
  }
  get completeNodeOptions() {
    return {
      ...this.options,
      ...this.getNodeOptions(),
      ...this.getDrawableOptions(),
      ...this.originalOptions
    };
  }
  initialize() {
    if (this.game.eventStore.mode === EventStoreMode.Replay) {
      this._isUserInteractionEnabled = false;
    }
    if (this.keyboardRows.length === 0) {
      this.keyboardRows = this.createDefaultKeyboardRows();
      this.keysPerRow = this.keyboardRows.reduce(
        (max, row) => Math.max(max, row.length),
        0
      );
      this.fontSize = this.size.height / this.keyboardRows.length / 2.5;
    }
    const keyboardRectangle = new Shape({
      rect: { size: this.size },
      fillColor: this.backgroundColor,
      suppressEvents: true
    });
    this.addChild(keyboardRectangle);
    const keyboard = this.internalKeyboardRowsToInternalKeyboardConfiguration(
      this.keyboardRows
    );
    const keyboardOrigin = {
      x: -keyboardRectangle.size.width / 2,
      y: -keyboardRectangle.size.height / 2
    };
    const keyboardVerticalPadding = (this.keyboardVerticalPaddingPercent ?? 0.025) * this.size.height;
    const keyboardHorizontalPadding = (this.keyboardHorizontalPaddingPercent ?? 0.02) * this.size.width;
    const keyBoxHeight = (this.size.height - 2 * keyboardVerticalPadding) / keyboard.length;
    const keyBoxWidth = (this.size.width - 2 * keyboardHorizontalPadding) / this.keysPerRow;
    this.keyShapes = [];
    for (let r = 0; r < keyboard.length; r++) {
      const row = keyboard[r];
      const rowSumKeyWidths = row.reduce(
        (sum, key) => sum + (key.widthRatio ?? 1),
        0
      );
      let extraPadding = 0;
      if (rowSumKeyWidths < this.keysPerRow) {
        extraPadding = (this.size.width - 2 * keyboardHorizontalPadding - keyBoxWidth * rowSumKeyWidths) / 2;
      }
      for (let k = 0; k < row.length; k++) {
        const key = row[k];
        if (this.hiddenKeys?.split(",").map((s) => s === " " ? " " : s.trim()).includes(key.code)) {
          continue;
        }
        const keyBoxWidthsSoFar = row.slice(0, k).reduce((sum, key2) => sum + (key2.widthRatio ?? 1), 0) * keyBoxWidth;
        const keyBox = new Shape({
          rect: {
            size: {
              width: keyBoxWidth * (key.widthRatio ?? 1),
              height: keyBoxHeight
            }
          },
          fillColor: WebColors.Transparent,
          strokeColor: WebColors.Transparent,
          lineWidth: 1,
          position: {
            x: extraPadding + keyboardOrigin.x + keyboardHorizontalPadding + keyBoxWidthsSoFar + (key.widthRatio ?? 1) * keyBoxWidth / 2,
            y: keyboardOrigin.y + keyboardVerticalPadding + r * keyBoxHeight + keyBoxHeight / 2
          },
          suppressEvents: true
        });
        const keyWidth = keyBoxWidth * (key.widthRatio ?? 1) - 2 * this.keyHorizontalPaddingPercent * keyBoxWidth;
        const keyHeight = keyBoxHeight - (key.heightRatio ?? 1) - 2 * this.keyVerticalPaddingPercent * keyBoxHeight;
        const keyShape = new Shape({
          rect: { size: { width: keyWidth, height: keyHeight } },
          cornerRadius: 4,
          fillColor: this.keyColor,
          lineWidth: 0,
          isUserInteractionEnabled: this.isUserInteractionEnabled,
          suppressEvents: true
        });
        keyShape.userData = { code: key.code };
        keyBox.addChild(keyShape);
        this.keyShapes.push(keyShape);
        const keyLabel = new Label({
          text: key.labelText,
          fontSize: this.fontSize,
          fontNames: this.fontNames,
          suppressEvents: true
        });
        keyLabel.userData = { code: key.code };
        keyBox.addChild(keyLabel);
        this.keyLabels.push(keyLabel);
        if (key.keyIcon) {
          keyBox.addChild(key.keyIcon);
        }
        keyboardRectangle.addChild(keyBox);
        keyShape.onTapUp((tapEvent) => {
          this.handleKeyShapeTapUp(key, keyShape, tapEvent);
        });
        keyShape.onTapDown((tapEvent) => {
          this.handleKeyShapeTapDown(key, keyShape, tapEvent);
        });
        keyShape.onTapLeave((tapEvent) => {
          this.handleKeyShapeTapLeave(key, keyShape, tapEvent);
        });
      }
    }
    this.letterCircle = new Shape({
      circleOfRadius: 28,
      fillColor: WebColors.Silver,
      hidden: true,
      suppressEvents: true
    });
    keyboardRectangle.addChild(this.letterCircle);
    this.letterCircleLabel = new Label({
      text: "",
      fontSize: this.fontSize,
      fontNames: this.fontNames,
      suppressEvents: true
    });
    this.letterCircle.addChild(this.letterCircleLabel);
    this.needsInitialization = false;
  }
  /**
   * Executes a callback when the user presses down on a key.
   *
   * @param callback - function to execute
   * @param options
   */
  onKeyDown(callback, options) {
    const eventListener = {
      type: M2EventType.Composite,
      compositeEventType: "VirtualKeyboardKeyDown",
      compositeType: this.compositeType,
      nodeUuid: this.uuid,
      callback
    };
    this.addVirtualKeyboardEventListener(eventListener, options);
  }
  /**
   * Executes a callback when the user releases a key.
   *
   * @param callback - function to execute
   * @param options
   */
  onKeyUp(callback, options) {
    const eventListener = {
      type: M2EventType.Composite,
      compositeEventType: "VirtualKeyboardKeyUp",
      compositeType: this.compositeType,
      nodeUuid: this.uuid,
      callback
    };
    this.addVirtualKeyboardEventListener(eventListener, options);
  }
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
  onKeyLeave(callback, options) {
    const eventListener = {
      type: M2EventType.Composite,
      compositeEventType: "VirtualKeyboardKeyLeave",
      compositeType: this.compositeType,
      nodeUuid: this.uuid,
      callback
    };
    this.addVirtualKeyboardEventListener(eventListener, options);
  }
  update() {
    super.update();
  }
  draw(canvas) {
    super.drawChildren(canvas);
  }
  warmup(canvas) {
    this.initialize();
    this.children.filter((child) => child.isDrawable).forEach((child) => {
      child.warmup(canvas);
    });
  }
  duplicate(newName) {
    throw new M2Error(`Method not implemented. ${newName}`);
  }
  handleKeyShapeTapDown(key, keyShape, tapEvent) {
    if (key.isShift) {
      this.shiftActivated = !this.shiftActivated;
    }
    const keyAsString = this.getKeyAsString(key);
    const virtualKeyboardEvent = {
      type: M2EventType.Composite,
      compositeType: "VirtualKeyboard",
      compositeEventType: "VirtualKeyboardKeyDown",
      target: this,
      handled: false,
      key: keyAsString,
      code: key.code,
      shiftKey: this.shiftActivated,
      keyTapMetadata: {
        size: keyShape.size,
        point: tapEvent.point,
        buttons: tapEvent.buttons
      },
      ...M2c2KitHelpers.createTimestamps()
    };
    this.handleCompositeEvent(virtualKeyboardEvent);
    this.saveEvent(virtualKeyboardEvent);
    if (this.eventListeners.length > 0) {
      this.eventListeners.filter(
        (listener) => listener.type === M2EventType.Composite && listener.compositeType === "VirtualKeyboard" && listener.compositeEventType === "VirtualKeyboardKeyDown"
      ).forEach((listener) => {
        listener.callback(virtualKeyboardEvent);
      });
    }
  }
  handleKeyShapeTapUp(key, keyShape, tapEvent) {
    const keyAsString = this.getKeyAsString(key);
    const virtualKeyboardEvent = {
      type: M2EventType.Composite,
      compositeType: "VirtualKeyboard",
      compositeEventType: "VirtualKeyboardKeyUp",
      target: this,
      handled: false,
      key: keyAsString,
      code: key.code,
      shiftKey: this.shiftActivated,
      keyTapMetadata: {
        size: keyShape.size,
        point: tapEvent.point,
        buttons: tapEvent.buttons
      },
      ...M2c2KitHelpers.createTimestamps()
    };
    this.handleCompositeEvent(virtualKeyboardEvent);
    this.saveEvent(virtualKeyboardEvent);
    if (this.eventListeners.length > 0) {
      this.eventListeners.filter(
        (listener) => listener.type === M2EventType.Composite && listener.compositeType === "VirtualKeyboard" && listener.compositeEventType === "VirtualKeyboardKeyUp"
      ).forEach((listener) => {
        listener.callback(virtualKeyboardEvent);
      });
    }
  }
  handleKeyShapeTapLeave(key, keyShape, tapEvent) {
    const keyAsString = this.getKeyAsString(key);
    const virtualKeyboardEvent = {
      type: M2EventType.Composite,
      compositeType: "VirtualKeyboard",
      compositeEventType: "VirtualKeyboardKeyLeave",
      target: this,
      handled: false,
      key: keyAsString,
      code: key.code,
      shiftKey: this.shiftActivated,
      keyTapMetadata: {
        size: keyShape.size,
        point: tapEvent.point,
        buttons: tapEvent.buttons
      },
      ...M2c2KitHelpers.createTimestamps()
    };
    this.handleCompositeEvent(virtualKeyboardEvent);
    this.saveEvent(virtualKeyboardEvent);
    if (this.eventListeners.length > 0) {
      this.eventListeners.filter(
        (listener) => listener.type === M2EventType.Composite && listener.compositeType === "VirtualKeyboard" && listener.compositeEventType === "VirtualKeyboardKeyLeave"
      ).forEach((listener) => {
        listener.callback(virtualKeyboardEvent);
      });
    }
  }
  getKeyAsString(key) {
    if (key.isShift || key.code === " " || key.code === "Backspace") {
      return key.code;
    } else {
      if (this.shiftActivated) {
        return key.labelTextShifted ?? key.code;
      } else {
        return key.labelText ?? key.code;
      }
    }
  }
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
  internalKeyboardRowsToInternalKeyboardConfiguration(keyboardRows) {
    return keyboardRows.map((row) => {
      return row.map((key) => {
        let widthRatio = 1;
        const heightRatio = 1;
        let code;
        let label;
        let labelShifted;
        let keyIcon;
        let isShift = false;
        if (typeof key === "string") {
          code = key;
          if (this.capitalLettersOnly) {
            label = code.toUpperCase();
          } else {
            label = code;
          }
          labelShifted = code.toUpperCase();
        } else if (Array.isArray(key)) {
          code = key[0];
          label = code;
          labelShifted = key[1];
        } else {
          code = key.code;
          label = key.labelText ?? "";
          labelShifted = key.labelTextShifted ?? label;
          widthRatio = key.widthRatio ?? 1;
          keyIcon = key.keyIcon;
          isShift = key.isShift ?? false;
        }
        return {
          widthRatio,
          heightRatio,
          code,
          labelText: label,
          labelTextShifted: labelShifted,
          keyIcon,
          isShift
        };
      });
    });
  }
  handleCompositeEvent(event) {
    const keyboard = this.internalKeyboardRowsToInternalKeyboardConfiguration(
      this.keyboardRows
    );
    const keyShape = this.keyShapes.find((k) => k.userData.code === event.code);
    if (!keyShape) {
      throw new M2Error("keyShape is not defined");
    }
    this.shiftActivated = event.shiftKey;
    switch (event.compositeEventType) {
      case "VirtualKeyboardKeyDown": {
        this.handleKeyDownEvent(event, keyboard, keyShape);
        break;
      }
      case "VirtualKeyboardKeyUp": {
        this.handleKeyUpEvent(event, keyboard, keyShape);
        break;
      }
      case "VirtualKeyboardKeyLeave": {
        this.handleKeyLeaveEvent(event, keyboard, keyShape);
        break;
      }
      default: {
        throw new M2Error(
          `Unknown VirtualKeyboardEvent: ${event.compositeEventType}`
        );
      }
    }
  }
  handleKeyDownEvent(event, keyboard, keyShape) {
    if (event.code.toLowerCase().includes("shift")) {
      if (event.shiftKey) {
        this.showKeyboardShifted(keyboard);
      } else {
        this.showKeyboardNotShifted(keyboard);
      }
    } else if (event.code === " " || event.code === "Backspace") {
      keyShape.fillColor = this.specialKeyDownColor;
    } else {
      keyShape.fillColor = this.keyDownColor;
      if (this.showKeyDownPreview) {
        if (!this.letterCircle || !this.letterCircleLabel) {
          throw new M2Error("letterCircle is not defined");
        }
        this.letterCircle.hidden = false;
        const keyBox = keyShape.parent;
        this.letterCircle.position.x = keyBox.position.x;
        if (keyShape.rect?.size?.height === void 0) {
          throw new M2Error("keyShape.rect.height is undefined");
        }
        this.letterCircle.position.y = keyBox.position.y - keyShape.rect.size.height * 1.2;
        const keyboard2 = this.internalKeyboardRowsToInternalKeyboardConfiguration(
          this.keyboardRows
        );
        const key = keyboard2.flat().find((k) => k.code === event.code);
        if (!key) {
          throw new M2Error("key is not defined");
        }
        if (this.shiftActivated) {
          this.letterCircleLabel.text = key.labelTextShifted ?? key.code;
        } else {
          this.letterCircleLabel.text = key.labelText ?? key.code;
        }
      }
    }
  }
  handleKeyUpEvent(event, keyboard, keyShape) {
    if (event.code.toLowerCase().includes("shift") && event.shiftKey) {
      return;
    }
    if (event.code.toLowerCase().includes("shift") && !event.shiftKey) {
      this.shiftActivated = false;
      this.showKeyboardNotShifted(keyboard);
      return;
    }
    keyShape.fillColor = this.keyColor;
    if (!this.letterCircle) {
      throw new M2Error("letterCircle is not defined");
    }
    this.letterCircle.hidden = true;
    if (!event.code.toLowerCase().includes("shift") && event.shiftKey) {
      this.shiftActivated = false;
      this.showKeyboardNotShifted(keyboard);
    }
  }
  handleKeyLeaveEvent(event, keyboard, keyShape) {
    if (event.code.toLowerCase().includes("shift")) {
      if (event.shiftKey) {
        this.showKeyboardNotShifted(keyboard);
        this.shiftActivated = false;
      } else {
        this.showKeyboardShifted(keyboard);
        this.shiftActivated = true;
      }
      return;
    }
    keyShape.fillColor = this.keyColor;
    if (!this.letterCircle) {
      throw new M2Error("letterCircle is not defined");
    }
    this.letterCircle.hidden = true;
  }
  showKeyboardShifted(keyboard) {
    const shiftKeyShapes = this.keyShapes.filter(
      (shape) => shape.userData.code.toLowerCase().includes("shift")
    );
    shiftKeyShapes.forEach((shape) => {
      shape.fillColor = this.specialKeyDownColor;
    });
    const shiftKeys = keyboard.flat().filter((k) => k.isShift);
    shiftKeys.forEach((k) => {
      if (k.keyIcon) {
        k.keyIcon.fillColor = WebColors.Black;
      }
    });
    keyboard.flatMap((k) => k).forEach((k) => {
      const keyLabel = this.keyLabels.find((l) => l.userData.code === k.code);
      if (!keyLabel) {
        throw new M2Error("keyLabel is not defined");
      }
      if (keyLabel.text !== void 0) {
        keyLabel.text = k.labelTextShifted ?? "";
      }
    });
  }
  showKeyboardNotShifted(keyboard) {
    const shiftKeyShapes = this.keyShapes.filter(
      (shape) => shape.userData.code.toLowerCase().includes("shift")
    );
    shiftKeyShapes.forEach((shape) => {
      shape.fillColor = this.keyColor;
    });
    const shiftKeys = keyboard.flat().filter((k) => k.isShift);
    shiftKeys.forEach((k) => {
      if (k.keyIcon) {
        k.keyIcon.fillColor = WebColors.Transparent;
      }
    });
    keyboard.flatMap((k) => k).forEach((k) => {
      const keyLabel = this.keyLabels.find((l) => l.userData.code === k.code);
      if (!keyLabel) {
        throw new M2Error("keyLabel is not defined");
      }
      if (keyLabel.text !== void 0) {
        keyLabel.text = k.labelText ?? "";
      }
    });
  }
  createDefaultKeyboardRows() {
    const numKeys = [
      ["1", "!"],
      ["2", "@"],
      ["3", "#"],
      ["4", "$"],
      ["5", "%"],
      ["6", "^"],
      ["7", "&"],
      ["8", "*"],
      ["9", "("],
      ["0", ")"]
    ];
    const row1 = [
      "q",
      "w",
      "e",
      "r",
      "t",
      "y",
      "u",
      "i",
      "o",
      "p"
    ];
    const row2 = [
      "a",
      "s",
      "d",
      "f",
      "g",
      "h",
      "j",
      "k",
      "l"
    ];
    const shiftArrowShapeOptions = {
      path: {
        // Public Domain from https://www.freesvg.org
        pathString: "m288-6.6849e-14 -288 288h144v288h288v-288h144l-288-288z",
        width: 24
      },
      lineWidth: 2,
      strokeColor: WebColors.Black,
      fillColor: WebColors.Transparent,
      suppressEvents: true
    };
    const backspaceShapeOptions = {
      path: {
        // CC0 from https://www.svgrepo.com
        pathString: "M10.625 5.09 0 22.09l10.625 17H44.18v-34H10.625zm31.555 32H11.734l-9.375-15 9.375-15H42.18v30zm-23.293-6.293 7.293-7.293 7.293 7.293 1.414-1.414-7.293-7.293 7.293-7.293-1.414-1.414-7.293 7.293-7.293-7.293-1.414 1.414 7.293 7.293-7.293 7.293",
        width: 24
      },
      lineWidth: 1,
      strokeColor: WebColors.Black,
      fillColor: WebColors.Red,
      suppressEvents: true
    };
    const row3 = [
      {
        code: "Shift",
        isShift: true,
        widthRatio: 1.5,
        keyIcon: new Shape(shiftArrowShapeOptions)
      },
      "z",
      "x",
      "c",
      "v",
      "b",
      "n",
      "m",
      {
        code: "Backspace",
        widthRatio: 1.5,
        keyIcon: new Shape(backspaceShapeOptions)
      }
    ];
    const row4 = [
      { code: " ", labelText: "SPACE", widthRatio: 5 }
    ];
    const keyboardRows = [numKeys, row1, row2, row3, row4];
    return keyboardRows;
  }
  addVirtualKeyboardEventListener(eventListener, options) {
    if (options?.replaceExisting) {
      this.eventListeners = this.eventListeners.filter(
        (listener) => !(listener.nodeUuid === eventListener.nodeUuid && listener.type === eventListener.type && listener.compositeType === eventListener.compositeType)
      );
    }
    this.eventListeners.push(eventListener);
  }
  /**
   * Does the `VirtualKeyboard` respond to user events? Default is true.
   */
  get isUserInteractionEnabled() {
    return this._isUserInteractionEnabled;
  }
  /**
   * Does the `VirtualKeyboard` respond to user events? Default is true.
   */
  set isUserInteractionEnabled(isUserInteractionEnabled) {
    this._isUserInteractionEnabled = isUserInteractionEnabled;
    this.keyShapes?.forEach((keyShape) => {
      keyShape.isUserInteractionEnabled = isUserInteractionEnabled;
    });
  }
}
M2c2KitHelpers.registerM2NodeClass(
  VirtualKeyboard
);

const SCENE_TRANSITION_EASING$1 = Easings.sinusoidalInOut;
const SCENE_TRANSITION_DURATION = 500;
class Instructions extends Story {
  /**
   * Creates an array of scenes containing instructions on how to complete the assessment
   *
   * @param options - {@link InstructionsOptions}
   * @returns instruction scenes
   */
  static create(options) {
    const scenes = new Array();
    options.instructionScenes.forEach((s, i) => {
      const nextSceneTransition = s.nextSceneTransition ?? options.nextSceneTransition ?? Transition.slide({
        direction: TransitionDirection.Left,
        duration: SCENE_TRANSITION_DURATION,
        easing: SCENE_TRANSITION_EASING$1
      });
      const backSceneTransition = s.backSceneTransition ?? options.backSceneTransition ?? Transition.slide({
        direction: TransitionDirection.Right,
        duration: SCENE_TRANSITION_DURATION,
        easing: SCENE_TRANSITION_EASING$1
      });
      const backButtonText = s.backButtonText ?? options.backButtonText ?? "Back";
      const backButtonTextInterpolation = s.backButtonTextInterpolation ?? options.backButtonTextInterpolation;
      const nextButtonText = s.nextButtonText ?? options.nextButtonText ?? "Next";
      const nextButtonTextInterpolation = s.nextButtonTextInterpolation ?? options.nextButtonTextInterpolation;
      const backButtonWidth = s.backButtonWidth ?? options.backButtonWidth ?? 125;
      const nextButtonWidth = s.nextButtonWidth ?? options.nextButtonWidth ?? 125;
      const backButtonHeight = s.backButtonHeight ?? options.backButtonHeight ?? 50;
      const nextButtonHeight = s.nextButtonHeight ?? options.nextButtonHeight ?? 50;
      const backgroundColor = s.backgroundColor ?? options.backgroundColor;
      const imageAboveText = s.imageAboveText ?? true;
      const imageMarginTop = s.imageMarginTop ?? 0;
      const imageMarginBottom = s.imageMarginBottom ?? 0;
      const textMarginStart = s.textMarginStart ?? 48;
      const textMarginEnd = s.textMarginEnd ?? 48;
      const textAlignmentMode = s.textAlignmentMode ?? LabelHorizontalAlignmentMode.Left;
      const textFontSize = s.textFontSize ?? 16;
      const titleFontSize = s.titleFontSize ?? 16;
      const titleMarginTop = s.titleMarginTop ?? 48;
      const backButtonBackgroundColor = s.backButtonBackgroundColor ?? options.backButtonBackgroundColor ?? WebColors.Black;
      const backButtonFontColor = s.backButtonFontColor ?? options.backButtonFontColor ?? WebColors.White;
      const nextButtonBackgroundColor = s.nextButtonBackgroundColor ?? options.nextButtonBackgroundColor ?? WebColors.Black;
      const nextButtonFontColor = s.nextButtonFontColor ?? options.nextButtonFontColor ?? WebColors.White;
      const sceneNamePrefix = options.sceneNamePrefix ?? "instructions";
      const scene = new Scene({
        name: sceneNamePrefix + "-" + (i + 1).toString().padStart(2, "0"),
        backgroundColor
      });
      let titleLabel;
      if (s.title !== void 0) {
        titleLabel = new Label({
          text: s.title,
          interpolation: s.titleInterpolation,
          fontSize: titleFontSize,
          layout: {
            marginTop: titleMarginTop,
            constraints: {
              topToTopOf: scene,
              startToStartOf: scene,
              endToEndOf: scene
            }
          }
        });
        scene.addChild(titleLabel);
      }
      let textLabel;
      if (s.text !== void 0) {
        textLabel = new Label({
          text: s.text,
          interpolation: s.textInterpolation,
          preferredMaxLayoutWidth: Dimensions.MatchConstraint,
          horizontalAlignmentMode: textAlignmentMode,
          fontSize: textFontSize,
          layout: {
            marginStart: textMarginStart,
            marginEnd: textMarginEnd,
            constraints: {
              topToTopOf: scene,
              bottomToBottomOf: scene,
              startToStartOf: scene,
              endToEndOf: scene,
              verticalBias: s.textVerticalBias
            }
          }
        });
        scene.addChild(textLabel);
      }
      if (s.imageName !== void 0) {
        let image;
        if (textLabel !== void 0) {
          if (imageAboveText) {
            image = new Sprite({
              imageName: s.imageName,
              layout: {
                marginBottom: imageMarginBottom,
                constraints: {
                  bottomToTopOf: textLabel,
                  startToStartOf: scene,
                  endToEndOf: scene
                }
              }
            });
          } else {
            image = new Sprite({
              imageName: s.imageName,
              layout: {
                marginTop: imageMarginTop,
                constraints: {
                  topToBottomOf: textLabel,
                  startToStartOf: scene,
                  endToEndOf: scene
                }
              }
            });
          }
        } else {
          image = new Sprite({
            imageName: s.imageName,
            layout: {
              constraints: {
                topToTopOf: scene,
                bottomToBottomOf: scene,
                verticalBias: s.imageVerticalBias,
                startToStartOf: scene,
                endToEndOf: scene
              }
            }
          });
        }
        scene.addChild(image);
      }
      if (i > 0) {
        const backButton = new Button({
          name: "backButton",
          text: backButtonText,
          interpolation: backButtonTextInterpolation,
          fontColor: backButtonFontColor,
          backgroundColor: backButtonBackgroundColor,
          size: { width: backButtonWidth, height: backButtonHeight },
          layout: {
            marginStart: 32,
            marginBottom: 80,
            constraints: { bottomToBottomOf: scene, startToStartOf: scene }
          }
        });
        backButton.isUserInteractionEnabled = true;
        backButton.onTapDown(() => {
          scene.game.presentScene(
            sceneNamePrefix + "-" + (i + 1 - 1).toString().padStart(2, "0"),
            backSceneTransition
          );
        });
        scene.addChild(backButton);
      }
      const nextButton = new Button({
        name: "nextButton",
        text: nextButtonText,
        interpolation: nextButtonTextInterpolation,
        fontColor: nextButtonFontColor,
        backgroundColor: nextButtonBackgroundColor,
        size: { width: nextButtonWidth, height: nextButtonHeight },
        layout: {
          marginEnd: 32,
          marginBottom: 80,
          constraints: { bottomToBottomOf: scene, endToEndOf: scene }
        }
      });
      nextButton.isUserInteractionEnabled = true;
      if (i !== options.instructionScenes.length - 1) {
        nextButton.onTapDown(() => {
          scene.game.presentScene(
            sceneNamePrefix + "-" + (i + 1 + 1).toString().padStart(2, "0"),
            nextSceneTransition
          );
        });
      } else {
        if (options.postInstructionsScene !== void 0) {
          nextButton.onTapDown(() => {
            scene.game.presentScene(
              options.postInstructionsScene ?? "",
              nextSceneTransition
            );
          });
        } else {
          nextButton.onTapDown(() => {
            const sceneIndex = scene.game.scenes.indexOf(scene);
            if (sceneIndex === -1) {
              console.warn(
                "warning: postInstructionsScene is not defined, and next scene cannot be determined."
              );
            } else {
              const nextSceneIndex = sceneIndex + 1;
              if (nextSceneIndex < scene.game.scenes.length) {
                scene.game.presentScene(
                  scene.game.scenes[nextSceneIndex],
                  nextSceneTransition
                );
              } else {
                console.warn(
                  "warning: postInstructionsScene is not defined, and there is no next scene to present."
                );
              }
            }
          });
        }
      }
      scene.addChild(nextButton);
      scenes.push(scene);
    });
    return scenes;
  }
  /**
   * Creates an array of scenes containing instructions on how to complete the assessment
   *
   * @deprecated Use {@link Instructions.create} instead (lower case method name "create")
   *
   * @param options - {@link InstructionsOptions}
   * @returns instruction scenes
   */
  static Create(options) {
    return this.create(options);
  }
}

const SCENE_TRANSITION_EASING = Easings.sinusoidalInOut;
const SCENE_TRANSITION_DURATION_MS = 500;
class CountdownScene extends Scene {
  /**
   * A scene that counts down from a specified number to zero, then transitions to the next scene.
   *
   * @param options - {@link CountdownSceneOptions}
   */
  constructor(options) {
    super(options);
    if (options?.transitionDurationMilliseconds !== void 0 && options?.transition) {
      throw new M2Error(
        "Both transition and transitionDurationMilliseconds options were provided. Only one should be provided. If using a custom transition, then the duration of that transition must be specified within the custom transition."
      );
    }
    let timerShape;
    if (options?.timerShape?.circle === void 0 && options?.timerShape?.rectangle === void 0 || options?.timerShape.circle !== void 0) {
      timerShape = new Shape({
        circleOfRadius: options?.timerShape?.circle?.radius ?? 100,
        layout: {
          constraints: {
            topToTopOf: this,
            bottomToBottomOf: this,
            startToStartOf: this,
            endToEndOf: this,
            verticalBias: options?.shapeVerticalBias ?? 0.5
          }
        },
        fillColor: options?.timerShape?.fillColor ?? WebColors.RoyalBlue
      });
      this.addChild(timerShape);
    } else if (options?.timerShape.rectangle !== void 0) {
      timerShape = new Shape({
        rect: {
          width: options?.timerShape?.rectangle?.width ?? 200,
          height: options?.timerShape?.rectangle?.height ?? 200
        },
        cornerRadius: options?.timerShape?.rectangle?.cornerRadius,
        layout: {
          constraints: {
            topToTopOf: this,
            bottomToBottomOf: this,
            startToStartOf: this,
            endToEndOf: this,
            verticalBias: options.shapeVerticalBias ?? 0.5
          }
        },
        fillColor: options?.timerShape?.fillColor ?? WebColors.RoyalBlue
      });
      this.addChild(timerShape);
    } else {
      throw new M2Error("Invalid timer shape options.");
    }
    const timerInitialNumber = Math.floor(options.milliseconds / 1e3);
    const timerNumberLabel = new Label({
      // Number text will be set in onSetup()
      text: "",
      fontSize: options?.timerNumbersFontSize ?? 50,
      fontName: options?.timerNumbersFontName,
      fontColor: options?.timerNumbersFontColor ?? WebColors.White
    });
    timerShape.addChild(timerNumberLabel);
    const textLabel = new Label({
      text: options?.text ?? "GET READY",
      fontSize: options?.textFontSize ?? 50,
      fontName: options?.textFontName,
      fontColor: options?.textFontColor,
      layout: {
        marginTop: options?.textMarginTop ?? 32,
        constraints: {
          topToBottomOf: timerShape,
          startToStartOf: this,
          endToEndOf: this
        }
      }
    });
    this.addChild(textLabel);
    const countdownSequence = new Array();
    for (let i = timerInitialNumber - 1; i > 0; i--) {
      countdownSequence.push(Action.wait({ duration: 1e3 }));
      countdownSequence.push(
        Action.custom({
          callback: () => {
            timerNumberLabel.text = i.toString();
          }
        })
      );
    }
    countdownSequence.push(Action.wait({ duration: 1e3 }));
    countdownSequence.push(
      Action.custom({
        callback: () => {
          timerNumberLabel.text = options?.zeroString ?? "0";
        }
      })
    );
    if (options?.zeroDwellMilliseconds !== void 0) {
      countdownSequence.push(
        Action.wait({ duration: options.zeroDwellMilliseconds })
      );
    }
    countdownSequence.push(
      Action.custom({
        callback: () => {
          const game = this.game;
          const isLastScene = game.scenes.indexOf(this) === game.scenes.length - 1;
          if (isLastScene) {
            game.end();
          }
          const nextScene = game.scenes[game.scenes.indexOf(this) + 1];
          game.presentScene(
            nextScene,
            options?.transition ?? Transition.slide({
              direction: TransitionDirection.Left,
              duration: options?.transitionDurationMilliseconds ?? SCENE_TRANSITION_DURATION_MS,
              easing: SCENE_TRANSITION_EASING
            })
          );
        }
      })
    );
    this.onSetup(() => {
      timerNumberLabel.text = timerInitialNumber.toString();
    });
    this.onAppear(() => {
      this.run(Action.sequence(countdownSequence));
    });
  }
}

class LocalePicker extends Composite {
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
  constructor(options) {
    super(options);
    this.compositeType = "LocalePicker";
    this.DEFAULT_FONT_SIZE = 24;
    this.automaticallyChangeLocale = true;
    this._localeOptions = new Array();
    this._backgroundColor = WebColors.White;
    this._fontSize = this.DEFAULT_FONT_SIZE;
    this._fontColor = WebColors.Black;
    this._cornerRadius = 8;
    this._overlayAlpha = 0.5;
    this._icon = {
      // public domain SVG from https://commons.wikimedia.org/wiki/File:Globe_icon.svg
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" stroke="#000" fill="none"><path stroke-width="26" d="M209 15a195 195 0 1 0 2 0z"/><path stroke-width="18" d="M210 15v390m195-195H15M59 90a260 260 0 0 0 302 0m0 240a260 260 0 0 0-302 0M195 20a250 250 0 0 0 0 382m30 0a250 250 0 0 0 0-382"/></svg>`,
      height: 32,
      width: 32
    };
    this._iconPosition = { x: 32, y: 32 };
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
    this.LEFT_SELECTION_INDICATOR = "\xAB";
    this.RIGHT_SELECTION_INDICATOR = "\xBB";
    this.zPosition = Number.MAX_VALUE;
    if (!options) {
      return;
    }
    if (options.localeOptions) {
      this.localeOptions = options.localeOptions;
    }
    if (options.backgroundColor) {
      this.backgroundColor = options.backgroundColor;
    }
    if (options.overlayAlpha !== void 0) {
      this.overlayAlpha = options.overlayAlpha;
    }
    if (options.fontSize !== void 0) {
      this.fontSize = options.fontSize;
    }
    if (options.fontColor) {
      this.fontColor = options.fontColor;
    }
    if (options.cornerRadius) {
      this.cornerRadius = options.cornerRadius;
    }
    if (options.currentLocale !== void 0) {
      this.currentLocale = options.currentLocale;
    }
    if (options.icon) {
      this.icon = options.icon;
    }
    if (options.automaticallyChangeLocale !== void 0) {
      this.automaticallyChangeLocale = options.automaticallyChangeLocale;
    }
  }
  /**
   * Executes a callback when the user selects a locale.
   *
   * @param callback - function to execute
   * @param options - {@link CallbackOptions}
   */
  onResult(callback, options) {
    const eventListener = {
      type: M2EventType.Composite,
      compositeType: "LocalePickerResult",
      nodeUuid: this.uuid,
      callback
    };
    if (options?.replaceExisting) {
      this.eventListeners = this.eventListeners.filter(
        (listener) => !(listener.nodeUuid === eventListener.nodeUuid && listener.type === "LocalePickerResult")
      );
    }
    this.eventListeners.push(eventListener);
  }
  initialize() {
    if (this.currentLocale === void 0) {
      this.currentLocale = this.game.i18n?.locale;
    }
    if (this.localeOptions.length === 0) {
      const locales = Object.keys(this.game.i18n?.translation || {});
      locales.filter((locale) => locale !== "configuration").forEach((locale) => {
        this.localeOptions.push({
          text: this.game.i18n?.translation[locale].localeName || locale,
          locale,
          svg: this.game.i18n?.translation[locale].localeSvg
        });
      });
    }
    if (this.localeOptions.length === 0) {
      throw new M2Error("No locales available for LocalePicker");
    }
    this.children.filter((child) => child.name !== "localePickerIcon").forEach((child) => this.removeChild(child));
    this.game.imageManager.loadImages([
      {
        imageName: "__localePickerIcon",
        svgString: this.icon.svgString,
        height: this.icon.height,
        width: this.icon.width
      }
    ]);
    if (!this.iconSprite) {
      this.iconSprite = new Sprite({
        // name is how we refer to this sprite, as a node.
        name: "localePickerIcon",
        // imageName is the loaded image that we can assign to the sprite
        imageName: "__localePickerIcon",
        position: this.iconPosition,
        isUserInteractionEnabled: true
      });
      this.addChild(this.iconSprite);
      this.iconSprite.onTapDown((e) => {
        e.handled = true;
        this.setDialogVisibility(true);
      });
      this.iconSprite.onTapUp((e) => {
        e.handled = true;
      });
      this.iconSprite.onTapUpAny((e) => {
        e.handled = true;
      });
      this.iconSprite.onPointerUp((e) => {
        e.handled = true;
      });
      this.iconSprite.onPointerDown((e) => {
        e.handled = true;
      });
    }
    const overlay = new Shape({
      rect: {
        width: m2c2Globals.canvasCssWidth,
        height: m2c2Globals.canvasCssHeight,
        x: m2c2Globals.canvasCssWidth / 2,
        y: m2c2Globals.canvasCssHeight / 2
      },
      fillColor: [0, 0, 0, this.overlayAlpha],
      zPosition: -1,
      isUserInteractionEnabled: true,
      hidden: true
    });
    overlay.onTapUp((e) => {
      e.handled = true;
      if (this.eventListeners.length > 0) {
        this.eventListeners.filter((listener) => listener.type === "LocalePickerResult").forEach((listener) => {
          const languagePickerEvent = {
            type: M2EventType.Composite,
            compositeType: this.compositeType,
            compositeEventType: "LocalePickerResult",
            target: this,
            handled: false,
            result: {
              locale: void 0
            },
            timestamp: Timer.now(),
            iso8601Timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
          listener.callback(languagePickerEvent);
        });
      }
      this.setDialogVisibility(false);
    });
    overlay.onTapUpAny((e) => {
      e.handled = true;
    });
    overlay.onTapDown((e) => {
      e.handled = true;
    });
    overlay.onPointerUp((e) => {
      e.handled = true;
    });
    overlay.onPointerDown((e) => {
      e.handled = true;
    });
    this.addChild(overlay);
    const lineHeight = this.fontSize / this.DEFAULT_FONT_SIZE * 50;
    const dialogHeight = this.localeOptions.length * lineHeight;
    const dialogWidth = m2c2Globals.canvasCssWidth / 2;
    const sceneCenter = {
      x: m2c2Globals.canvasCssWidth / 2,
      y: m2c2Globals.canvasCssHeight / 2
    };
    const localeDialog = new Shape({
      rect: {
        width: dialogWidth,
        height: dialogHeight,
        x: sceneCenter.x,
        y: sceneCenter.y
      },
      cornerRadius: this.cornerRadius,
      fillColor: this.backgroundColor,
      isUserInteractionEnabled: true,
      hidden: true
    });
    localeDialog.onTapDown((e) => {
      e.handled = true;
    });
    localeDialog.onTapUp((e) => {
      e.handled = true;
    });
    localeDialog.onTapUpAny((e) => {
      e.handled = true;
    });
    localeDialog.onPointerUp((e) => {
      e.handled = true;
    });
    localeDialog.onPointerDown((e) => {
      e.handled = true;
    });
    this.addChild(localeDialog);
    for (let i = 0; i < this.localeOptions.length; i++) {
      const localeOption = this.localeOptions[i];
      if (!localeOption.svg) {
        let labelText = localeOption.text;
        if (this.currentLocale === localeOption.locale) {
          labelText = `${this.LEFT_SELECTION_INDICATOR} ${labelText} ${this.RIGHT_SELECTION_INDICATOR}`;
        }
        const text = new Label({
          text: labelText,
          fontSize: this.fontSize,
          fontColor: this.fontColor,
          position: {
            x: sceneCenter.x,
            y: sceneCenter.y + i * lineHeight - dialogHeight / 2 + lineHeight / 2
          },
          isUserInteractionEnabled: true,
          zPosition: 1,
          hidden: true,
          // do not localize the text of each language option
          localize: false
        });
        text.onTapUp((e) => {
          e.handled = true;
          this.handleLocaleSelection(e, localeOption);
        });
        text.onTapUpAny((e) => {
          e.handled = true;
        });
        text.onTapDown((e) => {
          e.handled = true;
        });
        text.onPointerUp((e) => {
          e.handled = true;
        });
        text.onPointerDown((e) => {
          e.handled = true;
        });
        this.addChild(text);
      } else {
        this.game.imageManager.loadImages([
          {
            imageName: localeOption.text,
            svgString: localeOption.svg.svgString,
            height: localeOption.svg.height,
            width: localeOption.svg.width
          }
        ]);
        const localeSprite = new Sprite({
          imageName: localeOption.text,
          position: {
            x: sceneCenter.x,
            y: sceneCenter.y + i * lineHeight - dialogHeight / 2 + lineHeight / 2
          },
          isUserInteractionEnabled: true,
          zPosition: 1,
          hidden: true
        });
        this.addChild(localeSprite);
        if (this.currentLocale === localeOption.locale) {
          const leftSelectionIndicator = new Label({
            text: this.LEFT_SELECTION_INDICATOR,
            fontSize: this.fontSize,
            fontColor: this.fontColor,
            /**
             * We subtract half the fontSize from the x position via
             * "- this.fontSize / 2" so that the left selection indicator is
             * positioned slightly to the left of the svg text. Half the font
             * size seems to be a good amount to make the left selection
             * indicator appear before the text, and it will scale with font
             * size changes (unlike a hard-coded value).
             */
            position: {
              x: sceneCenter.x - localeOption.svg.width / 2 - this.fontSize / 2,
              y: sceneCenter.y + i * lineHeight - dialogHeight / 2 + lineHeight / 2
            },
            hidden: true,
            // do not localize the left selection indicator
            localize: false
          });
          this.addChild(leftSelectionIndicator);
          const rightSelectionIndicator = new Label({
            text: this.RIGHT_SELECTION_INDICATOR,
            fontSize: this._fontSize,
            fontColor: this.fontColor,
            position: {
              // see above explanation of "- this.fontSize / 2"
              x: sceneCenter.x + localeOption.svg.width / 2 + this.fontSize / 2,
              y: sceneCenter.y + i * lineHeight - dialogHeight / 2 + lineHeight / 2
            },
            hidden: true,
            // do not localize the left selection indicator
            localize: false
          });
          this.addChild(rightSelectionIndicator);
        }
        localeSprite.onTapUp((e) => {
          e.handled = true;
          this.handleLocaleSelection(e, localeOption);
        });
        localeSprite.onTapUpAny((e) => {
          e.handled = true;
        });
        localeSprite.onTapDown((e) => {
          e.handled = true;
        });
        localeSprite.onPointerUp((e) => {
          e.handled = true;
        });
        localeSprite.onPointerDown((e) => {
          e.handled = true;
        });
      }
    }
    this.needsInitialization = false;
  }
  handleLocaleSelection(e, localeOption) {
    if (this.eventListeners.length > 0) {
      this.eventListeners.filter(
        (listener) => listener.type === M2EventType.Composite && listener.compositeType === "LocalePickerResult" && listener.nodeUuid == this.uuid
      ).forEach((listener) => {
        const languagePickerEvent = {
          type: M2EventType.Composite,
          compositeType: this.compositeType,
          compositeEventType: "LocalePickerResult",
          target: this,
          handled: false,
          result: {
            locale: localeOption.locale
          },
          timestamp: Timer.now(),
          iso8601Timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        listener.callback(languagePickerEvent);
      });
    }
    this.setDialogVisibility(false);
    if (this.automaticallyChangeLocale) {
      this.game.i18n?.switchToLocale(localeOption.locale);
      this.currentLocale = localeOption.locale;
    }
  }
  setDialogVisibility(visible) {
    this.children.filter((child) => child.name !== "localePickerIcon").forEach((child) => {
      child.hidden = !visible;
    });
  }
  get backgroundColor() {
    return this._backgroundColor;
  }
  set backgroundColor(backgroundColor) {
    this._backgroundColor = backgroundColor;
    this.needsInitialization = true;
  }
  get fontSize() {
    return this._fontSize;
  }
  set fontSize(fontSize) {
    this._fontSize = fontSize;
    this.needsInitialization = true;
  }
  get fontColor() {
    return this._fontColor;
  }
  set fontColor(fontColor) {
    this._fontColor = fontColor;
    this.needsInitialization = true;
  }
  get cornerRadius() {
    return this._cornerRadius;
  }
  set cornerRadius(cornerRadius) {
    this._cornerRadius = cornerRadius;
    this.needsInitialization = true;
  }
  get overlayAlpha() {
    return this._overlayAlpha;
  }
  set overlayAlpha(alpha) {
    this._overlayAlpha = alpha;
    this.needsInitialization = true;
  }
  get icon() {
    const localePicker = this;
    return {
      get svgString() {
        return localePicker._icon.svgString;
      },
      set svgString(svgString) {
        localePicker._icon.svgString = svgString;
        localePicker.needsInitialization = true;
      },
      get imageName() {
        return localePicker._icon.imageName;
      },
      set imageName(imageName) {
        localePicker._icon.imageName = imageName;
        localePicker.needsInitialization = true;
      },
      get height() {
        return localePicker._icon.height;
      },
      set height(height) {
        localePicker._icon.height = height;
        localePicker.needsInitialization = true;
      },
      get width() {
        return localePicker._icon.width;
      },
      set width(width) {
        localePicker._icon.width = width;
        localePicker.needsInitialization = true;
      }
    };
  }
  set icon(icon) {
    this._icon = icon;
    this.needsInitialization = true;
  }
  get iconPosition() {
    const localePicker = this;
    return {
      get x() {
        return localePicker._iconPosition.x;
      },
      set x(x) {
        localePicker._iconPosition.x = x;
        if (localePicker.iconSprite) {
          localePicker.iconSprite.position = localePicker._iconPosition;
        }
        localePicker.needsInitialization = true;
      },
      get y() {
        return localePicker._iconPosition.y;
      },
      set y(y) {
        localePicker._iconPosition.y = y;
        if (localePicker.iconSprite) {
          localePicker.iconSprite.position = localePicker._iconPosition;
        }
        localePicker.needsInitialization = true;
      }
    };
  }
  set iconPosition(position) {
    this._iconPosition = position;
    if (this.iconSprite) {
      this.iconSprite.position = position;
    }
    this.needsInitialization = true;
  }
  get localeOptions() {
    return this._localeOptions;
  }
  set localeOptions(options) {
    this._localeOptions = options;
    this.needsInitialization = true;
  }
  get currentLocale() {
    return this._currentLocale;
  }
  set currentLocale(locale) {
    if (locale === this.currentLocale) {
      return;
    }
    this._currentLocale = locale;
    this.needsInitialization = true;
  }
  update() {
    super.update();
  }
  draw(canvas) {
    super.drawChildren(canvas);
  }
  warmup(canvas) {
    this.initialize();
    this.children.filter((child) => child.isDrawable).forEach((child) => {
      child.warmup(canvas);
    });
  }
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
  duplicate(newName) {
    throw new M2Error(`duplicate not implemented. ${newName}`);
  }
}

class CountdownTimer extends Composite {
  /**
   * A countdown timer displays a number that counts down to zero.
   *
   * @param options
   */
  constructor(options) {
    super(options);
    this.compositeType = "CountdownTimer";
    this._milliseconds = 3e3;
    this._tickIntervalMilliseconds = 1e3;
    this._fontSize = 50;
    this._fontColor = WebColors.White;
    this._zeroString = "0";
    this._timerShape = {
      circle: {
        radius: 100
      },
      fillColor: WebColors.RoyalBlue
    };
    this._textVerticalBias = 0.5;
    this.countdownSequence = new Array();
    this._isRunning = false;
    this.hasStopped = false;
    this.originalOptions = JSON.parse(JSON.stringify(options));
    if (options.milliseconds) {
      this.milliseconds = options.milliseconds;
    }
    if (options.tickIntervalMilliseconds) {
      this.tickIntervalMilliseconds = options.tickIntervalMilliseconds;
    }
    if (options.fontName) {
      this.fontName = options.fontName;
    }
    if (options.fontSize !== void 0) {
      this.fontSize = options.fontSize;
    }
    if (options.fontColor) {
      this.fontColor = options.fontColor;
    }
    if (options.zeroString !== void 0) {
      this.zeroString = options.zeroString;
    }
    if (options.timerShape) {
      this.timerShape = options.timerShape;
    }
    if (options.textVerticalBias !== void 0) {
      this.textVerticalBias = options.textVerticalBias;
    }
    this.saveNodeNewEvent();
  }
  get completeNodeOptions() {
    return {
      ...this.options,
      ...this.getNodeOptions(),
      ...this.getDrawableOptions(),
      ...this.originalOptions
    };
  }
  initialize() {
    this.removeAllChildren();
    this._isRunning = false;
    this.hasStopped = false;
    if (this.timerShape?.circle === void 0 && this.timerShape?.rectangle === void 0 || this.timerShape?.circle !== void 0) {
      this.timerShapeNode = new Shape({
        circleOfRadius: this.timerShape.circle?.radius ?? 100,
        fillColor: this.timerShape?.fillColor ?? WebColors.RoyalBlue,
        suppressEvents: true
      });
      this.addChild(this.timerShapeNode);
    } else if (this.timerShape?.rectangle !== void 0) {
      this.timerShapeNode = new Shape({
        rect: {
          width: this.timerShape?.rectangle?.width ?? 200,
          height: this.timerShape?.rectangle?.height ?? 200
        },
        cornerRadius: this.timerShape?.rectangle?.cornerRadius,
        fillColor: this.timerShape?.fillColor ?? WebColors.RoyalBlue,
        suppressEvents: true
      });
      this.addChild(this.timerShapeNode);
    } else {
      throw new M2Error("Invalid timer shape options.");
    }
    this.size = this.timerShapeNode.size;
    if (this.milliseconds % 1e3 !== 0) {
      throw new M2Error(
        "CountdownTimer milliseconds must be a multiple of 1000."
      );
    }
    const timerInitialNumber = Math.floor(this.milliseconds / 1e3);
    this.timerNumberLabel = new Label({
      text: timerInitialNumber.toString(),
      fontSize: this.fontSize,
      fontName: this._fontName,
      fontColor: this.fontColor,
      layout: {
        constraints: {
          topToTopOf: this.timerShapeNode,
          bottomToBottomOf: this.timerShapeNode,
          startToStartOf: this.timerShapeNode,
          endToEndOf: this.timerShapeNode,
          verticalBias: this.textVerticalBias
        }
      },
      suppressEvents: true
    });
    this.timerShapeNode.addChild(this.timerNumberLabel);
    this.countdownSequence = new Array();
    for (let i = this.milliseconds; i > this.tickIntervalMilliseconds; i = i - this.tickIntervalMilliseconds) {
      this.countdownSequence.push(
        Action.wait({ duration: this.tickIntervalMilliseconds })
      );
      this.countdownSequence.push(
        Action.custom({
          callback: () => {
            this.tick(i - this.tickIntervalMilliseconds);
          }
        })
      );
    }
    this.countdownSequence.push(
      Action.wait({ duration: this.tickIntervalMilliseconds })
    );
    this.countdownSequence.push(
      Action.custom({
        callback: () => {
          this.tick(0);
          const countdownTimerEvent = {
            type: M2EventType.Composite,
            compositeType: this.compositeType,
            compositeEventType: "CountdownTimerComplete",
            target: this,
            handled: false,
            millisecondsRemaining: 0,
            ...M2c2KitHelpers.createTimestamps()
          };
          this.handleCompositeEvent(countdownTimerEvent);
          this.saveEvent(countdownTimerEvent);
          if (this.eventListeners.length > 0) {
            this.eventListeners.filter(
              (listener) => listener.type === M2EventType.Composite && listener.compositeType === "CountdownTimer" && listener.compositeEventType === "CountdownTimerComplete"
            ).forEach((listener) => {
              listener.callback(countdownTimerEvent);
            });
          }
        }
      })
    );
    this.needsInitialization = false;
  }
  tick(millisecondsRemaining) {
    const countdownTimerEvent = {
      type: M2EventType.Composite,
      compositeType: this.compositeType,
      compositeEventType: "CountdownTimerTick",
      target: this,
      handled: false,
      millisecondsRemaining,
      ...M2c2KitHelpers.createTimestamps()
    };
    this.handleCompositeEvent(countdownTimerEvent);
    this.saveEvent(countdownTimerEvent);
    if (this.eventListeners.length > 0) {
      this.eventListeners.filter(
        (listener) => listener.type === M2EventType.Composite && listener.compositeType === "CountdownTimer" && listener.compositeEventType === "CountdownTimerTick"
      ).forEach((listener) => {
        listener.callback(countdownTimerEvent);
      });
    }
  }
  /**
   * Starts the countdown timer.
   *
   * @remarks Calling `start()` on a timer whose state is running (already started)
   * or stopped will raise an error.
   */
  start() {
    if (this.isRunning) {
      throw new M2Error("CountdownTimer: cannot start. It is already running.");
    }
    if (this.hasStopped) {
      throw new M2Error(
        "CountdownTimer: It has stopped. You cannot start a stopped CountdownTimer. Instead, create a new CountdownTimer or call CountdownTimer.reset() before starting."
      );
    }
    if (this.needsInitialization) {
      this.initialize();
    }
    this.run(
      Action.sequence(this.countdownSequence),
      "__countdownSequenceAction"
    );
    this._isRunning = true;
  }
  /**
   * Stops the countdown timer.
   *
   * @remarks This method is idempotent. Calling `stop()` on a stopped timer
   * has no effect and will not raise an error. This can be called on a
   * CountdownTimer in any state.
   */
  stop() {
    if (this.isRunning) {
      this.removeAction("__countdownSequenceAction");
      this._isRunning = false;
      this.hasStopped = true;
    }
  }
  /**
   * Resets the countdown timer to its initial state so it can be started
   * again.
   *
   * @remarks This method is idempotent. Calling reset() multiple times will
   * not raise an error. This can be called on a CountdownTimer in any state.
   */
  reset() {
    this.stop();
    this.initialize();
  }
  /**
   * Returns true if the countdown timer is running.
   */
  get isRunning() {
    return this._isRunning;
  }
  handleCompositeEvent(event) {
    if (!this.timerNumberLabel) {
      throw new M2Error("Timer number label not found.");
    }
    switch (event.compositeEventType) {
      case "CountdownTimerTick": {
        this.timerNumberLabel.text = Math.ceil(
          event.millisecondsRemaining / 1e3
        ).toString();
        break;
      }
      case "CountdownTimerComplete": {
        this.timerNumberLabel.text = this.zeroString;
        break;
      }
      default:
        throw new M2Error(
          `Invalid TimerCountdown event type: ${event.compositeEventType}`
        );
    }
  }
  /**
   * Executes a callback when the timer ticks.
   *
   * @remarks The callback is also executed when the timer completes.
   *
   * @param callback - function to execute
   * @param options
   */
  onTick(callback, options) {
    const eventListener = {
      type: M2EventType.Composite,
      compositeEventType: "CountdownTimerTick",
      compositeType: this.compositeType,
      nodeUuid: this.uuid,
      callback
    };
    this.addCountdownTimerEventListener(eventListener, options);
  }
  /**
   * Executes a callback when the timer completes.
   *
   * @remarks This is the last tick of the timer.
   *
   * @param callback - function to execute.
   * @param options
   */
  onComplete(callback, options) {
    const eventListener = {
      type: M2EventType.Composite,
      compositeEventType: "CountdownTimerComplete",
      compositeType: this.compositeType,
      nodeUuid: this.uuid,
      callback
    };
    this.addCountdownTimerEventListener(eventListener, options);
  }
  addCountdownTimerEventListener(eventListener, options) {
    if (options?.replaceExisting) {
      this.eventListeners = this.eventListeners.filter(
        (listener) => !(listener.nodeUuid === eventListener.nodeUuid && listener.type === eventListener.type && listener.compositeType === eventListener.compositeType)
      );
    }
    this.eventListeners.push(eventListener);
  }
  get milliseconds() {
    return this._milliseconds;
  }
  set milliseconds(milliseconds) {
    if (Equal.value(this._milliseconds, milliseconds)) {
      return;
    }
    this._milliseconds = milliseconds;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("milliseconds", milliseconds);
  }
  get tickIntervalMilliseconds() {
    return this._tickIntervalMilliseconds;
  }
  set tickIntervalMilliseconds(tickIntervalMilliseconds) {
    if (Equal.value(this._tickIntervalMilliseconds, tickIntervalMilliseconds)) {
      return;
    }
    this._tickIntervalMilliseconds = tickIntervalMilliseconds;
    this.needsInitialization = true;
    this.savePropertyChangeEvent(
      "tickIntervalMilliseconds",
      tickIntervalMilliseconds
    );
  }
  get fontColor() {
    return this._fontColor;
  }
  set fontColor(fontColor) {
    if (Equal.value(this._fontColor, fontColor)) {
      return;
    }
    this._fontColor = fontColor;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("fontColor", fontColor);
  }
  get fontName() {
    return this._fontName;
  }
  set fontName(fontName) {
    if (this._fontName === fontName) {
      return;
    }
    this._fontName = fontName;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("fontName", fontName);
  }
  get fontSize() {
    return this._fontSize;
  }
  set fontSize(fontSize) {
    if (Equal.value(this._fontSize, fontSize)) {
      return;
    }
    this._fontSize = fontSize;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("fontSize", fontSize);
  }
  get zeroString() {
    return this._zeroString;
  }
  set zeroString(zeroString) {
    if (this._zeroString === zeroString) {
      return;
    }
    this._zeroString = zeroString;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("zeroString", zeroString);
  }
  get timerShape() {
    return this._timerShape;
  }
  set timerShape(shape) {
    if (Equal.value(this._timerShape, shape)) {
      return;
    }
    this._timerShape = shape;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("timerShape", shape);
  }
  get textVerticalBias() {
    return this._textVerticalBias;
  }
  set textVerticalBias(textVerticalBias) {
    if (Equal.value(this._textVerticalBias, textVerticalBias)) {
      return;
    }
    this._textVerticalBias = textVerticalBias;
    this.needsInitialization = true;
    this.savePropertyChangeEvent("textVerticalBias", textVerticalBias);
  }
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
  duplicate(newName) {
    throw new M2Error(`Method not implemented. ${newName}`);
  }
  update() {
    super.update();
  }
  draw(canvas) {
    super.drawChildren(canvas);
  }
  warmup(canvas) {
    this.initialize();
    this.children.filter((child) => child.isDrawable).forEach((child) => {
      child.warmup(canvas);
    });
  }
}
M2c2KitHelpers.registerM2NodeClass(
  CountdownTimer
);

class Slider extends Composite {
  /**
   * A slider to select a value from a range by dragging a thumb along a track.
   *
   * @experimental Slider is a work in progress and will change in future versions.
   *
   * @param options - {@link SliderOptions}
   */
  constructor(options) {
    super(options);
    this.compositeType = "Slider";
    this._trackSize = { width: 250, height: 10 };
    this._trackColor = WebColors.Black;
    this._thumbSize = { width: 20, height: 40 };
    this._thumbColor = WebColors.DarkGray;
    this._min = 0;
    this._max = 100;
    this._value = (this.max - this.min) / 2;
    this.originalOptions = JSON.parse(JSON.stringify(options));
    if (options.trackSize) {
      this.trackSize = options.trackSize;
    }
    if (options.trackColor) {
      this.trackColor = options.trackColor;
    }
    if (options.thumbSize) {
      this.thumbSize = options.thumbSize;
    }
    if (options.thumbColor) {
      this.thumbColor = options.thumbColor;
    }
    if (options.min !== void 0) {
      this.min = options.min;
    }
    if (options.max !== void 0) {
      this.max = options.max;
    }
    if (options.value !== void 0) {
      this.value = options.value;
    }
    this.saveNodeNewEvent();
  }
  get thumbShape() {
    if (this._thumbShape === void 0) {
      throw new M2Error("thumbShape is not defined.");
    }
    return this._thumbShape;
  }
  set thumbShape(value) {
    this._thumbShape = value;
  }
  get completeNodeOptions() {
    return {
      ...this.options,
      ...this.getNodeOptions(),
      ...this.getDrawableOptions(),
      ...this.originalOptions
    };
  }
  initialize() {
    this.removeAllChildren();
    const trackShape = new Shape({
      rect: {
        width: this.trackSize.width,
        height: this.trackSize.height
      },
      cornerRadius: 8,
      fillColor: this.trackColor
    });
    this.addChild(trackShape);
    this.thumbShape = new Shape({
      rect: {
        width: this.thumbSize.width,
        height: this.thumbSize.height
      },
      cornerRadius: 8,
      fillColor: this.thumbColor,
      isUserInteractionEnabled: true,
      draggable: true,
      zPosition: 1,
      position: {
        x: this.value * this.trackSize.width / (this.max - this.min) - this.trackSize.width / 2,
        y: 0
      }
    });
    trackShape.addChild(this.thumbShape);
    const trackZoneShape = new Shape({
      rect: {
        width: this.trackSize.width,
        height: this.thumbSize.height
      },
      // during development, it is useful to make this visible
      // fillColor: WebColors.Red,
      // alpha: 0.05,
      alpha: 0,
      isUserInteractionEnabled: true,
      zPosition: 0
    });
    trackShape.addChild(trackZoneShape);
    trackZoneShape.onTapDown((e) => {
      this.thumbShape.position.x = e.point.x - trackShape.size.width / 2;
      this.updateThumbLabel();
    });
    const thumbZoneShape = new Shape({
      rect: {
        width: this.trackSize.width,
        /**
         * The thumbZoneShape is twice the height of the parent scene in case
         * the slider is placed at the bottom or top of the screen. This
         * ensures that thumbZoneShape is large enough to capture pointer
         * events that are outside the bounds of the slider and on the parent
         * scene.
         */
        height: this.parentSceneAsNode.size.height * 2
      },
      // during development, it is useful to make this visible
      // fillColor: WebColors.Black,
      // alpha: 0.008,
      alpha: 0,
      isUserInteractionEnabled: true
    });
    this.addChild(thumbZoneShape);
    thumbZoneShape.onPointerMove(() => {
      this.thumbShape.draggable = true;
    });
    thumbZoneShape.onPointerLeave(() => {
      this.thumbShape.draggable = false;
    });
    this.thumbShape.onTapDown((e) => {
      e.handled = true;
      if (e.point.y !== 0) {
        this.thumbShape.position.y = 0;
      }
      if (e.point.x < -this.trackSize.width / 2) {
        this.thumbShape.position.x = -this.trackSize.width / 2;
      }
      if (e.point.x > this.trackSize.width / 2) {
        this.thumbShape.position.x = this.trackSize.width / 2;
      }
      this.updateThumbLabel();
    });
    this.thumbShape.onDrag((e) => {
      if (e.position.y !== 0) {
        this.thumbShape.position.y = 0;
      }
      if (e.position.x < -this.trackSize.width / 2) {
        this.thumbShape.position.x = -this.trackSize.width / 2;
      }
      if (e.position.x > this.trackSize.width / 2) {
        this.thumbShape.position.x = this.trackSize.width / 2;
      }
      this.updateThumbLabel();
    });
    this.thumbShape.onDragEnd(() => {
      const value = Math.round(
        (this.thumbShape.position.x + this.trackSize.width / 2) / this.trackSize.width * (this.max - this.min)
      );
      this.thumbShape.position.x = value / (this.max - this.min) * this.trackSize.width - this.trackSize.width / 2;
      this.updateThumbLabel();
    });
    this.needsInitialization = false;
  }
  updateThumbLabel() {
    const value = (this.thumbShape.position.x + this.trackSize.width / 2) / this.trackSize.width * (this.max - this.min);
    if (!this.thumbLabel) {
      this.thumbLabel = new Label({
        text: value.toString()
      });
      this.addChild(this.thumbLabel);
    }
    this.thumbLabel.text = Math.round(value).toString();
    this.thumbLabel.position = {
      x: this.thumbShape.position.x,
      y: this.thumbShape.position.y - 30
    };
    if (this.thumbLabel) {
      this.thumbLabel.position = {
        x: this.thumbShape.position.x,
        y: this.thumbShape.position.y - 30
      };
    }
    const sliderEvent = {
      type: M2EventType.Composite,
      compositeType: "Slider",
      compositeEventType: "SliderValueChanged",
      target: this,
      value,
      ...M2c2KitHelpers.createTimestamps()
    };
    this.handleCompositeEvent(sliderEvent);
    this.saveEvent(sliderEvent);
    if (this.eventListeners.length > 0) {
      this.eventListeners.filter(
        (listener) => listener.type === M2EventType.Composite && listener.compositeType === this.compositeType && listener.compositeEventType === "SliderValueChanged"
      ).forEach((listener) => {
        listener.callback(sliderEvent);
      });
    }
  }
  /**
   * Executes a callback when the slider value changes.
   *
   * @param callback - function to execute
   * @param options
   */
  onValueChanged(callback, options) {
    const eventListener = {
      type: M2EventType.Composite,
      compositeEventType: "SliderValueChanged",
      compositeType: this.compositeType,
      nodeUuid: this.uuid,
      callback
    };
    this.addSliderEventListener(eventListener, options);
  }
  addSliderEventListener(eventListener, options) {
    if (options?.replaceExisting) {
      this.eventListeners = this.eventListeners.filter(
        (listener) => !(listener.nodeUuid === eventListener.nodeUuid && listener.type === eventListener.type && listener.compositeType === eventListener.compositeType)
      );
    }
    this.eventListeners.push(eventListener);
  }
  get trackSize() {
    return this._trackSize;
  }
  set trackSize(value) {
    this._trackSize = value;
  }
  get trackColor() {
    return this._trackColor;
  }
  set trackColor(value) {
    this._trackColor = value;
  }
  get thumbSize() {
    return this._thumbSize;
  }
  set thumbSize(value) {
    this._thumbSize = value;
  }
  get thumbColor() {
    return this._thumbColor;
  }
  set thumbColor(value) {
    this._thumbColor = value;
  }
  get value() {
    return this._value;
  }
  set value(value) {
    this._value = value;
  }
  get min() {
    return this._min;
  }
  set min(value) {
    this._min = value;
  }
  get max() {
    return this._max;
  }
  set max(value) {
    this._max = value;
  }
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
  duplicate(newName) {
    throw new M2Error(`Method not implemented. ${newName}`);
  }
  update() {
    super.update();
  }
  draw(canvas) {
    super.drawChildren(canvas);
  }
  warmup(canvas) {
    this.initialize();
    this.children.filter((child) => child.isDrawable).forEach((child) => {
      child.warmup(canvas);
    });
  }
}

console.log("\u26AA @m2c2kit/addons version 0.3.30 (62ccf312)");

export { Button, CountdownScene, CountdownTimer, Dialog, DialogResult, DrawPad, DrawPadEventType, DrawPadItemEventType, Grid, Instructions, LocalePicker, Slider, VirtualKeyboard };
//# sourceMappingURL=index.js.map
