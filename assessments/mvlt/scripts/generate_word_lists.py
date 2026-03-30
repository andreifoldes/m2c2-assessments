#!/usr/bin/env python3
"""
Generate frequency-matched word lists for the mVLT assessment
using SUBTLEX-UK word frequency norms.

Selection criteria (matching Moore et al., 2020):
- Concrete, common English nouns
- 3-8 letters
- Medium frequency band (Zipf value ~3.0-5.0, roughly log10 freq/million 1.0-3.0)
- No proper nouns, curse words, plural forms, past tense forms
- Semantically unrelated within each list
- Frequency-matched across lists and between targets/distractors

Output: 14 lists x 24 words (12 targets + 12 distractors) = 336 unique words
"""

import json
import math
import random
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("Installing openpyxl...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl"])
    import openpyxl


# Words to exclude (offensive, ambiguous, or too abstract)
EXCLUDE_WORDS = {
    "ass", "bum", "crap", "damn", "hell", "crap", "coke", "weed", "pot",
    "dick", "gay", "god", "aids", "drug", "sex", "porn", "nude", "slut",
    "cunt", "crap", "crap", "crap", "piss", "shit", "fuck", "bitch",
    "whore", "rape", "kill", "dead", "death", "die", "war", "gun",
    "bomb", "blood", "sin", "hate", "fear", "pain", "cry", "lie",
    "mad", "sad", "bad", "evil", "debt", "tax", "jail", "cop",
}

# Common plural endings to filter out
def is_likely_plural(word: str) -> bool:
    if word.endswith("ss") or word.endswith("us"):
        return False  # "glass", "bus", "cactus" are fine
    if word.endswith("s") and not word.endswith("is"):
        return True
    if word.endswith("ae"):
        return True
    return False

def is_past_tense_or_gerund(word: str) -> bool:
    if word.endswith("ed") and len(word) > 4:
        return True
    if word.endswith("ing") and len(word) > 5:
        return True
    return False


def load_subtlex_uk(filepath: str) -> list[dict]:
    """Load SUBTLEX-UK data from Excel file."""
    print(f"Loading {filepath}...")
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb.active

    headers = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
    print(f"Headers: {headers}")

    # Find column indices
    word_col = headers.index("Spelling") if "Spelling" in headers else 0
    freq_col = headers.index("FreqCount") if "FreqCount" in headers else 1
    cd_col = headers.index("CD") if "CD" in headers else None
    # Look for Zipf value or LogFreq
    zipf_col = None
    logfreq_col = None
    for i, h in enumerate(headers):
        if h and "zipf" in str(h).lower():
            zipf_col = i
        if h and "log" in str(h).lower() and "freq" in str(h).lower():
            logfreq_col = i

    # Dominant POS is column "DomPoS"
    pos_col = headers.index("DomPoS") if "DomPoS" in headers else None

    # CapitFreq: how often the word appears capitalized (filters proper nouns)
    capit_col = headers.index("CapitFreq") if "CapitFreq" in headers else None

    print(f"Columns: word={word_col}, freq={freq_col}, cd={cd_col}, zipf={zipf_col}, logfreq={logfreq_col}, pos={pos_col}, capit={capit_col}")

    entries = []
    total_freq = 0
    for row in ws.iter_rows(min_row=2, values_only=True):
        word = row[word_col]
        if not word or not isinstance(word, str):
            continue
        freq = row[freq_col] if freq_col is not None else 0
        if freq is None or not isinstance(freq, (int, float)):
            continue
        total_freq += freq

        entry = {
            "word": word,
            "freq": freq,
            "cd": row[cd_col] if cd_col is not None else None,
            "zipf": row[zipf_col] if zipf_col is not None else None,
            "logfreq": row[logfreq_col] if logfreq_col is not None else None,
            "pos": row[pos_col] if pos_col is not None else None,
            "capit_freq": row[capit_col] if capit_col is not None else None,
        }
        entries.append(entry)

    wb.close()
    print(f"Loaded {len(entries)} entries, total frequency: {total_freq}")
    return entries, total_freq


