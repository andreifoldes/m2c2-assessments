# m2c2-assessments

Cognitive assessments hosted on GitHub Pages, built with [m2c2kit](https://github.com/m2c2-project/m2c2kit).

## Live Demos

| Assessment | Description | Duration (s) | Source | Link |
|---|---|---|---|---|
| **PVT-BA** | Adaptive Psychomotor Vigilance Test — measures sustained attention and reaction time | ≤180 (adaptive) | [Basner, 2022](https://doi.org/10.1093/sleepadvances/zpac038) — custom implementation | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/pvt-ba/) |
| **Color Dots** | Measures processing speed by comparing colored dots | ~60 | [m2c2kit](https://m2c2-project.github.io/m2c2kit/) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-color-dots@0.8.33/) |
| **Symbol Search** | Measures processing speed by matching symbols | ~60 | [m2c2kit](https://m2c2-project.github.io/m2c2kit/) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-symbol-search@0.8.33/) |
| **Grid Memory** | Measures spatial working memory using a grid pattern | ~240 | [m2c2kit](https://m2c2-project.github.io/m2c2kit/) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-grid-memory@0.8.33/) |
| **Color Shapes** | Measures executive function with color and shape matching | ~90 | [m2c2kit](https://m2c2-project.github.io/m2c2kit/) | [Launch](https://andreifoldes.github.io/m2c2-assessments/dist/assessments/@m2c2kit/assessment-color-shapes@0.8.33/) |
| **Prices** | Associative memory — learn item-price pairs and recognize them | ~120 | [ARC](https://github.com/jasonhass/Ambulatory-Research-in-Cognition) · [Nicosia et al., 2022](https://doi.org/10.1017/S135561772200042X) — custom implementation | [Launch](https://andreifoldes.github.io/m2c2-assessments/assessments/prices/) |

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
| `min_price_distance_usd` | number | `3.0` | Minimum separation between the correct price and distractor, expressed in USD. Automatically converted to the local currency equivalent using approximate exchange rates (see below). |
| `locale` | string | `en-GB` | BCP 47 locale tag (e.g. `en-GB`, `fr-FR`). Set to `auto` to detect from the browser. |
| `currency` | string | `GBP` | ISO 4217 currency code (e.g. `GBP`, `EUR`). Set to `auto` to infer from locale. |
| `excluded_items` | string | — | Comma-separated item names to exclude from this session. Used to enforce the within-day no-repeat rule: across up to 4 sessions per day, the 40-item pool is drawn without replacement so no item appears twice on the same day. The calling server tracks which items have been used today and passes them here. |
| `used_item_prices` | string (JSON) | `{}` | JSON object mapping item names to arrays of prices previously paired with them, e.g. `{"Almonds":[3.27,5.82],"Cereal":[7.63]}`. Prevents the same item-price pair from being re-presented across the 28 longitudinal sessions. The calling server maintains this history and passes it here. |

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

**Food:** Almonds, Applesauce, Blueberries, Cashews, Celery, Cereal, Cheeseburger, Cooking Spray, Cucumber, Limes, Noodles, Pineapple, Ramen, Rolls, Salad, Salsa, Sandwich, Spinach, Tortillas, Vegetable Oil, Waffles, Zucchini

**Household & Personal Care:** Aluminum Foil, Batteries, Bleach, Detergent, Dish Soap, Dryer Sheets, Light Bulbs, Napkins, Paper Towels, Pencils, Plastic Wrap, Sponge, Toilet Paper, Trash Bags, Aspirin, Conditioner, Floss, Lotion
