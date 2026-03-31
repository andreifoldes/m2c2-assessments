# Face-Name-Occupation Test (FNAME) — Design Spec

## Context

We need a new cognitive assessment implementing a modified Face-Name Associative Memory Exam (FNAME) that tests face-name and face-occupation associative memory, plus relational inference. This is built on the m2c2kit framework, following existing patterns from the Prices and PVT-BA assessments in this repo.

**Motivation:** The FNAME is a validated instrument for detecting early associative memory decline. Adding face-occupation pairs and an inference phase tests relational memory beyond simple recognition.

**Reference:** The task design follows the FNAME paradigm (Rentz et al.) with a face-occupation extension and associative inference component.

## File Structure

```
assessments/fname/
  index.html          # importmap + canvas container (template from existing assessments)
  index.js            # Pre-fetch faces, parse URL params, create Session, submit results
  fname.js            # Main Game class — all scenes and trial logic
  stimuli.js          # Name pool, occupation pool, shuffle/sampling utilities
  assets/fname/
    fonts/roboto/Roboto-Regular.ttf
```

No new npm dependencies. No build step — directly served like Prices and PVT-BA.

## Face Image Strategy

**Pre-fetch in `index.js` before Game initialization:**

1. Generate 100 random image URLs using the predictable pattern: `https://ozgrozer.github.io/100k-faces/{a}/{b}/{abcdef}.jpg` where the 6-digit number is random (0–99999).
2. Fetch all 100 in parallel via `Promise.allSettled()`, convert successful responses to base64 data URLs using `blob()` + `FileReader`.
3. Store the resulting base64 strings in an array.
4. Pass this array to the Game via `setParameters({ face_image_pool: JSON.stringify(base64Array) })`.
5. Show a loading spinner/progress bar during pre-fetch.

**Why base64:** Avoids CORS issues with canvas rendering, works offline after initial load, and is compatible with m2c2kit's image system.

**Why 100:** Large enough pool that repeated sessions get different faces. Configurable via `number_of_faces_to_prefetch` URL param.

**Fallback:** If fewer than `number_of_pairs` images load successfully, show an error message and abort.

## URL Parameters

| Parameter | Default | Type | Description |
|-----------|---------|------|-------------|
| `number_of_pairs` | 6 | number | Face-name-occupation triplets to learn |
| `number_of_distractors` | 2 | number | Wrong options in inference and recognition phases |
| `learning_duration_ms` | 5000 | number | Auto-advance time per learning card (ms) |
| `delay_seconds` | 300 | number | Countdown between inference and recognition |
| `show_tutorial` | true | boolean | Show instruction screens before each phase |
| `number_of_faces_to_prefetch` | 100 | number | Faces to pre-load from API |
| `line_drawing_faces` | false | boolean | Apply line-drawing filter to faces for abstract appearance |
| `show_trials_complete_scene` | true | boolean | Show completion screen at end |
| `token` | — | string | Auth token for result submission |
| `callback_url` | — | string | Endpoint to POST results |

## Stimulus Pools (`stimuli.js`)

**Name pool (~40 names):** Gender-balanced, ethnically diverse first names. Examples: Ruth, James, Maria, Wei, Aisha, David, Priya, Michael, Fatima, Carlos, Sarah, Kenji, Elena, Omar, Linda, Raj, Sophie, Yuki, Amara, Daniel, Lucia, Hassan, Grace, Mateo, Nadia, Robert, Zara, Ivan, Leila, Thomas.

**Occupation pool (~40 occupations):** Common, recognizable occupations. Examples: Librarian, Journalist, Teacher, Engineer, Chef, Nurse, Pilot, Artist, Lawyer, Farmer, Dentist, Plumber, Carpenter, Architect, Baker, Mechanic, Musician, Scientist, Firefighter, Photographer, Electrician, Veterinarian, Accountant, Barber, Coach, Designer, Florist, Locksmith, Pharmacist, Tailor.

**Session generation:** For each session, randomly sample `number_of_pairs` names and occupations (without replacement), pair each with a randomly selected face from the pre-fetched pool. This creates the triplets: `{ faceId, faceDataUrl, name, occupation }`.

## Phase Design

### Phase 1: Learn Face-Name Pairs

**Scene: `learn-name-instructions`** (if `show_tutorial`)
- Title: "Part 1: Learn Names"
- Text: "You will see faces with names. Try to remember which name goes with each face."
- "Begin" button to proceed.

**Scene: `learn-name`**
- Progress bar at top (fills as pairs are shown).
- Card layout: face image (Sprite, centered upper), name (Label, large bold below face), "Try to remember this pair." subtitle.
- Each pair displayed for `learning_duration_ms`, then auto-advances.
- Tap-to-advance also supported (whichever comes first).
- All `number_of_pairs` faces shown once, in random order.
- **No trial data recorded** in learning phases (encoding only).

### Phase 2: Learn Face-Occupation Pairs

**Scene: `learn-occupation-instructions`** (if `show_tutorial`)
- Title: "Part 2: Learn Occupations"
- Text: "Now you will see the same faces with their occupations. Try to remember which occupation goes with each face."