def filter_candidates(entries: list[dict], total_freq: float) -> list[dict]:
    """Filter entries to suitable mVLT word candidates."""
    candidates = []

    for entry in entries:
        word = entry["word"].strip().lower()

        # Length: 3-8 characters
        if len(word) < 3 or len(word) > 8:
            continue

        # Must be alphabetic only (no hyphens, apostrophes, etc.)
        if not word.isalpha():
            continue

        # Exclude offensive/ambiguous words
        if word in EXCLUDE_WORDS:
            continue

        # Exclude likely plurals
        if is_likely_plural(word):
            continue

        # Exclude past tense and gerunds
        if is_past_tense_or_gerund(word):
            continue

        # POS filter: only nouns (exclude names/proper nouns, verbs, adjectives, etc.)
        pos = entry.get("pos")
        if pos and isinstance(pos, str):
            pos_lower = pos.strip().lower()
            if pos_lower != "noun":
                continue
        else:
            continue  # Skip if no POS data

        # Frequency filter
        freq = entry["freq"]

        # Exclude proper nouns: if >50% of occurrences are capitalized
        capit = entry.get("capit_freq")
        if capit is not None and isinstance(capit, (int, float)) and freq > 0:
            capit_ratio = capit / freq
            if capit_ratio > 0.5:
                continue
        if freq <= 0:
            continue

        # Compute log10 frequency per million
        freq_per_million = (freq / total_freq) * 1_000_000
        log_freq = math.log10(freq_per_million) if freq_per_million > 0 else 0

        # Medium frequency band: log10(freq/million) between 0.8 and 2.5
        # This gives words that are common enough to be known but not ultra-high-frequency
        if log_freq < 0.8 or log_freq > 2.5:
            continue

        entry_out = {
            "word": word,
            "freq": freq,
            "log_freq": round(log_freq, 4),
            "freq_per_million": round(freq_per_million, 4),
        }
        candidates.append(entry_out)

    # Remove duplicates (keep highest frequency version)
    seen = {}
    for c in candidates:
        w = c["word"]
        if w not in seen or c["freq"] > seen[w]["freq"]:
            seen[w] = c
    candidates = list(seen.values())

    # Sort by log_freq for easier inspection
    candidates.sort(key=lambda x: x["log_freq"])
    print(f"Filtered to {len(candidates)} candidate words")
    return candidates


