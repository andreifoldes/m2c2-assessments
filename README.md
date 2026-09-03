# m2c2-assessments

Cognitive assessments hosted on GitHub Pages, built with [m2c2kit](https://github.com/m2c2-project/m2c2kit).

> 📖 **[URL parameter reference](https://andreifoldes.github.io/m2c2-assessments/docs/)** — auto-generated from the task source code on every change (see `website/` and `.github/workflows/docs.yml`).

## Live Demos

| Assessment | Description | Duration (s) | Source | Launch | Launch with camera recording | Launch with eye tracking |
|---|---|---|---|---|---|---|
| **PVT-BA** | Adaptive Psychomotor Vigilance Test — measures sustained attention and reaction time | ≤180 (adaptive) | [Basner, 2022](https://doi.org/10.1093/sleepadvances/zpac038) — custom implementation | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/pvt-ba/?show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/pvt-ba/?webcam=1&show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/pvt-ba/?webgazer=1&show_end_screen=false) |
| **Color Dots** | Measures processing speed by comparing colored dots | ~60 | [m2c2kit](https://m2c2-project.github.io/m2c2kit/) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-color-dots@0.8.33/?show_end_screen=false) | — | — |
| **Symbol Search** | Measures processing speed by matching symbols | ~60 | [m2c2kit](https://m2c2-project.github.io/m2c2kit/) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-symbol-search@0.8.33/?show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-symbol-search@0.8.33/?webcam=1&show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-symbol-search@0.8.33/?webgazer=1&show_end_screen=false) |
| **Grid Memory** | Measures spatial working memory using a grid pattern | ~240 | [m2c2kit](https://m2c2-project.github.io/m2c2kit/) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-grid-memory@0.8.33/?show_end_screen=false) | — | — |
| **Color Shapes** | Measures executive function with color and shape matching | ~90 | [m2c2kit](https://m2c2-project.github.io/m2c2kit/) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-color-shapes@0.8.33/?show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-color-shapes@0.8.33/?webcam=1&show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-color-shapes@0.8.33/?webgazer=1&show_end_screen=false) |
| **Prices** | Associative memory — learn item-price pairs and recognize them | ~120 | [ARC](https://github.com/jasonhass/Ambulatory-Research-in-Cognition) · [Nicosia et al., 2022](https://doi.org/10.1017/S135561772200042X) — custom implementation | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/prices/?show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/prices/?webcam=1&show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/prices/?webgazer=1&show_end_screen=false) |
| **FNAME** | Face–Name–Occupation Task — learn face–name and face–occupation pairs, infer name↔occupation, then recognize after delay | ~180 | [Papp et al., 2021](https://doi.org/10.1002/dad2.12243) · [Rentz et al., 2010](https://doi.org/10.1002/ana.21904) — custom implementation | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/fname/?show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/fname/?webcam=1&show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/fname/?webgazer=1&show_end_screen=false) |
| **FNAME-Pairs** | Face–name paired-associate memory for sleep-dependent consolidation — learn 20 CFD face–name pairs, immediate cued recall, delayed cued recall of a seeded subset | ~300 learning / ~120 delayed | [Ma, Correll & Wittenbrink, 2015](https://doi.org/10.3758/s13428-014-0532-5) (stimuli) — custom implementation | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/fname-pairs/?show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/fname-pairs/?webcam=1&show_end_screen=false) | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/fname-pairs/?webgazer=1&show_end_screen=false) |
| **mVLT** | Mobile Verbal Learning Test — study 12 words, then YES/NO recognition with 3-trial learning curve | ~300 | [Moore et al., 2020](https://doi.org/10.1002/mpr.1859) — custom implementation | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/mvlt/) | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/mvlt/?webcam=1) | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/mvlt/?webgazer=1) |

## Common URL Parameters

These parameters are supported by **all** assessments:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `token` | string | — | Authentication token for results submission. |
| `callback_url` | string | — | URL to POST results to when the assessment ends. |
| `show_end_screen` | string | `true` | Set to `false` or `0` to suppress the green "Assessment Complete" screen after results are submitted. The Telegram WebView will close immediately instead of showing the confirmation. Useful when the chatbot handles its own completion flow. |

---

## PVT-BA

An adaptive Psychomotor Vigilance Test that measures sustained attention and reaction time. A millisecond counter appears after a random delay; the participant taps the screen as quickly as possible. A Bayesian sequential algorithm (Basner 2022, *Sleep Advances* 3(1):zpac038) classifies vigilance into HIGH, MEDIUM, or LOW, often terminating early once the posterior probability exceeds a decision threshold. The test runs for at most 3 minutes.

### URL Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `token` | string | — | Authentication token. When absent (along with `callback_url`), the assessment runs in debug mode and displays results on-screen. |
| `callback_url` | string | — | URL to POST results to when the assessment ends. |
| `max_duration_seconds` | number | `180` | Maximum test duration in seconds. |
| `min_isi_ms` | number | `1000` | Minimum inter-stimulus interval in ms. |
| `max_isi_ms` | number | `4000` | Maximum inter-stimulus interval in ms. |
| `lapse_threshold_ms` | number | `355` | Reaction time at or above this value is classified as a lapse (ms). |
| `false_start_threshold_ms` | number | `100` | Reaction time below this value is classified as a false start (ms). |
| `decision_threshold` | number | `0.99619` | Posterior probability threshold to stop the test early. |
| `feedback_duration_ms` | number | `1000` | How long feedback (RT value or error message) is displayed after each trial (ms). |
| `tutorial` | string | `true` | Set to `false` or `0` to skip the tutorial screens. |
| `webcam` | string | — | Set to `1` or `true` to enable the optional camera recording feature. Participants are shown a consent prompt before the task; if they accept, the front camera records and the video is saved locally to their device at the end of the session. If absent or any other value, no prompt is shown. |
| `webgazer` | string | — | Set to `1` or `true` to enable browser-based eye tracking via [WebGazer.js](https://github.com/brownhci/WebGazer). Participants see a consent prompt, then a 5-point gaze calibration. Gaze coordinates are recorded throughout the task and exported as a CSV file at session end. Can be combined with `webcam=1`. |

### Adaptive Algorithm

- Each trial is classified as a **lapse** (RT >= 355 ms or no response), a **false start** (RT < 100 ms or tap before stimulus), or a **valid response**.
- Lapses and false starts are combined into a single **LpFS** (Lapses + False Starts) count.
- Bayesian posterior probabilities for HIGH, MEDIUM, and LOW vigilance are updated after every trial using likelihood ratios from 30-second time bins.
- The test ends early when any posterior exceeds the decision threshold (default 0.99619), or when cumulative LpFS > 16 (immediate LOW classification).
- If cumulative LpFS > 6, the HIGH category is eliminated and probability is redistributed across MEDIUM and LOW.
- If the algorithm has not reached a decision by the maximum duration, the final classification is based on cumulative LpFS count: 0–6 = HIGH, 7–16 = MEDIUM, >16 = LOW.

### Trial Data Fields

Each trial emits: `trial_index`, `rt_ms`, `isi_ms`, `stimulus_onset_timestamp`, `response_timestamp`, `is_lapse`, `is_false_start`, `cumulative_lpfs`, `elapsed_test_time_ms`, `time_bin` (0–5), `posterior_high`, `posterior_medium`, `posterior_low`, and `classification` (non-null only on the final trial).

---

## Color Dots

A processing speed task from the m2c2kit library. Participants briefly see an array of colored dots, then after a short blank interval they must recall the color of a specific dot. Measures speed and accuracy of color–location binding.

### URL Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `token` | string | — | Authentication token. Required (along with `callback_url`) for results submission. |
| `callback_url` | string | — | URL to POST results to when the assessment ends. |
| `number_of_trials` | integer | `12`\* | How many trials to run. |
| `fixation_duration_ms` | number | `500` | How long the fixation scene is shown (ms). |
| `number_of_dots` | integer | `3` | How many dots to present (minimum 3). |
| `dot_present_duration_ms` | number | `1000` | How long the dots are shown (ms). |
| `dot_blank_duration_ms` | number | `750` | How long a blank square is shown after dots are removed (ms). |
| `instruction_type` | string | `long` | `short` or `long` — controls length of instruction screens. |

\* The m2c2kit default is 5, but this deployment overrides it to 12.

---

## Symbol Search

A processing speed task from the m2c2kit library. Participants see a set of symbol pairs at the top of the screen and must quickly identify which of two bottom pairs matches one of the top pairs. Trials are timed and presented in rapid succession after a countdown.

### URL Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `token` | string | — | Authentication token. Required (along with `callback_url`) for results submission. |
| `callback_url` | string | — | URL to POST results to when the assessment ends. |
| `number_of_trials` | integer | `12`\* | How many trials to run. |
| `number_of_top_pairs` | integer | `3` | Number of symbol pairs shown at the top (1–4). |
| `lure_percent` | number | `0.5` | Proportion of lure trials (0–1). A lure trial has one matching symbol in the incorrect pair; a non-lure trial has zero matching symbols. |
| `left_correct_percent` | number | `0.5` | Proportion of trials where the left pair is correct (0–1). |
| `countdown_duration_ms` | number | `3000` | Duration of the countdown phase before trials begin (ms). |
| `interstimulus_interval_duration_ms` | number | `500` | Duration of the slide-in animation or pause between trials (ms). |
| `instruction_type` | string | `long` | `short` or `long` — controls length of instruction screens. |
| `webcam` | string | — | Set to `1` or `true` to enable optional camera recording. Participants see a consent prompt; if they accept, the front camera records and the video is saved locally at session end. |
| `webgazer` | string | — | Set to `1` or `true` to enable browser-based eye tracking via [WebGazer.js](https://github.com/brownhci/WebGazer). Exports gaze coordinates as CSV. Can be combined with `webcam=1`. |

\* The m2c2kit default is 20, but this deployment overrides it to 12.

---

## Grid Memory

A spatial working memory task from the m2c2kit library. Participants see dots placed on a grid, perform an interference task (tapping targets), and then recall the dot locations from memory. Measures spatial memory capacity.

### URL Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `token` | string | — | Authentication token. Required (along with `callback_url`) for results submission. |
| `callback_url` | string | — | URL to POST results to when the assessment ends. |
| `number_of_trials` | integer | `12`\* | How many trials to run. |
| `number_of_dots` | integer | `3` | Number of dots placed on the grid to memorize. |
| `dot_present_duration_ms` | number | `3000` | How long the dots are shown on the grid (ms). |
| `interference_duration_ms` | number | `8000` | How long the interference phase lasts (ms). |
| `number_of_interference_targets` | integer | `5` | How many targets to show during the interference phase. |
| `preparation_duration_ms` | number | `500` | How long the "get ready" message is shown before each trial (ms). |
| `blank_grid_duration_ms` | number | `500` | How long a blank grid is shown before dots appear (ms). |
| `instruction_type` | string | `long` | `short` or `long` — controls length of instruction screens. |

\* The m2c2kit default is 4, but this deployment overrides it to 12.

---

## Color Shapes

An executive function task from the m2c2kit library. Participants see colored shapes on a grid, then after a brief delay they must judge whether the shapes have the same or different colors as before. Measures change detection ability, requiring attention to both color and spatial location.

### URL Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `token` | string | — | Authentication token. Required (along with `callback_url`) for results submission. |
| `callback_url` | string | — | URL to POST results to when the assessment ends. |
| `number_of_trials` | integer | `12` | How many trials to run. |
| `number_of_shapes_shown` | integer | `3` | How many shapes to show on the grid at one time. |
| `number_of_shapes_changing_color` | integer | `2` | On "different color" trials, how many shapes swap colors. |
| `number_of_different_colors_trials` | integer | `6` | Number of trials where the shapes have different colors (remaining trials are "same color"). |
| `shapes_presented_duration_ms` | number | `2000` | How long the shapes are shown (ms). |
| `shapes_removed_duration_ms` | number | `1000` | How long a blank square is shown after shapes are removed (ms). |
| `fixation_duration_ms` | number | `500` | How long the fixation scene is shown (ms). |
| `cells_per_side` | integer | `3` | Grid dimensions — e.g. `3` gives a 3 x 3 grid, `4` gives 4 x 4. |
| `instruction_type` | string | `long` | `short` or `long` — controls length of instruction screens. |
| `webcam` | string | — | Set to `1` or `true` to enable optional camera recording. Participants see a consent prompt; if they accept, the front camera records and the video is saved locally at session end. |
| `webgazer` | string | — | Set to `1` or `true` to enable browser-based eye tracking via [WebGazer.js](https://github.com/brownhci/WebGazer). Exports gaze coordinates as CSV. Can be combined with `webcam=1`. |

---

## Prices

An associative memory task with a learning and recognition phase. Participants are shown item-price pairs and asked to remember them, then tested on which price was paired with each item. Scores reflect the proportion of recognition errors (higher = worse performance).

### URL Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `token` | string | — | Authentication token. When absent (along with `callback_url`), the assessment runs in debug mode and displays results on-screen. |
| `callback_url` | string | — | URL to POST results to when the assessment ends. |
| `number_of_items` | number | `10` | Number of item-price pairs per session. |
| `learning_duration_ms` | number | `3000` | How long each item-price pair is displayed during the learning phase (ms). |
| `show_good_price_question` | number | `1` | Set to `0` to hide the "Is this a good price?" question during the learning phase. |
| `tutorial` | string | `true` | Set to `false` or `0` to skip the tutorial screens. |
| `images` | string | — | Set to `1` or `true` to show an item photograph (THINGS database best-picks) above each item during the tutorial example and the learning phase. The recognition phase stays word-only. |
| `stimuli_base_url` | string | `assets/prices/images/` | Base URL for the item photographs. The THINGS images are fair-use research stimuli hosted on a private URL outside this repository; only used when `images=1`. |
| `recognition_feedback` | string | — | Set to `1` or `true` to color the chosen button green/red by accuracy in the recognition phase. By default the selection is highlighted in a neutral color, giving no accuracy feedback. |
| `min_price_distance_usd` | number | `3.0` | Minimum separation between the correct price and distractor, expressed in USD. Automatically converted to the local currency equivalent using approximate exchange rates (see below). |
| `locale` | string | `en-GB` | BCP 47 locale tag (e.g. `en-GB`, `fr-FR`). Set to `auto` to detect from the browser. |
| `currency` | string | `GBP` | ISO 4217 currency code (e.g. `GBP`, `EUR`). Set to `auto` to infer from locale. |
| `excluded_items` | string | — | Comma-separated item names to exclude from this session. Used to enforce the within-day no-repeat rule: across up to 4 sessions per day, the item pool is drawn without replacement so no item appears twice on the same day. The calling server tracks which items have been used today and passes them here. |
| `used_item_prices` | string (JSON) | `{}` | JSON object mapping item names to arrays of prices previously paired with them, e.g. `{"Almonds":[3.27,5.82],"Cereal":[7.63]}`. Prevents the same item-price pair from being re-presented across the 28 longitudinal sessions. The calling server maintains this history and passes it here. |
| `webcam` | string | — | Set to `1` or `true` to enable optional camera recording. Participants see a consent prompt; if they accept, the front camera records and the video is saved locally at session end. |
| `webgazer` | string | — | Set to `1` or `true` to enable browser-based eye tracking via [WebGazer.js](https://github.com/brownhci/WebGazer). Exports gaze coordinates as CSV. Can be combined with `webcam=1`. |

### Price Generation Rules

- Prices are 3-digit values in the format `X.YZ` (one major-unit digit + two minor-unit digits), displayed in the local currency (e.g. `$5.82`, `£5.82`, `€5,82`).
- All three digits must be distinct (no repeated digits).
- No more than two of the three digits may be sequential (e.g. `$1.24` is valid; `$1.23` is not because 1-2-3 are three consecutive integers).
- The distractor price in the recognition phase is separated from the correct price by at least the local-currency equivalent of $3.00 USD (see Currency Localization below).

### Currency Localization

Prices are displayed in the participant's local currency. By default the locale is detected from the browser (`navigator.language`) and the currency is inferred automatically. Both can be overridden with URL parameters.

**Example URLs:**
- UK pilot: `?locale=en-GB` (auto-infers GBP, shows £ prices)
- Force currency only: `?currency=GBP`
- France: `?locale=fr-FR` (auto-infers EUR, formats as `5,82 €`)

**Distractor distance conversion.** The `min_price_distance_usd` parameter (default $3.00) is converted to the local currency using built-in approximate exchange rates, so the difficulty of the recognition phase stays comparable across locales:

| Currency | Rate | Min Gap | Note |
|---|---|---|---|
| USD | 1.00 | $3.00 | Reference |
| GBP | 0.79 | £2.37 | |
| EUR | 0.92 | €2.76 | |
| CHF | 0.88 | CHF 2.64 | |
| AUD | 1.55 | A$4.00 | Capped\* |
| CAD | 1.37 | C$4.00 | Capped\* |
| JPY | 150 | ¥400 | Capped\* |

\*Distances are capped at 4.0 internal units to keep distractor generation feasible within the 1–9 price range.

The exchange rates are approximate and embedded in the source. They do not need to be precise — their purpose is to keep the distractor distance perceptually similar across currencies, not to reflect live market rates.

**Supported locale → currency mappings:** en-US (USD), en-GB (GBP), en-AU (AUD), en-CA (CAD), en-NZ (NZD), en-IE/fr-FR/de-DE/es-ES/it-IT/nl-NL/pt-PT/fi-FI (EUR), fr-CA (CAD), fr-CH/de-CH/it-CH (CHF), pt-BR (BRL), es-MX (MXN), ja-JP (JPY), ko-KR (KRW), zh-CN (CNY), da-DK (DKK), sv-SE (SEK), nb-NO/nn-NO (NOK), and others. Unrecognised locales fall back to GBP.

### Trial Data Fields

Each recognition trial emits: `trial_index`, `item`, `correct_price`, `distractor_price`, `good_price_response` (1 = yes, 0 = no, 99 = no response, null = question hidden), `correct_position` (0 = top, 1 = bottom), `selected_position`, `is_correct`, `response_time_ms`, `learning_display_timestamp`, `recognition_display_timestamp`, `response_timestamp`, `locale`, and `currency`.

### Item Pool (40 items)

The pool contains common food and household items. 10 items are drawn per session.

**Food:** Almonds, Applesauce, Blueberries, Bread, Butter, Celery, Cereal, Cheese, Coffee, Cucumber, Flour, Gum, Hamburger, Jam, Limes, Peanut Butter, Pickles, Pineapple, Rolls, Salad, Sandwich, Spinach, Tortillas, Vegetable Oil, Zucchini

**Household & Personal Care:** Aluminum Foil, Batteries, Light Bulb, Napkins, Paper Towel, Pencils, Soap, Sponges, Toilet Paper Rolls, Aspirin, Deodorant, Floss, Lotion, Toothbrush

---

## FNAME (Face–Name–Occupation Task)

A Face–Name–Occupation associative memory task that tests face–name and face–occupation associative memory, plus relational inference. Participants learn face–name and face–occupation pairs, then must infer name↔occupation associations without seeing faces, and finally recognize correct pairings after a configurable delay. Based on the FNAME paradigm (Papp et al., 2021; Rentz et al., 2010).

### Phases

1. **Learn Names** — Each face is shown with a name; auto-advances after `learning_duration_ms`.
2. **Learn Occupations** — Same faces, now paired with occupations.
3. **Associative Inference** — "[Name]'s job is: ___?" with distractors drawn from the session's occupation pool. No faces shown.
4. **Delayed Recognition** — After a configurable delay, face + name/occupation pairs are shown; participant judges YES/NO if the pairing is correct. Includes both correct and distractor pairings, counterbalanced.

### URL Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `token` | string | — | Authentication token. When absent (along with `callback_url`), the assessment runs in debug mode and displays results on-screen. |
| `callback_url` | string | — | URL to POST results to when the assessment ends. |
| `number_of_pairs` | number | `6` | Number of face–name–occupation triplets to learn. |
| `number_of_distractors` | number | `2` | Number of wrong options in the inference and recognition phases. |
| `learning_duration_ms` | number | `5000` | Display duration per learning card (ms). Auto-advances; tap to advance early. |
| `delay_seconds` | number | `10` | Countdown delay between inference and recognition phases (s). Set to `0` to skip. |
| `show_tutorial` | string | `true` | Set to `false` or `0` to skip instruction screens before each phase. |
| `face_source` | string | `bundled` | Set to `api` to fetch random faces from 100k-faces instead of using the bundled curated set. |
| `webcam` | string | — | Set to `1` or `true` to enable optional camera recording. |
| `webgazer` | string | — | Set to `1` or `true` to enable browser-based eye tracking. |

### Trial Data Fields

**Inference trials:** `phase`, `trial_index`, `pair_index`, `face_id`, `correct_answer`, `user_response`, `is_correct`, `response_time_ms`, `distractor_options` (JSON array), `stimulus_type` (`name_to_occupation`).

**Recognition trials:** `phase`, `trial_index`, `pair_index`, `face_id`, `correct_answer` (`YES`/`NO`), `user_response`, `is_correct`, `response_time_ms`, `stimulus_type` (`face_name` or `face_occupation`).

### Face Stimulus Database

The assessment ships with 100 curated face images with demographic metadata (age, gender, skin tone). Faces are selected to balance gender (50/50) and maximize diversity across age bins and skin tones. The face pool can be expanded using the curation tools in `assessments/fname/tools/`.

---

## FNAME-Pairs (Face–Name Paired-Associate Recall)

A face–name paired-associate memory task designed for sleep-dependent memory consolidation studies. Participants study 20 face–name pairs, take an immediate cued-recall test, and — in a **separate session launched hours later** — a delayed cued-recall test on a deterministic subset of the pairs. Everything (pair identity, subset, lure sets, presentation orders) is reproducible from URL parameters plus the committed `lists.json`, so no client-side state needs to survive between sessions.

Stimuli are drawn from the [Chicago Face Database](https://www.chicagofaces.org/) (Ma, Correll, & Wittenbrink, 2015): neutral-expression targets with rated age 18–40 from the main CFD set.

### Phases

1. **Learning** (`phase=learning`, default) — Each of the 20 faces is shown with its name for `learning_duration_ms`, with a blank `isi_ms` between pairs, followed by an immediate cued-recall test (face shown, name recalled). Set `immediate_test=false` to end after study.
2. **Delayed recall** (`phase=delayed`) — Launched as a fresh session. Cued recall only, on the seeded-random subset defined by `subset_size` + `subset_seed` (defaults to all 20 pairs).

Response mode is `choice` (default; 4-alternative forced choice — the correct name plus 3 gender-matched lures from the same list. The lure set is fixed per pair across sessions, but the option order is re-randomized) or `typed` (free recall via keyboard; scored strictly and with an edit-distance-1 leniency).

**Learning-to-criterion mode** (`criterion_prop > 0`, e.g. `criterion_prop=0.6`): if the immediate test's lenient accuracy is below the criterion, the participant sees a feedback screen and completes another study–test round — restudying either only the missed pairs (`restudy_scope=missed`, default) or all pairs (`restudy_scope=all`), then retaking the full 20-pair test — until the criterion is met or `max_learning_rounds` is reached. Every trial row carries a `learning_round` field (1-based); presentation orders are re-randomized (deterministically) each round. This equates encoding strength across participants before a sleep/wake retention interval.

### URL Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `token` | string | — | Authentication token. When absent (along with `callback_url`), runs in debug mode and shows results on-screen. |
| `callback_url` | string | — | URL to POST results to when the assessment ends. |
| `phase` | string | `learning` | `learning` (study + immediate recall) or `delayed` (recall only). |
| `list` | number | `1` | Which of the 4 pre-constructed balanced lists (1–4). Must match across a participant's sessions. |
| `response_mode` | string | `choice` | `choice` (4-AFC) or `typed` (free recall). |
| `subset_size` | number | `20` | Number of pairs tested in the delayed phase. |
| `subset_seed` | number | `0` | Seed for the deterministic delayed subset. Must match across a participant's sessions. |
| `subset_complement` | string | `0` | Set to `1` to test the pairs NOT in the seeded subset — two delayed sessions with the same size/seed and complement `0`/`1` cover disjoint halves of the list. |
| `allow_skip` | string | `true` | Typed mode: show an "I don't know" button so participants can pass without guessing (recorded as `skipped=true`, scored incorrect). Empty submits are ignored while skip is available. |
| `immediate_test` | string | `true` | Set to `false`/`0` to skip the immediate recall test (avoids retrieval practice). |
| `criterion_prop` | number | `0` | Learning-to-criterion mode: minimum proportion correct (lenient) on the immediate test. Below it, another study–test round runs. `0` disables. |
| `max_learning_rounds` | number | `3` | Safety cap on study–test rounds in criterion mode; the task proceeds after this many rounds even below criterion. |
| `restudy_scope` | string | `missed` | Pairs restudied in rounds after the first: `missed` (only lenient-incorrect pairs) or `all`. The retest always covers all 20 pairs. |
| `learning_duration_ms` | number | `5000` | Display duration per pair during study (ms). |
| `isi_ms` | number | `500` | Blank interval between study items (ms). |
| `allow_tap_advance` | string | `false` | Allow tapping to advance study items early (off = fixed encoding time). |
| `feedback_enabled` | string | `false` | Show correctness feedback at test (off by default — a delayed retest follows). |
| `typed_lenient_distance` | number | `1` | Max Levenshtein distance counted as lenient-correct in typed mode. |
| `tutorial` | string | `true` | Set to `false`/`0` to skip instruction screens. |
| `stimuli_base_url` | string | `assets/fname-pairs/images/` | Base URL for the face images (see *Private image hosting*). |
| `embed` | string | — | Set to `1` for ESMira/iframe embed mode: results are posted to the parent window via `postMessage` instead of an HTTP callback. |
| `webcam` / `webgazer` / `light` | string | — | Set to `1`/`true` to enable optional camera recording, eye tracking, or ambient-light logging. |

### Sleep-study example

```text
# Evening (learning + immediate recall, list 2, 4AFC):
.../assessments/fname-pairs/?phase=learning&list=2&response_mode=choice&stimuli_base_url=https://myhost.example/r4nd0mSecret/

# Morning (delayed recall of 10 of the 20 pairs):
.../assessments/fname-pairs/?phase=delayed&list=2&response_mode=choice&subset_size=10&subset_seed=42&stimuli_base_url=https://myhost.example/r4nd0mSecret/
```

`list`, `subset_size`, and `subset_seed` must be identical across a participant's two sessions. The scheduler owns counterbalancing of `list` across participants/nights and the secret stimulus URL.

### Trial Data Fields

Every presentation is a row, discriminated by `trial_type` (`study` | `test`); fields not applicable to a row type are `null`.

`trial_type`, `phase`, `list_id`, `trial_index`, `pair_id`, `cfd_target`, `name_target`, `face_race`, `face_gender`, `face_age_rated`, `face_attractive`, `response_mode`, `subset_size`, `subset_seed`, `learning_round`, `study_position`, `test_position`, `display_timestamp`, `display_duration_ms`, `response_raw`, `response_normalized`, `options_json`, `selected_index`, `edit_distance`, `is_correct_strict`, `is_correct_lenient`, `rt_ms`, `response_timestamp`.

**Summary** (POSTed alongside trials, and in the `m2c2:complete` postMessage): `phase`, `list_id`, `response_mode`, `subset_size`, `subset_seed`, `n_study_trials`, `n_test_trials` (final round), `n_test_trials_total`, `n_learning_rounds`, `round_prop_correct_lenient` (per-round array), `criterion_prop`, `criterion_met`, `n_correct_strict`, `n_correct_lenient`, `prop_correct_strict`, `prop_correct_lenient` (accuracy and RTs refer to the **final** round), `mean_rt_ms`, `median_rt_ms`.

### Stimulus Construction

The 4 lists of 20 pairs are fixed in `assessments/fname-pairs/assets/fname-pairs/images/lists.json`, generated by `assessments/fname-pairs/tools/build_stimuli.py`:

- 80 CFD targets (neutral expression, rated age 18–40): 20 per race (Asian/Black/Latino/White), 10 male / 10 female per race.
- Each list: exactly 5 per race and 10M/10F, with rated age and attractiveness equalized across lists by swap optimization on equivalence criteria — all pairwise standardized mean differences |SMD| ≤ 0.05 (negligible-imbalance threshold 0.10, Austin 2009) and variance ratios ≤ 1.07, with distributional overlap (pairwise KS) and TOST equivalence bounds (Lakens 2017) reported in `tools/stimulus_report.md`.
- Names: 80 unique England & Wales first names from the ONS Baby names explorer, gender-matched (10 male / 10 female per list), selected by 20-year historical popularity (mean annual rank over the most recent 20 published years) and equated across lists *within gender* by same-gender hill-climb, with within-list pairwise Levenshtein distance ≥ 3 (so lenient typed scoring can never confuse two names in a list).

Regenerate with:

```bash
curl -L -o /tmp/cfd.zip https://cfd-website-downloads.s3.us-east-2.amazonaws.com/cfd.zip  # ~1.6 GB, requires CFD access agreement
uv run assessments/fname-pairs/tools/build_stimuli.py --cfd-zip /tmp/cfd.zip --inspect     # sanity-check workbook detection
uv run assessments/fname-pairs/tools/build_stimuli.py --cfd-zip /tmp/cfd.zip
uv run assessments/fname-pairs/tools/build_stimuli.py --reassign-names                     # keep faces; reassign ONS names
```

### Private Image Hosting

CFD terms of use do not permit redistribution, so the processed face images are **gitignored** and not served from this public repo. Deploy `assets/fname-pairs/images/*.jpg` to a host you control at an unguessable path and pass it at launch via `stimuli_base_url` (the host must allow cross-origin GET, or serve the task from the same origin). `lists.json` (names + demographics, no images) stays committed.

The provided deploy script publishes the images to a Netlify site with a random name and a random path segment, with CORS enabled and indexing disabled (`_headers`: `Access-Control-Allow-Origin: *`, `X-Robots-Tag: noindex`; `robots.txt`: disallow all). Access control is URL secrecy — the base URL lives only in the launch links your scheduler sends and in the gitignored config:

```bash
# one-time: create assessments/fname-pairs/tools/netlify.local.env (gitignored) with
#   NETLIFY_SITE_NAME=<random site name>   NETLIFY_ACCOUNT_SLUG=<team slug>   SECRET_PATH=<random hex>
assessments/fname-pairs/tools/deploy_stimuli.sh   # requires `netlify login`
# prints: stimuli_base_url: https://<site>.netlify.app/<secret>/
```

Re-run the script after regenerating stimuli; the same URL keeps working (images are content-hashed by Netlify on each deploy).

---

## mVLT (Mobile Verbal Learning Test)

An open-source touch-based verbal learning and memory test, inspired by the mVLT paradigm (Moore et al., 2020). Participants study a list of 12 words for 30 seconds, then perform a YES/NO recognition test on 24 words (12 targets + 12 distractors). This study-recognition cycle repeats 3 times to measure a within-person learning curve. Signal detection metrics (d-prime) are computed automatically.

Word lists are generated from [SUBTLEX-UK](https://doi.org/10.1080/17470218.2013.850521) frequency norms (van Heuven et al., 2014), with 14 pre-built lists of frequency-matched nouns for longitudinal use (one list per day over 14 days).

### URL Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `token` | string | — | Authentication token. When absent (along with `callback_url`), the assessment runs in debug mode and displays results on-screen. |
| `callback_url` | string | — | URL to POST results to when the assessment ends. |
| `word_list_index` | number | `0` | Which of the 14 pre-built word lists to use (0–13). Wraps via modulo for indices > 13. |
| `number_of_trials` | number | `3` | Number of study-recognition cycles. |
| `study_duration_ms` | number | `30000` | How long the word list is displayed in the study phase (ms). |
| `number_of_distractors` | number | `12` | Number of lure words in the recognition phase. |
| `show_feedback` | string | `false` | Set to `true` or `1` to show correct/incorrect feedback after each recognition response. |
| `recognition_timeout_ms` | number | `0` | Maximum time per recognition item in ms. `0` = unlimited. |
| `inter_trial_delay_ms` | number | `3000` | Pause duration between trials (ms). |
| `tutorial` | string | `true` | Set to `false` or `0` to skip the tutorial screens. |
| `webcam` | string | — | Set to `1` or `true` to enable optional camera recording. |
| `webgazer` | string | — | Set to `1` or `true` to enable browser-based eye tracking. |

### Trial Data Fields

Each recognition item emits: `trial_number` (1–3), `trial_index` (global 0-based), `item_index` (position in recognition sequence), `word`, `word_type` (`target`/`distractor`), `response` (`yes`/`no`/`none`), `is_correct`, `response_time_ms`, `word_display_timestamp`, `response_timestamp`, `study_display_timestamp`, `list_index`, `timed_out`.

### Summary Statistics

On session end, the following summary is computed and included in the POST body (or shown in debug mode):

- **Per trial:** hits, false alarms, misses, correct rejections, total correct, d-prime (Hautus log-linear correction)
- **Learning curve:** array of total correct per trial (e.g. `[18, 21, 23]`)
- **Mean total correct** across all trials

### Word List Construction (De Vent Framework)

The 14 word lists (336 unique nouns) were generated using the [De Vent et al. (2022)](https://doi.org/10.1080/13803395.2023.2166904) framework for constructing parallel RAVLT-type word lists, matching on 10 of their 13 psycholinguistic criteria:

| # | Criterion | Source | Method |
|---|---|---|---|
| 1 | Word frequency | SUBTLEX-UK | log10(freq/million) 0.8–2.5, round-robin balanced |
| 2 | Word length | Computed | 3–8 letters |
| 3 | Syllables | Estimated | Heuristic syllable counter |
| 4 | Phonemes | Estimated | Orthography-based approximation |
| 5 | Concreteness | Glasgow Norms | ≥ 3.0 filter, balanced across lists |
| 6 | Imageability | Glasgow Norms | Balanced across lists |
| 7 | Familiarity | Glasgow Norms | Balanced across lists |
| 8 | Age of acquisition | Glasgow Norms | Balanced across lists |
| 9 | Valence | Glasgow Norms | Neutral range 2.5–7.5, balanced |
| 10 | Arousal | Glasgow Norms | Balanced across lists |
| 11 | Semantic relatedness | — | Enforced by noun-only selection + no clustering |
| 12 | Orthographic N-size | — | Not yet implemented |
| 13 | Phonological N-density | — | Not yet implemented |

**Data sources:**
- [SUBTLEX-UK](https://doi.org/10.1080/17470218.2013.850521) (van Heuven et al., 2014): word frequency, POS, capitalization frequency
- [Glasgow Norms](https://doi.org/10.3758/s13428-018-1099-3) (Scott et al., 2019): concreteness, imageability, familiarity, AoA, valence, arousal, dominance
- [Brysbaert et al. (2014)](https://doi.org/10.3758/s13428-013-0403-5): concreteness ratings for 40k words (fallback)

**Additional filters:** nouns only (SUBTLEX-UK DomPoS), proper nouns excluded (>50% capitalized), no plurals/past tense/gerunds, no offensive words. After filtering: **1,074 candidate nouns** with full psycholinguistic norms.

### Maximum Balanced Lists

The candidate pool of 1,074 nouns supports up to 44 non-overlapping, De Vent-balanced lists. Balance quality degrades gracefully as more of the pool is used:

| Lists | Words | Days of testing | Freq dev | Conc dev | Img dev | AoA dev | Val dev | Quality |
|---|---|---|---|---|---|---|---|---|
| **14** | 336 | 2 weeks | 0.002 | 0.38 | 0.48 | 0.30 | 0.41 | Excellent |
| **28** | 672 | 4 weeks | 0.011 | 0.41 | 0.45 | 0.47 | 0.49 | Very good |
| **36** | 864 | ~5 weeks | 0.024 | 0.52 | 0.53 | 0.42 | 0.44 | Good |
| **44** | 1,056 | ~6 weeks | 0.037 | 0.65 | 0.67 | 0.69 | 0.43 | Acceptable |

The default deployment ships 14 lists (matching Moore et al.'s 14-day protocol). To generate more lists, edit the `num_lists` parameter in the generation script.

### Regenerating Word Lists

Download the required norm databases into `assessments/mvlt/scripts/`:
- [SUBTLEX-UK.xlsx](https://psychology.nottingham.ac.uk/subtlex-uk/SUBTLEX-UK.xlsx.zip) (required)
- [Glasgow Norms CSV](https://doi.org/10.3758/s13428-018-1099-3) — Supplementary Material 2 (required)
- [Brysbaert concreteness](https://github.com/ArtsEngine/concreteness) (optional fallback)

Then run:

```bash
uv run --with openpyxl python3 assessments/mvlt/scripts/generate_word_lists.py
```