**Scene: `learn-occupation`**
- Same layout as Phase 1 but shows occupation instead of name.
- Same faces, same order randomization, same timing.
- **No trial data recorded.**

### Phase 3: Associative Inference

**Scene: `inference-instructions`** (if `show_tutorial`)
- Title: "Part 3: Match Names to Occupations"
- Text: "Without seeing the faces, match each person's name with their correct occupation."

**Scene: `inference`**
- Prompt: "[Name]'s job is:" (Label, top area).
- Options: 1 correct occupation + `number_of_distractors` distractor occupations drawn from other pairs in the session.
- Options displayed as tappable buttons, vertically stacked, randomly ordered.
- On tap: highlight selection, record data, advance to next trial after brief delay (500ms).
- **Trial data recorded** for each inference trial.

### Delay Phase

**Scene: `delay`**
- "Please wait..." text.
- Countdown timer showing minutes:seconds (updated every second via `setInterval`).
- Timer counts down from `delay_seconds`.
- When timer reaches 0, auto-advance to Phase 4.
- If `delay_seconds` is 0, skip this scene entirely.

### Phase 4: Delayed Recognition

**Scene: `recognition-instructions`** (if `show_tutorial`)
- Title: "Part 4: Recognition"
- Text: "You will see faces paired with a name or occupation. Decide if the pairing is correct."

**Scene: `recognition`**
- Layout: face image (left/center) + name or occupation label (right/beside).
- Prompt: "Is this the correct pair?"
- Two buttons: YES (green) / NO (red).
- Trial composition (counterbalanced):
  - For each of the `number_of_pairs` triplets, generate 2 recognition trials:
    1. Face + correct name (answer: YES)
    2. Face + incorrect occupation from another pair (answer: NO)
  - Additionally, generate matched foils:
    3. Face + correct occupation (answer: YES)
    4. Face + incorrect name from another pair (answer: NO)
  - Total: `number_of_pairs * 4` recognition trials, shuffled.
- **Trial data recorded** for each recognition trial.

### Completion Scene

**Scene: `complete`** (if `show_trials_complete_scene`)
- "Test Complete" title.
- Summary: correct count / total for inference and recognition phases.
- "Done" button or auto-end after 3 seconds.

## Trial Data Schema

```javascript
trialSchema: {
  phase:             { type: "string",  description: "learn_name | learn_occupation | inference | recognition" },
  trial_index:       { type: "integer", description: "Global trial counter (0-based)" },
  pair_index:        { type: "integer", description: "Which triplet (0..number_of_pairs-1)" },
  face_id:           { type: "string",  description: "Identifier for face image" },
  correct_answer:    { type: "string",  description: "Expected response" },
  user_response:     { type: "string",  description: "What participant chose" },
  is_correct:        { type: "boolean", description: "Whether response was correct" },
  response_time_ms:  { type: "number",  description: "Time from stimulus onset to response" },
  distractor_options:{ type: "string",  description: "JSON array of all options shown" },
  stimulus_type:     { type: "string",  description: "face_name | face_occupation | name_to_occupation" },
}
```

## Visual Design

Follow existing m2c2kit palette:
- White background (`[255, 255, 255, 1]`)
- Black primary text, gray secondary
- Card: light gray background (`[240, 240, 245, 1]`) with rounded corners
- Progress bar: indigo fill (`[63, 81, 181, 1]`)
- YES button: green (`[76, 175, 80, 1]`)
- NO button: red (`[211, 47, 47, 1]`)
- Option buttons: light gray with dark border, highlighted on selection

Canvas size: 400x800 with `stretch: true` (matches existing assessments).

## Result Submission

Follows exact same pattern as Prices/PVT-BA:
```javascript
session.onEnd(async () => {
  await fetch(callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      data: {
        trials: allTrialData,
        inference_correct: inferenceCorrectCount,
        inference_total: inferenceTotalCount,
        recognition_correct: recognitionCorrectCount,
        recognition_total: recognitionTotalCount,
      },
    }),
  });
});
```

## Verification Plan

1. **Manual smoke test:** Open `assessments/fname/index.html` locally, verify face images load, complete all 4 phases.
2. **Parameter test:** Test with different URL params: `?number_of_pairs=3&number_of_distractors=1&delay_seconds=5&learning_duration_ms=2000`
3. **Debug mode:** Without `token`/`callback_url`, verify results print to console.
4. **Edge cases:**
   - Network failure during face pre-fetch (error message shown)
   - `number_of_distractors` >= `number_of_pairs` (clamp to `number_of_pairs - 1`)
   - `delay_seconds=0` (skip delay phase)
5. **Cross-browser:** Test on Chrome and Safari (mobile viewport).

## Key Files to Reference During Implementation

- `/assessments/prices/prices.js` — Closest analog (associative memory, learning + recall phases)
- `/assessments/prices/index.js` — Orchestration + submission pattern
- `/assessments/pvt-ba/pvt-ba.js` — Scene building, Sprite usage, timer patterns
- `/assessments/pvt-ba/index.html` — HTML template with importmap
