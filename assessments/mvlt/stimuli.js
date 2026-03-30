import { RandomDraws } from "@m2c2kit/core";

/**
 * Word pools for the Mobile Verbal Learning Test (mVLT).
 *
 * Generated using the De Vent et al. (2022) framework for constructing
 * parallel RAVLT-type word lists, matching on 13 psycholinguistic criteria.
 *
 * Data sources:
 *   - SUBTLEX-UK (van Heuven et al., 2014): word frequency, POS
 *   - Glasgow Norms (Scott et al., 2019): concreteness, imageability,
 *     familiarity, AoA, valence, arousal, dominance
 *   - Brysbaert et al. (2014): concreteness ratings (fallback)
 *
 * Selection criteria:
 *   - Nouns only (SUBTLEX-UK DomPoS), no proper nouns
 *   - 3-8 letters, no plurals/past tense/gerunds
 *   - Medium frequency (log10 freq/million 0.8-2.5)
 *   - Concrete words (Glasgow CNC >= 3.0)
 *   - Neutral valence (Glasgow VAL 2.5-7.5)
 *   - Full Glasgow norms coverage required
 *
 * Balancing results:
 *   Grand mean log10(freq/million): 1.3486 (max dev: 0.0022)
 *   concreteness: mean=5.50, max dev=0.381
 *   imageability: mean=5.55, max dev=0.480
 *   familiarity: mean=5.72, max dev=0.280
 *   aoa: mean=3.40, max dev=0.299
 *   valence: mean=5.35, max dev=0.406
 *   arousal: mean=4.47, max dev=0.342
 *   length: mean=5.27, max dev=0.649
 *   syllables: mean=1.57, max dev=0.342
 *   336 unique words across 14 lists
 */

