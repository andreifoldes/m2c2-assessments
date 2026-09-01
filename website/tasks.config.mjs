/**
 * Manifest for the documentation generator (scripts/generate-docs.mjs).
 *
 * Parameter tables are NOT maintained here — they are extracted from each
 * task's source code (`defaultParameters` schema + the URL keys the launch
 * wrapper reads). This file only holds prose that cannot be derived from
 * code: task blurbs, citations, and descriptions for wrapper-level URL
 * parameters that have no schema entry in the source.
 */

export const SITE_BASE = "https://andreifoldes.github.io/m2c2-assessments";

/**
 * Descriptions for URL parameters handled by the launch wrappers
 * (index.js) rather than by the assessment's parameter schema.
 */
export const WRAPPER_PARAM_DOCS = {
  token: {
    type: "string",
    default: "—",
    description:
      "Authentication token for results submission. When absent (along with `callback_url`), the assessment runs in debug mode and displays results on-screen instead of submitting them.",
  },
  callback_url: {
    type: "string",
    default: "—",
    description: "URL to POST results to when the assessment ends.",
  },
  show_end_screen: {
    type: "string",
    default: "true",
    description:
      "Set to `false` or `0` to suppress the green \"Assessment Complete\" screen after results are submitted. A Telegram WebView closes immediately instead of showing the confirmation.",
  },
  tutorial: {
    type: "string",
    default: "true",
    description:
      "Set to `false` or `0` to skip the tutorial screens (alias for the `show_tutorial` assessment parameter).",
  },
  show_tutorial: {
    type: "string",
    default: "true",
    description: "Set to `false` or `0` to skip the tutorial/instruction screens.",
  },
  webcam: {
    type: "string",
    default: "—",
    description:
      "Set to `1` or `true` to enable optional camera recording. Participants see a consent prompt; if they accept, the front camera records and the video is saved locally to their device at session end.",
  },
  webgazer: {
    type: "string",
    default: "—",
    description:
      "Set to `1` or `true` to enable browser-based eye tracking via [WebGazer.js](https://github.com/brownhci/WebGazer). Participants see a consent prompt, then a 5-point gaze calibration. Gaze coordinates are recorded throughout the task and exported as a CSV file at session end. Can be combined with `webcam=1`.",
  },
  light: {
    type: "string",
    default: "—",
    description:
      "Set to `1` or `true` to enable ambient light sensing (where the browser supports the AmbientLightSensor API). Participants see a consent prompt; lux readings are recorded during the task and exported at session end.",
  },
  embed: {
    type: "string",
    default: "—",
    description:
      "Set to `1` for embedded mode (e.g. an ESMira PWA iframe): on completion, results are posted to the parent window via `postMessage` instead of an HTTP callback.",
  },
  number_of_trials: {
    type: "integer",
    default: "—",
    description: "Override the number of trials to run.",
  },
  list: {
    type: "number",
    default: "1",
    description:
      "Which of the 4 pre-constructed balanced lists to use (1–4). Maps to the `list_id` assessment parameter; must match across a participant's sessions.",
  },
  stimuli_base_url: {
    type: "string",
    default: "assets/fname-pairs/images/",
    description:
      "Base URL for the face images. The CFD-derived images are not redistributable and are deployed out-of-band (see the repo README, *FNAME-Pairs* section); point this at your private stimulus host.",
  },
  face_source: {
    type: "string",
    default: "bundled",
    description:
      "Set to `api` to fetch random faces from the 100k-faces API instead of using the bundled curated face set.",
  },
  number_of_faces_to_prefetch: {
    type: "number",
    default: "—",
    description:
      "How many face images to prefetch before the task starts (only relevant with `face_source=api`).",
  },
};

/**
 * One entry per documented task, in sidebar order.
 *
 * kind: "custom"   — source in assessments/<id>/, schema in `sourceFile`,
 *                    URL-settable game params = whitelist read by `wrapperFile`.
 *       "m2c2kit"  — npm assessment deployed via the m2c2kit static site;
 *                    the wrapper forwards ALL query parameters to the game,
 *                    so every schema parameter is URL-settable.
 */