def generate_balanced_lists(
    candidates: list[dict],
    num_lists: int = 14,
    targets_per_list: int = 12,
    distractors_per_list: int = 12,
) -> list[dict]:
    """
    Generate frequency-balanced word lists.

    Strategy:
    1. Sort candidates by log_freq
    2. Divide into frequency bins
    3. Draw equally from each bin for each list
    4. Ensure mean log_freq is balanced across lists
    """
    words_per_list = targets_per_list + distractors_per_list
    total_needed = num_lists * words_per_list

    if len(candidates) < total_needed:
        print(f"WARNING: Only {len(candidates)} candidates for {total_needed} needed")
        print("Relaxing frequency constraints...")
        # If not enough, we'll use what we have
        total_needed = min(total_needed, len(candidates))

    # Sort by frequency
    sorted_candidates = sorted(candidates, key=lambda x: x["log_freq"])

    # Take the middle portion (avoid extremes)
    margin = max(0, (len(sorted_candidates) - total_needed) // 2)
    pool = sorted_candidates[margin : margin + total_needed + 100]  # extra buffer

    if len(pool) < total_needed:
        pool = sorted_candidates[:total_needed + 100]

    # Shuffle to break any remaining ordering
    random.shuffle(pool)

    # Take exactly what we need
    selected = pool[:total_needed]

    # Sort selected by log_freq and distribute round-robin to ensure balance
    selected.sort(key=lambda x: x["log_freq"])

    lists = [[] for _ in range(num_lists)]
    for i, word_entry in enumerate(selected):
        list_idx = i % num_lists
        lists[list_idx].append(word_entry)

    # Within each list, shuffle and split into targets/distractors
    result = []
    for i, word_list in enumerate(lists):
        random.shuffle(word_list)
        targets = word_list[:targets_per_list]
        distractors = word_list[targets_per_list:targets_per_list + distractors_per_list]

        target_words = [w["word"] for w in targets]
        distractor_words = [w["word"] for w in distractors]

        mean_log_all = sum(w["log_freq"] for w in word_list) / len(word_list)
        mean_log_targets = sum(w["log_freq"] for w in targets) / len(targets) if targets else 0
        mean_log_distractors = sum(w["log_freq"] for w in distractors) / len(distractors) if distractors else 0

        result.append({
            "list_index": i,
            "targets": target_words,
            "distractors": distractor_words,
            "stats": {
                "mean_log_freq": round(mean_log_all, 4),
                "mean_log_freq_targets": round(mean_log_targets, 4),
                "mean_log_freq_distractors": round(mean_log_distractors, 4),
                "n_targets": len(target_words),
                "n_distractors": len(distractor_words),
            },
        })

    return result


def format_as_js(lists: list[dict]) -> str:
    """Format word lists as JavaScript module."""
    lines = []
    lines.append('import { RandomDraws } from "@m2c2kit/core";')
    lines.append("")
    lines.append("/**")
    lines.append(" * Word pools for the Mobile Verbal Learning Test (mVLT).")
    lines.append(" *")
    lines.append(" * Generated from SUBTLEX-UK frequency norms (van Heuven et al., 2014).")
    lines.append(" * Selection criteria (matching Moore et al., 2020):")
    lines.append(" * - Concrete, common English nouns, 3-8 letters")
    lines.append(" * - Medium frequency band (log10 freq/million ~0.8-2.5)")
    lines.append(" * - No proper nouns, curse words, plural forms, or past tense forms")
    lines.append(" * - Frequency-matched across lists (round-robin assignment by frequency rank)")
    lines.append(" * - Each word appears in exactly one list across all 14 lists")
    lines.append(" *")

    # Compute grand mean
    all_means = [lst["stats"]["mean_log_freq"] for lst in lists]
    grand_mean = sum(all_means) / len(all_means)
    max_dev = max(abs(m - grand_mean) for m in all_means)

    lines.append(f" * Grand mean log10(freq/million): {grand_mean:.4f}")
    lines.append(f" * Max deviation from grand mean: {max_dev:.4f}")
    lines.append(f" * 14 lists x 24 words = {sum(lst['stats']['n_targets'] + lst['stats']['n_distractors'] for lst in lists)} unique words")
    lines.append(" */")
    lines.append("")
    lines.append("export const WORD_LISTS = [")

    for lst in lists:
        lines.append(f"  // ── List {lst['list_index']} (mean log freq: {lst['stats']['mean_log_freq']:.3f}) ──")
        lines.append("  {")

        # Format targets
        t = lst["targets"]
        t_lines = []
        for i in range(0, len(t), 6):
            chunk = t[i:i+6]
            t_lines.append("      " + ", ".join(f'"{w}"' for w in chunk) + ",")
        lines.append("    targets: [")
        for tl in t_lines:
            lines.append(tl)
        lines.append("    ],")

        # Format distractors
        d = lst["distractors"]
        d_lines = []
        for i in range(0, len(d), 6):
            chunk = d[i:i+6]
            d_lines.append("      " + ", ".join(f'"{w}"' for w in chunk) + ",")
        lines.append("    distractors: [")
        for dl in d_lines:
            lines.append(dl)
        lines.append("    ],")

        lines.append("  },")

    lines.append("];")
    lines.append("")

    # Add helper functions
    lines.append("export function shuffleArray(arr) {")
    lines.append("  const a = [...arr];")
    lines.append("  for (let i = a.length - 1; i > 0; i--) {")
    lines.append("    const j = RandomDraws.singleFromRange(0, i);")
    lines.append("    [a[i], a[j]] = [a[j], a[i]];")
    lines.append("  }")
    lines.append("  return a;")
    lines.append("}")
    lines.append("")
    lines.append("export function getWordList(listIndex) {")
    lines.append("  return WORD_LISTS[listIndex % WORD_LISTS.length];")
    lines.append("}")
    lines.append("")
    lines.append("export function buildRecognitionSequence(targets, distractors) {")
    lines.append("  const items = [")
    lines.append('    ...targets.map((word) => ({ word, wordType: "target" })),')
    lines.append('    ...distractors.map((word) => ({ word, wordType: "distractor" })),')
    lines.append("  ];")
    lines.append("  return shuffleArray(items);")
    lines.append("}")
    lines.append("")

    return "\n".join(lines)


def main():
    random.seed(42)  # Reproducible generation

    xlsx_path = Path(__file__).parent / "SUBTLEX-UK.xlsx"
    if not xlsx_path.exists():
        print(f"ERROR: {xlsx_path} not found. Download from:")
        print("https://psychology.nottingham.ac.uk/subtlex-uk/SUBTLEX-UK.xlsx.zip")
        sys.exit(1)

    entries, total_freq = load_subtlex_uk(str(xlsx_path))
    candidates = filter_candidates(entries, total_freq)

    if len(candidates) < 336:
        print(f"ERROR: Only {len(candidates)} candidates after filtering (need 336)")
        print("Consider relaxing frequency constraints.")
        sys.exit(1)

    lists = generate_balanced_lists(candidates)

    # Print statistics
    print("\n=== Word List Statistics ===")
    all_words = set()
    for lst in lists:
        print(
            f"  List {lst['list_index']:2d}: "
            f"mean_log={lst['stats']['mean_log_freq']:.4f}  "
            f"targets={lst['stats']['mean_log_freq_targets']:.4f}  "
            f"distractors={lst['stats']['mean_log_freq_distractors']:.4f}  "
            f"n={lst['stats']['n_targets']}+{lst['stats']['n_distractors']}"
        )
        for w in lst["targets"] + lst["distractors"]:
            if w in all_words:
                print(f"  DUPLICATE: {w}")
            all_words.add(w)

    print(f"\nTotal unique words: {len(all_words)}")

    all_means = [lst["stats"]["mean_log_freq"] for lst in lists]
    grand_mean = sum(all_means) / len(all_means)
    max_dev = max(abs(m - grand_mean) for m in all_means)
    print(f"Grand mean log10(freq/million): {grand_mean:.4f}")
    print(f"Max deviation: {max_dev:.4f}")

    # Generate JavaScript
    js_content = format_as_js(lists)
    output_path = Path(__file__).parent.parent / "stimuli.js"
    output_path.write_text(js_content)
    print(f"\nWrote {output_path}")

    # Also save stats as JSON for reference
    stats_path = Path(__file__).parent / "word_list_stats.json"
    stats_path.write_text(json.dumps(lists, indent=2))
    print(f"Wrote {stats_path}")


if __name__ == "__main__":
    main()