export const WORD_LISTS = [
  // ── List 0 (freq=1.348, conc=5.42, img=5.53, aoa=3.46) ──
  {
    targets: [
      "status", "fence", "comment", "mass", "piano", "silence",
      "carpet", "shadow", "mouse", "pet", "document", "library",
    ],
    distractors: [
      "patrol", "relation", "gallery", "stadium", "crab", "rival",
      "oak", "ticket", "steam", "bell", "activity", "sandwich",
    ],
  },
  // ── List 1 (freq=1.349, conc=5.12, img=5.07, aoa=3.54) ──
  {
    targets: [
      "bounce", "comfort", "feature", "metre", "session", "alcohol",
      "angle", "jet", "tape", "texture", "pie", "chain",
    ],
    distractors: [
      "aid", "soldier", "oxygen", "flour", "tune", "bee",
      "content", "code", "toast", "pile", "outcome", "shell",
    ],
  },
  // ── List 2 (freq=1.349, conc=5.39, img=5.37, aoa=3.64) ──
  {
    targets: [
      "crown", "choir", "finance", "nurse", "sentence", "cricket",
      "jam", "comedy", "coach", "stroke", "boot", "manner",
    ],
    distractors: [
      "torch", "storage", "editor", "core", "zoo", "jacket",
      "jungle", "boost", "stake", "heir", "text", "chest",
    ],
  },
  // ── List 3 (freq=1.348, conc=5.77, img=5.79, aoa=3.22) ──
  {
    targets: [
      "fridge", "photo", "brush", "squad", "bloke", "mirror",
      "ham", "wheel", "load", "counter", "cattle", "tale",
    ],
    distractors: [
      "cafe", "maximum", "dust", "gear", "straw", "episode",
      "sofa", "elephant", "oven", "scrum", "gym", "finger",
    ],
  },
  // ── List 4 (freq=1.351, conc=5.17, img=5.21, aoa=3.45) ──
  {
    targets: [
      "breast", "farmer", "potato", "offence", "patch", "pound",
      "phrase", "bail", "toilet", "tension", "lock", "flow",
    ],
    distractors: [
      "profile", "defeat", "runner", "medicine", "pepper", "diamond",
      "nail", "theme", "ear", "reminder", "wing", "drama",
    ],
  },
  // ── List 5 (freq=1.350, conc=5.43, img=5.47, aoa=3.42) ──
  {
    targets: [
      "ward", "calendar", "welfare", "device", "spell", "pool",
      "guitar", "pilot", "regime", "bone", "swing", "adult",
    ],
    distractors: [
      "concert", "chip", "medium", "creature", "coat", "jazz",
      "youth", "cushion", "bass", "bacon", "shirt", "dancer",
    ],
  },
  // ── List 6 (freq=1.348, conc=5.60, img=5.56, aoa=3.70) ──
  {
    targets: [
      "bungalow", "print", "pole", "tribute", "deer", "guard",
      "universe", "tail", "poll", "portrait", "vase", "parade",
    ],
    distractors: [
      "bow", "path", "soil", "rent", "cap", "struggle",
      "lemon", "builder", "agent", "motor", "tower", "incident",
    ],
  },
  // ── List 7 (freq=1.347, conc=5.71, img=5.77, aoa=3.25) ──
  {
    targets: [
      "onion", "taxi", "stretch", "source", "signal", "punch",
      "page", "contract", "flood", "truck", "traffic", "dessert",
    ],
    distractors: [
      "breeze", "circle", "rail", "slide", "actress", "gate",
      "rice", "brass", "yard", "measure", "engine", "lion",
    ],
  },
  // ── List 8 (freq=1.349, conc=5.68, img=5.90, aoa=3.13) ──
  {
    targets: [
      "aunt", "vehicle", "wire", "occasion", "snake", "mill",
      "pond", "spider", "storm", "spin", "pipe", "skill",
    ],
    distractors: [
      "wave", "vet", "pork", "shark", "tennis", "anger",
      "golf", "rat", "motion", "ocean", "cycle", "pastry",
    ],
  },
  // ── List 9 (freq=1.347, conc=5.61, img=5.77, aoa=3.46) ──
  {
    targets: [
      "stamp", "tank", "cottage", "launch", "grey", "lesson",
      "web", "airport", "desk", "climate", "host", "soup",
    ],
    distractors: [
      "lad", "cinema", "lawyer", "hurry", "dragon", "pizza",
      "carbon", "currency", "spoon", "seed", "tent", "tube",
    ],
  },
  // ── List 10 (freq=1.349, conc=5.58, img=5.49, aoa=3.20) ──
  {
    targets: [
      "tone", "knife", "rabbit", "sausage", "trap", "tomato",
      "dive", "proof", "steel", "costume", "petrol", "copy",
    ],
    distractors: [
      "pension", "bull", "cow", "firm", "grade", "monster",
      "bat", "package", "net", "beer", "iron", "barn",
    ],
  },
  // ── List 11 (freq=1.347, conc=5.43, img=5.43, aoa=3.54) ──
  {
    targets: [
      "data", "sink", "pen", "ban", "symbol", "folk",
      "length", "novel", "cell", "duck", "leaf", "cave",
    ],
    distractors: [
      "dawn", "loan", "canal", "wealth", "album", "error",
      "liquid", "salad", "penny", "pig", "singer", "bronze",
    ],
  },
  // ── List 12 (freq=1.350, conc=5.45, img=5.51, aoa=3.44) ──
  {
    targets: [
      "network", "designer", "minimum", "object", "belt", "bench",
      "festival", "autumn", "beef", "sail", "author", "magazine",
    ],
    distractors: [
      "rhythm", "fool", "banana", "lake", "protest", "nest",
      "reporter", "pasta", "tongue", "video", "freeze", "smoke",
    ],
  },
  // ── List 13 (freq=1.350, conc=5.67, img=5.89, aoa=3.18) ──
  {
    targets: [
      "writer", "actor", "boom", "ghost", "rocket", "monkey",
      "exercise", "surgery", "button", "seal", "stomach", "hook",
    ],
    distractors: [
      "plot", "desert", "port", "bride", "pin", "tiger",
      "salmon", "jury", "inch", "toy", "section", "balloon",
    ],
  },
];

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = RandomDraws.singleFromRange(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getWordList(listIndex) {
  return WORD_LISTS[listIndex % WORD_LISTS.length];
}

export function buildRecognitionSequence(targets, distractors) {
  const items = [
    ...targets.map((word) => ({ word, wordType: "target" })),
    ...distractors.map((word) => ({ word, wordType: "distractor" })),
  ];
  return shuffleArray(items);
}
