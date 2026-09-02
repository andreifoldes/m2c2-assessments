// Deterministic runtime helpers for fname-pairs.
//
// The delayed session is a fresh page load hours after learning, so the
// tested subset, lure sets, and option orders must be reproducible from URL
// parameters alone. Every stochastic choice therefore flows through
// mulberry32 with an explicit seed — never Math.random or RandomDraws.
// This module is dependency-free so it can also be smoke-tested in Node.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a over the joined string parts -> 32-bit seed.
export function hashSeed(...parts) {
  const s = parts.join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function seededShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function normalizeName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** Matches FaceNamePairs.typed_lenient_distance when the URL omits it. */
export const TYPED_LENIENT_DISTANCE_DEFAULT = 1;

/**
 * Typed recall is lenient when typed_lenient_distance > 0.
 * A URL value of 0 is exact-only (strict). Missing/invalid → task default.
 */
export function usesLenientTypedScoring(maxDistance) {
  if (maxDistance == null || maxDistance === "") {
    return TYPED_LENIENT_DISTANCE_DEFAULT > 0;
  }
  const n = Number(maxDistance);
  if (!Number.isFinite(n)) return TYPED_LENIENT_DISTANCE_DEFAULT > 0;
  return n > 0;
}

/** Headline correct-count for the scoring mode in the URL. */
export function activeTypedCorrectCount(strictCount, lenientCount, maxDistance) {
  return usesLenientTypedScoring(maxDistance) ? lenientCount : strictCount;
}

export function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur.push(
        Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        ),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Deterministic subset of a list's pairs for delayed recall.
 * Same (subsetSize, subsetSeed) always yields the same pair_ids.
 * Returns all pairs (sorted by pair_id) when size covers the whole list.
 * With complement=true, returns the pairs NOT in that subset — so two
 * delayed sessions with identical size/seed and complement 0/1 split the
 * list into disjoint halves.
 */
export function selectSubset(pairs, subsetSize, subsetSeed, complement = false) {
  const sorted = [...pairs].sort((a, b) => a.pair_id - b.pair_id);
  const n = Math.floor(subsetSize);
  if (!(n > 0) || n >= sorted.length) {
    return complement ? [] : sorted;
  }
  const rng = mulberry32(hashSeed("subset", subsetSeed));
  const chosen = seededShuffle(sorted, rng).slice(0, n);
  if (!complement) {
    return chosen;
  }
  const chosenIds = new Set(chosen.map((p) => p.pair_id));
  return sorted.filter((p) => !chosenIds.has(p.pair_id));
}

/**
 * Deterministic test presentation order. Salted by phase (so immediate and
 * delayed orders differ) and by learning round (criterion-mode retests).
 */
export function testOrder(pairs, listId, subsetSeed, phase, round = 1) {
  const rng = mulberry32(hashSeed("testorder", listId, subsetSeed, phase, round));
  return seededShuffle(pairs, rng);
}

/** Deterministic study presentation order, salted by learning round. */
export function studyOrder(pairs, listId, subsetSeed, round = 1) {
  const rng = mulberry32(hashSeed("studyorder", listId, subsetSeed, round));
  return seededShuffle(pairs, rng);
}

/**
 * 3 gender-matched lure names from the same list (choice mode).
 * The lure SET is seeded by (listId, pair_id) only, so each face is tested
 * against the same competitors in the immediate and delayed sessions.
 */
export function pickLures(pair, allNames, listId) {
  let candidates = allNames.filter(
    (n) => n.pair_id !== pair.pair_id && n.gender === pair.gender,
  );
  if (candidates.length < 3) {
    candidates = allNames.filter((n) => n.pair_id !== pair.pair_id);
  }
  const rng = mulberry32(hashSeed("lures", listId, pair.pair_id));
  return seededShuffle(candidates, rng)
    .slice(0, 3)
    .map((n) => n.name);
}

/**
 * The 4 response options for a pair in choice mode. Option ORDER is salted
 * by phase so button positions differ between sessions (guards against
 * position-based responding) while the option set stays fixed.
 */
export function buildOptions(pair, allNames, listId, phase) {
  const lures = pickLures(pair, allNames, listId);
  const rng = mulberry32(hashSeed("optorder", listId, pair.pair_id, phase));
  return seededShuffle([pair.name, ...lures], rng);
}
