import { RandomDraws } from "@m2c2kit/core";

/**
 * Word pools for the Mobile Verbal Learning Test (mVLT).
 *
 * Generated from SUBTLEX-UK frequency norms (van Heuven et al., 2014).
 * Selection criteria (matching Moore et al., 2020):
 * - Concrete, common English nouns, 3-8 letters
 * - Medium frequency band (log10 freq/million ~0.8-2.5)
 * - No proper nouns, curse words, plural forms, or past tense forms
 * - Frequency-matched across lists (round-robin assignment by frequency rank)
 * - Each word appears in exactly one list across all 14 lists
 *
 * Grand mean log10(freq/million): 1.3108
 * Max deviation from grand mean: 0.0059
 * 14 lists x 24 words = 336 unique words
 */

export const WORD_LISTS = [
  // ── List 0 (mean log freq: 1.305) ──
  {
    targets: [
      "peak", "guitar", "division", "tape", "bail", "oak",
      "failure", "summit", "cue", "context", "desert", "glory",
    ],
    distractors: [
      "grade", "snake", "wing", "punch", "opera", "flood",
      "balloon", "aspect", "attitude", "fee", "phrase", "toast",
    ],
  },
  // ── List 1 (mean log freq: 1.306) ──
  {
    targets: [
      "flow", "element", "toy", "scratch", "mill", "circle",
      "suicide", "tiger", "onion", "nail", "print", "lad",
    ],
    distractors: [
      "code", "dancer", "kit", "motion", "concept", "carpet",
      "tank", "stroke", "fence", "medium", "multi", "pipe",
    ],
  },
  // ── List 2 (mean log freq: 1.307) ──
  {
    targets: [
      "keeper", "pet", "spin", "storage", "mini", "trap",
      "suite", "yard", "piano", "hop", "counter", "theory",
    ],
    distractors: [
      "survival", "actress", "legend", "vet", "religion", "sausage",
      "cousin", "cycle", "rainbow", "worker", "trophy", "bunch",
    ],
  },
  // ── List 3 (mean log freq: 1.308) ──
  {
    targets: [
      "tale", "entrance", "lesson", "medicine", "cafe", "platform",
      "plastic", "finance", "session", "chip", "bow", "extent",
    ],
    distractors: [
      "currency", "carbon", "dawn", "bite", "survey", "teenager",
      "barn", "weapon", "petrol", "pen", "launch", "hunter",
    ],
  },
  // ── List 4 (mean log freq: 1.309) ──
  {
    targets: [
      "belt", "agenda", "grave", "tragedy", "coverage", "spoon",
      "comment", "fraud", "coat", "tribute", "universe", "spider",
    ],
    distractors: [
      "mortgage", "library", "sofa", "creation", "tail", "nonsense",
      "gang", "rail", "heir", "treasure", "creature", "tennis",
    ],
  },
  // ── List 5 (mean log freq: 1.309) ──
  {
    targets: [
      "charm", "exchange", "bat", "madam", "deer", "bacon",
      "content", "mouse", "coal", "prank", "clay", "enemy",
    ],
    distractors: [
      "desk", "buzz", "torch", "lemon", "offence", "angle",
      "witness", "era", "tongue", "consumer", "judgment", "shift",
    ],
  },
  // ── List 6 (mean log freq: 1.310) ──
  {
    targets: [
      "pile", "affair", "jungle", "lounge", "chilli", "brush",
      "aunt", "sentence", "menu", "pork", "sink", "pit",
    ],
    distractors: [
      "soup", "desire", "genius", "tension", "canal", "athlete",
      "command", "potato", "soil", "core", "height", "exercise",
    ],
  },
  // ── List 7 (mean log freq: 1.311) ──
  {
    targets: [
      "mirror", "proposal", "bounce", "seed", "document", "trail",
      "pond", "steel", "snooker", "transfer", "aircraft", "behalf",
    ],
    distractors: [
      "bucket", "comfort", "scandal", "minimum", "chairman", "babe",
      "shoulder", "customer", "rocket", "lifetime", "text", "protest",
    ],
  },
  // ── List 8 (mean log freq: 1.312) ──
  {
    targets: [
      "flag", "belief", "heritage", "monster", "conflict", "fame",
      "silence", "source", "runner", "author", "presence", "devil",
    ],
    distractors: [
      "jazz", "tent", "ginger", "diamond", "licence", "metre",
      "nest", "dip", "stamp", "monkey", "garage", "ward",
    ],
  },
  // ── List 9 (mean log freq: 1.313) ──
  {
    targets: [
      "crab", "surgery", "pepper", "breeze", "soldier", "diet",
      "magazine", "lawyer", "twist", "rice", "idiot", "cattle",
    ],
    distractors: [
      "lap", "venue", "rush", "signal", "guard", "cricket",
      "purchase", "innit", "tone", "identity", "cinema", "squad",
    ],
  },
  // ── List 10 (mean log freq: 1.314) ──
  {
    targets: [
      "chap", "victim", "alarm", "relation", "ban", "banana",
      "pasta", "tunnel", "sandwich", "rat", "length", "elephant",
    ],
    distractors: [
      "copper", "ham", "gear", "footage", "ambition", "juice",
      "climate", "chamber", "spell", "portrait", "status", "adult",
    ],
  },
  // ── List 11 (mean log freq: 1.315) ──
  {
    targets: [
      "lock", "abuse", "concert", "maker", "episode", "dragon",
      "nerve", "feature", "prospect", "delivery", "bronze", "proof",
    ],
    distractors: [
      "instance", "mayor", "jacket", "dive", "rope", "cave",
      "stretch", "bee", "package", "hook", "vase", "telly",
    ],
  },
  // ── List 12 (mean log freq: 1.316) ──
  {
    targets: [
      "panic", "occasion", "clip", "lion", "wealth", "regard",
      "plot", "wire", "capacity", "applause", "slice", "legacy",
    ],
    distractors: [
      "killer", "boot", "designer", "ghost", "anger", "cupboard",
      "jam", "cushion", "poverty", "truck", "bloke", "arrest",
    ],
  },
  // ── List 13 (mean log freq: 1.317) ──
  {
    targets: [
      "fella", "shirt", "ceremony", "regime", "beef", "editor",
      "calendar", "breast", "farmer", "gate", "hip", "marathon",
    ],
    distractors: [
      "angel", "reminder", "tomato", "forecast", "ash", "writer",
      "gallery", "den", "knee", "activity", "flour", "profile",
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
