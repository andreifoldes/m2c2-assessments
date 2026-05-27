# WebGazer Eye Tracking Integration

## Overview

Add `?webgazer=1` URL parameter to the four assessments that already support webcam recording (PVT-BA, Prices, Symbol Search, Color Shapes). Uses [WebGazer.js](https://github.com/brownhci/WebGazer) for browser-based eye tracking with gaze-based calibration. Outputs a CSV file with timestamped gaze coordinates and trial markers, delivered via the same pipeline as webcam recordings.

## Module Structure

New module at `assessments/webgazer/webgazer.js` (~300-400 lines), mirroring the pattern of `assessments/webcam/webcam.js`.

WebGazer.js loaded from CDN at runtime, pinned to a specific version (like MediaPipe `@0.10.21` in webcam.js):

```
https://cdn.jsdelivr.net/npm/webgazer@2.1.3/dist/webgazer.min.js
```

### Loading Pattern

Each assessment's `index.js` conditionally loads the module. Import paths differ by nesting depth:

**PVT-BA and Prices** (one level deep: `assessments/pvt-ba/index.js`):
```js
const webgazerParam = params.get("webgazer");
const webgazerEnabled = webgazerParam === "1" || webgazerParam === "true";
if (webgazerEnabled) {
  webgazerModule = await import("../webgazer/webgazer.js");
}
```

**Symbol Search and Color Shapes** (two levels deep: `assessments/@m2c2kit/assessment-*@0.8.33/index.js`):
```js
const webgazerParam = context.urlParams.get("webgazer");
const webgazerEnabled = webgazerParam === "1" || webgazerParam === "true";
if (webgazerEnabled) {
  webgazerModule = await import("../../webgazer/webgazer.js");
}
context.urlParams.delete("webgazer");
```

Note: `params.delete("webgazer")` is only needed for the @m2c2kit assessments (which forward all URL params to the game engine via `setGameParametersFromUrlParams`). PVT-BA and Prices manually select which params to forward, so deletion is unnecessary there.

### Stream Sharing

When both `?webcam=1&webgazer=1` are set, each module independently calls `getUserMedia`. Modern browsers share the underlying camera hardware across multiple streams. This avoids coupling the two modules.

**Known limitation**: Dual streams may cause issues on some older mobile browsers (particularly iOS Safari <16). If issues arise in testing, a future optimization could pass the webcam stream to WebGazer via `setCameraConstraints`. For initial implementation, independent streams are simpler and work on all target desktop browsers and modern mobile browsers.

## Consent Overlay

Separate consent overlay from webcam, with eye-tracking-specific messaging:

- Heading: "Optional Eye Tracking"
- Body (Telegram): "If you agree, your eye movements will be tracked while you complete the task. The gaze data will be sent to you in Telegram when the task ends."
- Body (standard): "If you agree, your eye movements will be tracked while you complete the task. The gaze data is saved only on your device."
- Buttons: "Allow Eye Tracking" / "No thanks, continue without eye tracking"
- Same visual style as webcam consent overlay (full-screen white, centered, green accept button)

## Calibration

### Approach

Gaze-based 5-point calibration. User looks at dots; synthetic click events dispatched at dot positions to feed WebGazer's regression model.

### WebGazer Initialization

```js
webgazer
  .setRegression('ridge')
  .saveDataAcrossSessions(false)
  .showVideo(false)
  .showPredictionPoints(false)
  .showFaceOverlay(false)
  .showFaceFeedbackBox(false)
  .applyKalmanFilter(true)
  .begin();
```

### 5-Point Positions (viewport fractions)

```
(0.15, 0.15)              (0.85, 0.15)
              (0.50, 0.50)
(0.15, 0.85)              (0.85, 0.85)
```

Corners inset to 15% to avoid notches, status bars, and rounded screen corners on mobile.

### Calibration UI Flow

1. Full-screen overlay (black background)
2. Instruction text: "Look at each dot until it disappears"
3. Dot appears at position 1. User looks for 2 seconds
4. During those 2 seconds, synthetic click events dispatched at dot screen coordinates (~10 events/sec) to train WebGazer
5. Dot shrinks as visual timer feedback
6. Move to next position. Repeat for all 5 points
7. Overlay removed

### Mobile Considerations

- Dot size scales with `Math.min(vw, vh)`, minimum ~40px
- 15% edge inset keeps dots clear of device chrome
- `saveDataAcrossSessions(false)` ensures fresh calibration every session
- Responsive to both portrait phones and landscape desktop

## Gaze Data Collection

### During Task

`setGazeListener(callback)` collects samples into an in-memory array. WebGazer produces ~20-30 Hz depending on device.

### CSV Schema

| Column | Type | Description |
|--------|------|-------------|
| `timestamp_ms` | integer | `Date.now()` at sample time (absolute) |
| `x` | float or empty | Predicted gaze X in CSS pixels |
| `y` | float or empty | Predicted gaze Y in CSS pixels |
| `viewport_width` | integer | `window.innerWidth` at sample time |
| `viewport_height` | integer | `window.innerHeight` at sample time |
| `trial_number` | integer | 0 = calibration/pre-task, increments per trial |
| `event_type` | string | `gaze`, `trial_start`, `trial_end`, `calibration` |

Viewport dimensions are recorded per-sample so gaze coordinates can be normalized even if the viewport changes (orientation change, resize).

### Null Handling

When WebGazer returns `null` (blink, face lost, look away), a row is still recorded with empty x/y (viewport dimensions still populated). This preserves data gap visibility for researchers.

### Trial Markers

Exported functions for each assessment to call:

```js
export function markTrialStart() { /* inserts trial_start row, increments counter */ }
export function markTrialEnd()   { /* inserts trial_end row */ }
```

Integration in each assessment — webgazer markers go **before** the existing `allTrialData.push()`:

```js
session.onActivityData((ev) => {
  // End previous trial, start next trial in gaze data
  // First onActivityData: ends trial 1 (started after calibration), starts trial 2
  // Last onActivityData: ends trial N, starts trial N+1 (ended in session.onEnd)
  if (webgazerModule) webgazerModule.markTrialEnd();
  if (webgazerModule) webgazerModule.markTrialStart();
  allTrialData.push(ev.newData);
});
```

First `markTrialStart()` called after calibration completes (trial 1 begins). Final `markTrialEnd()` in `session.onEnd()` before export.

## CSV Export & Delivery

### On `session.onEnd()`

1. `webgazer.pause()` — stop predictions
2. Insert final `trial_end` marker
3. Build CSV string from in-memory array
4. Create `File` blob (MIME: `text/csv`)
5. Deliver via delivery pipeline (see below)
6. `webgazer.end()` — release camera and clean up injected DOM elements

### Filename

`{assessment}-gaze-{timestamp}.csv` (e.g. `pvt-ba-gaze-1710680400123.csv`)

### Delivery Pipeline

Same cascade as `stopAndDownloadRecording` in webcam.js, but with a distinct `postMessage` type:

1. **Telegram** (`?source=telegram`): `postMessage({ type: "webgazer-gaze-data", blob, filename, mimeType: "text/csv" }, "*")` to parent frame
2. **Web Share API** (mobile): `navigator.share({ files: [csvFile] })`
3. **postMessage fallback** (iframe): same `postMessage` with type `"webgazer-gaze-data"` to parent window
4. **Desktop fallback**: `<a download>` trigger

The distinct `type: "webgazer-gaze-data"` (vs webcam's `type: "webcam-recording"`) allows the parent frame to distinguish between video and gaze data deliveries.

### Exported Function

```js
export async function stopAndExportGaze(filenamePrefix) { /* pause, build CSV, deliver, end */ }
```

## Error Handling

Graceful degradation throughout — if WebGazer fails at any point, the assessment proceeds normally without eye tracking:

| Failure Point | Behavior |
|--------------|----------|
| CDN load fails | `console.warn`, proceed without eye tracking |
| `webgazer.begin()` fails (camera denied) | `console.warn`, proceed without eye tracking |
| Calibration errors | Skip calibration, proceed without gaze data |
| `setGazeListener` callback throws | Catch internally, continue collecting |
| Export/delivery fails | `console.warn`, assessment still completes normally |

This matches the existing webcam pattern (see pvt-ba `index.js` lines 145-147).

## Assessment Integration Sequence

### Combined flow (`webcam=1&webgazer=1`)

```
1. Load webcam module + webgazer module
2. Webcam consent → if accepted:
   a. Get camera stream
   b. Face positioning guide
   c. Start MediaRecorder
3. WebGazer consent → if accepted:
   a. webgazer.begin() (own camera stream, preview hidden)
   b. 5-point gaze calibration
   c. markTrialStart(1)
4. session.initialize() — task starts
5. onActivityData → markTrialEnd() + markTrialStart()
6. session.onEnd():
   a. stopAndExportGaze() — CSV delivery
   b. stopAndDownloadRecording() — video delivery
   c. POST trial data to callback_url
```

### WebGazer only (`webgazer=1`, no webcam)

Steps 2a-2c skipped. Everything else identical.

## Changes Per Assessment

~15 lines added to each of the four assessment `index.js` files:

1. Read `?webgazer` param, conditionally import module (~5 lines, path varies by nesting depth)
2. Delete `webgazer` param before passing to game engine (only needed for @m2c2kit assessments)
3. Hook `markTrialEnd`/`markTrialStart` into `onActivityData` (~3 lines, before existing push)
4. Call `stopAndExportGaze()` in `onEnd` (~3 lines, before webcam stop)

No existing code is modified — only additions.

## Files to Create/Modify

| File | Action |
|------|--------|
| `assessments/webgazer/webgazer.js` | **Create** — core module (~300-400 lines) |
| `assessments/pvt-ba/index.js` | **Modify** — add ~15 lines |
| `assessments/prices/index.js` | **Modify** — add ~15 lines |
| `assessments/@m2c2kit/assessment-symbol-search@0.8.33/index.js` | **Modify** — add ~15 lines |
| `assessments/@m2c2kit/assessment-color-shapes@0.8.33/index.js` | **Modify** — add ~15 lines |

## URL Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `webgazer` | `1`, `true` | disabled | Enable eye tracking |

All existing parameters (`token`, `callback_url`, `webcam`, `source`, `show_end_screen`) continue to work unchanged.