export const TASKS = [
  {
    id: "pvt-ba",
    title: "PVT-BA",
    kind: "custom",
    duration: "≤ 180 s (adaptive)",
    launchPath: "assessments/pvt-ba/",
    sourceFile: "assessments/pvt-ba/pvt-ba.js",
    wrapperFile: "assessments/pvt-ba/index.js",
    blurb:
      "An adaptive Psychomotor Vigilance Test that measures sustained attention and reaction time. A millisecond counter appears after a random delay; the participant taps the screen as quickly as possible. A Bayesian sequential algorithm classifies vigilance into HIGH, MEDIUM, or LOW, often terminating early once the posterior probability exceeds a decision threshold.",
    reference:
      "[Basner, 2022](https://doi.org/10.1093/sleepadvances/zpac038) — custom implementation",
  },
  {
    id: "prices",
    title: "Prices",
    kind: "custom",
    duration: "~120 s",
    launchPath: "assessments/prices/",
    sourceFile: "assessments/prices/prices.js",
    wrapperFile: "assessments/prices/index.js",
    blurb:
      "An associative memory task with a learning and a recognition phase. Participants are shown item–price pairs and asked to remember them, then tested on which price was paired with each item. Prices are localized to the participant's currency.",
    reference:
      "[ARC](https://github.com/jasonhass/Ambulatory-Research-in-Cognition) · [Nicosia et al., 2022](https://doi.org/10.1017/S135561772200042X) — custom implementation",
  },
  {
    id: "fname",
    title: "FNAME",
    kind: "custom",
    duration: "~180 s",
    launchPath: "assessments/fname/",
    sourceFile: "assessments/fname/fname.js",
    wrapperFile: "assessments/fname/index.js",
    blurb:
      "A Face–Name–Occupation associative memory task. Participants learn face–name and face–occupation pairs, then must infer name↔occupation associations without seeing faces, and finally recognize correct pairings after a configurable delay.",
    reference:
      "[Papp et al., 2021](https://doi.org/10.1002/dad2.12243) · [Rentz et al., 2010](https://doi.org/10.1002/ana.21904) — custom implementation",
  },
  {
    id: "fname-pairs",
    title: "FNAME-Pairs",
    kind: "custom",
    duration: "~300 s learning / ~120 s delayed",
    launchPath: "assessments/fname-pairs/",
    sourceFile: "assessments/fname-pairs/fname-pairs.js",
    wrapperFile: "assessments/fname-pairs/index.js",
    blurb:
      "A face–name paired-associate memory task designed for sleep-dependent memory consolidation studies. Participants study 20 face–name pairs from the Chicago Face Database, take an immediate cued-recall test, and — in a separate session launched hours later — a delayed cued-recall test on a deterministic seeded subset of the pairs. Pair identity, subsets, lure sets, and presentation orders are all reproducible from URL parameters.",
    reference:
      "[Ma, Correll & Wittenbrink, 2015](https://doi.org/10.3758/s13428-014-0532-5) (stimuli) — custom implementation",
    extraExamples: [
      {
        comment:
          "Sleep study 1/3 — evening: initial learning + immediate recall (list 1, typed)",
        query:
          "phase=learning&list=1&response_mode=typed&stimuli_base_url=<STIMULI_BASE_URL>",
      },
      {
        comment:
          "Sleep study 2/3 — morning: delayed recall of half the list (10 of 20 pairs; same list/size/seed as the evening session)",
        query:
          "phase=delayed&list=1&response_mode=typed&subset_size=10&subset_seed=42&stimuli_base_url=<STIMULI_BASE_URL>",
      },
      {
        comment:
          "Sleep study 3/3 — later timepoint: delayed recall of the OTHER half (complement of the same seeded subset)",
        query:
          "phase=delayed&list=1&response_mode=typed&subset_size=10&subset_seed=42&subset_complement=1&stimuli_base_url=<STIMULI_BASE_URL>",
      },
      {
        comment:
          "Learning-to-criterion: repeat study-test rounds until 60% immediate recall (max 3 rounds)",
        query:
          "phase=learning&list=1&criterion_prop=0.6&max_learning_rounds=3&stimuli_base_url=<STIMULI_BASE_URL>",
      },
    ],
  },
  {
    id: "mvlt",
    title: "mVLT",
    kind: "custom",
    duration: "~300 s",
    launchPath: "assessments/mvlt/",
    sourceFile: "assessments/mvlt/mvlt.js",
    wrapperFile: "assessments/mvlt/index.js",
    blurb:
      "A Mobile Verbal Learning Test. Participants study a list of 12 words, then perform a YES/NO recognition test on targets plus distractors. The study–recognition cycle repeats to measure a within-person learning curve; d-prime is computed automatically.",
    reference:
      "[Moore et al., 2020](https://doi.org/10.1002/mpr.1859) — custom implementation",
  },
  {
    id: "symbol-search",
    title: "Symbol Search",
    kind: "m2c2kit",
    pkg: "assessment-symbol-search",
    duration: "~60 s",
    blurb:
      "A processing speed task from the m2c2kit library. Participants see a set of symbol pairs at the top of the screen and must quickly identify which of two bottom pairs matches one of the top pairs.",
    reference: "[m2c2kit](https://m2c2-project.github.io/m2c2kit/)",
  },
  {
    id: "color-dots",
    title: "Color Dots",
    kind: "m2c2kit",
    pkg: "assessment-color-dots",
    duration: "~60 s",
    blurb:
      "A processing speed task from the m2c2kit library. Participants briefly see an array of colored dots, then after a short blank interval must recall the color of a specific dot. Measures speed and accuracy of color–location binding.",
    reference: "[m2c2kit](https://m2c2-project.github.io/m2c2kit/)",
  },
  {
    id: "grid-memory",
    title: "Grid Memory",
    kind: "m2c2kit",
    pkg: "assessment-grid-memory",
    duration: "~240 s",
    blurb:
      "A spatial working memory task from the m2c2kit library. Participants see dots placed on a grid, perform an interference task, and then recall the dot locations from memory.",
    reference: "[m2c2kit](https://m2c2-project.github.io/m2c2kit/)",
  },
  {
    id: "color-shapes",
    title: "Color Shapes",
    kind: "m2c2kit",
    pkg: "assessment-color-shapes",
    duration: "~90 s",
    blurb:
      "An executive function task from the m2c2kit library. Participants see colored shapes on a grid, then after a brief delay must judge whether the shapes have the same or different colors as before.",
    reference: "[m2c2kit](https://m2c2-project.github.io/m2c2kit/)",
  },
];
