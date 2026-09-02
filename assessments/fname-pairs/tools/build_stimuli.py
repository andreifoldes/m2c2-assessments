# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "openpyxl", "pillow", "scipy", "numpy"]
# ///
"""Build the fname-pairs stimulus set from the Chicago Face Database (CFD).

Reads the CFD zip archive WITHOUT fully extracting it, selects 80 neutral-expression
targets (rated age 18-40, main CFD set only), partitions them into 4 lists of 20
face-name pairs balanced for race, gender, rated age, and attractiveness, assigns
gender-matched England & Wales first names (ONS 20-year rank history), resizes the
images, and writes:

  ../assets/fname-pairs/images/*.jpg      (80 processed images — gitignored)
  ../assets/fname-pairs/images/lists.json (committed; pairings are FIXED here)
  ./stimulus_report.md                    (balance report — committed)

Usage:
  uv run build_stimuli.py --cfd-zip /tmp/cfd.zip --inspect   # explore workbook first
  uv run build_stimuli.py --cfd-zip /tmp/cfd.zip [--seed 42]
  uv run build_stimuli.py --repartition [--seed 42]          # re-balance lists from
                                                             # lists.json, no zip needed
  uv run build_stimuli.py --reassign-names [--seed 42]       # keep faces, reassign names

CFD citation: Ma, Correll, & Wittenbrink (2015), Behavior Research Methods.
Names: Office for National Statistics, Baby names explorer (England and Wales).
"""

import argparse
import io
import itertools
import json
import logging
import re
import zipfile
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image
from scipy import stats

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).resolve().parent
OUT_IMAGES = SCRIPT_DIR.parent / "assets" / "fname-pairs" / "images"
REPORT_PATH = SCRIPT_DIR / "stimulus_report.md"
ONS_XLSX = SCRIPT_DIR / "ons_baby_names.xlsx"

RACES = ["A", "B", "L", "W"]  # Asian, Black, Latino/a, White (main CFD set)
GENDERS = ["M", "F"]
N_LISTS = 4
PER_RACE_PER_LIST = 5
CELL_SIZE = 10  # targets selected per race x gender cell (4x2x10 = 80)
MIN_AGE, MAX_AGE = 18.0, 40.0
CROP_ASPECT = (5, 6)  # portrait width:height
OUT_SIZE = (500, 600)
JPEG_QUALITY = 80
MIN_NAME_DISTANCE = 3  # within-list pairwise Levenshtein floor
N_NAMES_PER_GENDER = 10 * N_LISTS  # 40; 10 gender-matched names per list
POPULARITY_YEARS = 20  # most recent N years in the ONS workbook
LISTS_VERSION = 3

# ONS ranks exact spellings separately (note 1 of the explorer workbook). These
# clusters are the same name under different transliterations or spellings; the
# selector keeps the historically more popular member.
SPELLING_CLUSTERS = (
    frozenset({"Muhammad", "Mohammed", "Mohammad"}),
    frozenset({"Sophia", "Sophie", "Sofia"}),
    frozenset({"Isabella", "Isabelle"}),
    frozenset({"Lucas", "Luca"}),
    frozenset({"Louie", "Louis"}),
    frozenset({"Reuben", "Ruben"}),
)

MODEL_RE = re.compile(r"\b([ABLW][FM])-(\d{3})\b")
NEUTRAL_IMG_RE = re.compile(r"CFD-([ABLW][FM])-(\d{3})-(\d+)-N\.jpg$", re.IGNORECASE)


@dataclass
class Target:
    model: str  # e.g. "WF-001"
    race: str
    gender: str
    age_rated: float
    attractive: float
    zip_member: str
    composite: float = 0.0
    list_id: int = 0
    pair_id: int = -1
    name: str = ""
    name_rank_20y: float = 0.0

    @property
    def cfd_target(self) -> str:
        return f"CFD-{self.model}"

    @property
    def face_file(self) -> str:
        return f"CFD-{self.model}-N.jpg"


# ---------------------------------------------------------------------------
# Workbook discovery
# ---------------------------------------------------------------------------

def find_norming_workbook(zf: zipfile.ZipFile) -> str:
    xlsx = [n for n in zf.namelist() if n.lower().endswith(".xlsx") and "__MACOSX" not in n]
    if not xlsx:
        raise FileNotFoundError("No .xlsx workbook found in the CFD zip")
    norming = [n for n in xlsx if "norm" in n.lower()]
    chosen = (norming or xlsx)[0]
    logger.info("Workbook: %s", chosen)
    return chosen


def detect_header_row(raw: pd.DataFrame) -> int | None:
    """Find the row (within the first 12) containing model + attractiveness headers."""
    for i in range(min(12, len(raw))):
        cells = [str(c).strip().lower() for c in raw.iloc[i].tolist()]
        has_model = any(c in ("model", "target") for c in cells)
        has_attr = any(c == "attractive" for c in cells)
        if has_model and has_attr:
            return i
    return None


def load_norming_sheet(zf: zipfile.ZipFile, member: str, inspect: bool) -> pd.DataFrame:
    """Auto-detect the main-CFD US norming sheet and return a clean dataframe."""
    buf = io.BytesIO(zf.read(member))
    xl = pd.ExcelFile(buf, engine="openpyxl")
    if inspect:
        logger.info("Sheets: %s", xl.sheet_names)

    best: tuple[int, pd.DataFrame] | None = None
    for sheet in xl.sheet_names:
        raw = xl.parse(sheet, header=None, nrows=800)
        if inspect:
            logger.info("--- sheet %r, first 6 rows ---\n%s", sheet, raw.head(6).to_string())
        hdr = detect_header_row(raw)
        if hdr is None:
            continue
        df = xl.parse(sheet, header=hdr)
        df.columns = [str(c).strip() for c in df.columns]
        model_col = next(
            (c for c in df.columns if c.lower() in ("model", "target")), None
        )
        if model_col is None:
            continue
        models = df[model_col].astype(str).str.extract(MODEL_RE.pattern)[0]
        n_main = models.notna().sum()
        logger.info("Sheet %r: header row %d, %d main-CFD rows", sheet, hdr, n_main)
        if best is None or n_main > best[0]:
            df = df.rename(columns={model_col: "_model_raw"})
            best = (int(n_main), df)

    if best is None or best[0] == 0:
        raise ValueError("Could not locate a norming sheet with main-CFD model codes")
    return best[1]


def column_by_name(df: pd.DataFrame, candidates: list[str]) -> str:
    lowered = {str(c).strip().lower(): c for c in df.columns}
    for cand in candidates:
        if cand in lowered:
            return lowered[cand]
    raise KeyError(f"None of {candidates} found; available: {list(df.columns)[:40]}")


# ---------------------------------------------------------------------------
# Target pool
# ---------------------------------------------------------------------------

def index_neutral_images(zf: zipfile.ZipFile) -> dict[str, str]:
    """model code -> first (sorted) neutral image member."""
    idx: dict[str, list[str]] = {}
    for n in zf.namelist():
        m = NEUTRAL_IMG_RE.search(n)
        if m and "__MACOSX" not in n:
            model = f"{m.group(1).upper()}-{m.group(2)}"
            idx.setdefault(model, []).append(n)
    return {k: sorted(v)[0] for k, v in idx.items()}


def build_pool(df: pd.DataFrame, images: dict[str, str]) -> list[Target]:
    # The public CFD 3.0 norming data publishes rated (perceived) age only —
    # the AgeSelf column exists but is empty — so AgeRated drives both the
    # 18-40 filter and list balancing.
    age_rated_col = column_by_name(df, ["agerated", "age"])
    attr_col = column_by_name(df, ["attractive"])
    pool: list[Target] = []
    seen: set[str] = set()
    for _, row in df.iterrows():
        m = MODEL_RE.search(str(row["_model_raw"]).upper())
        if not m:
            continue
        model = f"{m.group(1)}-{m.group(2)}"
        if model in seen:
            continue
        seen.add(model)
        age_rated = pd.to_numeric(row[age_rated_col], errors="coerce")
        attr = pd.to_numeric(row[attr_col], errors="coerce")
        if pd.isna(age_rated) or pd.isna(attr):
            continue
        if not (MIN_AGE <= age_rated <= MAX_AGE):
            continue
        if model not in images:
            continue
        pool.append(
            Target(
                model=model,
                race=model[0],
                gender=model[1],
                age_rated=float(age_rated),
                attractive=float(attr),
                zip_member=images[model],
            )
        )
    logger.info("Eligible pool (age %.0f-%.0f, neutral image): %d targets", MIN_AGE, MAX_AGE, len(pool))
    return pool


def select_cells(pool: list[Target]) -> dict[tuple[str, str], list[Target]]:
    """Middle CELL_SIZE targets per race x gender cell by composite z(age)+z(attractive)."""
    cells: dict[tuple[str, str], list[Target]] = {}
    for race in RACES:
        for gender in GENDERS:
            members = [t for t in pool if t.race == race and t.gender == gender]
            if len(members) < CELL_SIZE:
                raise ValueError(
                    f"Cell {race}{gender}: only {len(members)} eligible targets, need {CELL_SIZE}"
                )
            ages = np.array([t.age_rated for t in members])
            attrs = np.array([t.attractive for t in members])
            z = (ages - ages.mean()) / (ages.std() or 1) + (attrs - attrs.mean()) / (attrs.std() or 1)
            for t, zi in zip(members, z):
                t.composite = float(zi)
            members.sort(key=lambda t: (t.composite, t.model))
            lo = (len(members) - CELL_SIZE) // 2
            cells[(race, gender)] = members[lo : lo + CELL_SIZE]
    return cells


# ---------------------------------------------------------------------------
# Partition into 4 balanced lists
# ---------------------------------------------------------------------------

def gender_quota(race: str, gender: str, list_id: int) -> int:
    """Per race, male counts alternate [3,2,3,2] / [2,3,2,3] so lists sum to 10M/10F."""
    race_idx = RACES.index(race)
    male = [3, 2, 3, 2] if race_idx % 2 == 0 else [2, 3, 2, 3]
    m = male[list_id - 1]
    return m if gender == "M" else PER_RACE_PER_LIST - m


def snake_deal(cells: dict[tuple[str, str], list[Target]]) -> None:
    """Serpentine-deal each sorted cell into lists according to gender quotas."""
    for (race, gender), members in cells.items():
        quotas = {lid: gender_quota(race, gender, lid) for lid in range(1, N_LISTS + 1)}
        assert sum(quotas.values()) == CELL_SIZE
        order = list(range(1, N_LISTS + 1))
        direction = 1
        i = 0
        for t in members:  # already sorted by composite
            placed = False
            while not placed:
                lid = order[i % N_LISTS] if direction == 1 else order[N_LISTS - 1 - (i % N_LISTS)]
                i += 1
                if i % N_LISTS == 0:
                    direction *= -1
                if quotas[lid] > 0:
                    t.list_id = lid
                    quotas[lid] -= 1
                    placed = True


def list_targets(selected: list[Target], lid: int) -> list[Target]:
    return [t for t in selected if t.list_id == lid]


BALANCE_ATTRS = ["age_rated", "attractive"]
SMD_CRITERION = 0.10        # matching-literature negligible-imbalance threshold
VR_CRITERION = 1.5          # variance ratio max/min across lists
TOST_BOUND_SD = 0.5         # equivalence bound for TOST, in pooled-SD units
LIST_PAIRS = list(itertools.combinations(range(1, N_LISTS + 1), 2))


def anova(selected: list[Target], attr: str) -> tuple[float, float]:
    groups = [[getattr(t, attr) for t in list_targets(selected, lid)] for lid in range(1, N_LISTS + 1)]
    f, p = stats.f_oneway(*groups)
    return float(f), float(p)


def _attr_arrays(selected: list[Target], attr: str) -> dict[int, np.ndarray]:
    return {
        lid: np.array([getattr(t, attr) for t in list_targets(selected, lid)])
        for lid in range(1, N_LISTS + 1)
    }


def smd(a: np.ndarray, b: np.ndarray) -> float:
    """Standardized mean difference with the pooled SD as denominator."""
    pooled = np.sqrt((a.var(ddof=1) + b.var(ddof=1)) / 2)
    return float((a.mean() - b.mean()) / pooled) if pooled > 0 else 0.0


def tost_p(a: np.ndarray, b: np.ndarray, bound_sd: float = TOST_BOUND_SD) -> float:
    """Welch-based two one-sided tests; returns the larger one-sided p.

    p < .05 rejects |true difference| >= bound_sd pooled SDs, i.e. demonstrates
    equivalence within the bound (Lakens, 2017).
    """
    pooled = np.sqrt((a.var(ddof=1) + b.var(ddof=1)) / 2)
    delta = bound_sd * pooled
    va, vb = a.var(ddof=1) / len(a), b.var(ddof=1) / len(b)
    se = np.sqrt(va + vb)
    df = se**4 / (va**2 / (len(a) - 1) + vb**2 / (len(b) - 1))
    d = a.mean() - b.mean()
    p_lower = 1 - stats.t.cdf((d + delta) / se, df)
    p_upper = stats.t.cdf((d - delta) / se, df)
    return float(max(p_lower, p_upper))


def tost_min_bound(a: np.ndarray, b: np.ndarray) -> float:
    """Smallest equivalence bound (in pooled-SD units) at which TOST rejects at
    alpha=.05 for this pair: |SMD| + t_crit * SE/pooledSD. With n=20 per list
    the floor is ~0.53 SD even at a zero observed difference."""
    pooled = np.sqrt((a.var(ddof=1) + b.var(ddof=1)) / 2)
    va, vb = a.var(ddof=1) / len(a), b.var(ddof=1) / len(b)
    se = np.sqrt(va + vb)
    df = se**4 / (va**2 / (len(a) - 1) + vb**2 / (len(b) - 1))
    t_crit = stats.t.ppf(0.95, df)
    return float(abs(a.mean() - b.mean()) / pooled + t_crit * se / pooled)


def balance_metrics(selected: list[Target], attr: str) -> dict:
    g = _attr_arrays(selected, attr)
    smds = {pair: smd(g[pair[0]], g[pair[1]]) for pair in LIST_PAIRS}
    variances = [g[lid].var(ddof=1) for lid in g]
    f, p = anova(selected, attr)
    return {
        "smds": smds,
        "max_abs_smd": max(abs(v) for v in smds.values()),
        "variance_ratio": max(variances) / min(variances),
        "max_ks": max(float(stats.ks_2samp(g[i], g[j]).statistic) for i, j in LIST_PAIRS),
        "max_tost_p": max(tost_p(g[i], g[j]) for i, j in LIST_PAIRS),
        "tost_min_bound": max(tost_min_bound(g[i], g[j]) for i, j in LIST_PAIRS),
        "anova_f": f,
        "anova_p": p,
    }


def objective(selected: list[Target]) -> float:
    """Imbalance score per attribute: max pairwise |SMD| hinged at half the
    criterion (mean differences below 0.05 SD are not worth optimizing further)
    plus a variance-ratio penalty hinged at 1.1, so the search spends its moves
    equalizing spread once means are matched."""
    total = 0.0
    for attr in BALANCE_ATTRS:
        g = _attr_arrays(selected, attr)
        max_smd = max(abs(smd(g[i], g[j])) for i, j in LIST_PAIRS)
        total += max(0.0, max_smd - SMD_CRITERION / 2)
        variances = [g[lid].var(ddof=1) for lid in g]
        total += 0.5 * max(0.0, max(variances) / min(variances) - 1.1)
    return total


def hill_climb(selected: list[Target], cells: dict[tuple[str, str], list[Target]], max_iters: int = 500) -> None:
    """Best-improvement within-cell swaps between lists, run to a local optimum
    of the imbalance score (preserves categorical race/gender balance)."""
    for it in range(max_iters):
        current = objective(selected)
        best_gain, best_pair = 0.0, None
        for members in cells.values():
            for a, b in itertools.combinations(members, 2):
                if a.list_id == b.list_id:
                    continue
                a.list_id, b.list_id = b.list_id, a.list_id
                gain = current - objective(selected)
                a.list_id, b.list_id = b.list_id, a.list_id
                if gain > best_gain + 1e-12:
                    best_gain, best_pair = gain, (a, b)
        if best_pair is None:
            logger.info("Hill-climb converged after %d swaps (score %.4f)", it, current)
            break
        a, b = best_pair
        a.list_id, b.list_id = b.list_id, a.list_id
    for attr in BALANCE_ATTRS:
        m = balance_metrics(selected, attr)
        logger.info(
            "Balance %s: max|SMD|=%.3f VR=%.3f maxKS=%.3f TOSTp=%.4f F=%.3f p=%.3f",
            attr, m["max_abs_smd"], m["variance_ratio"], m["max_ks"],
            m["max_tost_p"], m["anova_f"], m["anova_p"],
        )


# ---------------------------------------------------------------------------
# Names
# ---------------------------------------------------------------------------

def levenshtein(a: str, b: str) -> int:
    a, b = a.lower(), b.lower()
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


@dataclass
class NamePool:
    male: list[str]
    female: list[str]
    rank_20y: dict[str, float]
    window: tuple[int, int]
    dropped_variants: list[tuple[str, str]]  # (dropped, kept)
    unisex: list[tuple[str, str, float, float]]  # name, kept_gender, rank_m, rank_f


def load_ons_rank_table(xlsx: Path, sheet: str) -> pd.DataFrame:
    """ONS explorer layout: row 4 = names, col 0 from row 5 = years, cells = ranks."""
    raw = pd.read_excel(xlsx, sheet_name=sheet, header=None)
    names = [str(n).strip() for n in raw.iloc[4, 1:].tolist()]
    year_rows = raw.iloc[5:]
    years = pd.to_numeric(year_rows.iloc[:, 0], errors="coerce")
    data = year_rows.iloc[:, 1:].apply(pd.to_numeric, errors="coerce")
    data.columns = names
    mask = years.notna()
    data = data.loc[mask.to_numpy()]
    data.index = years.loc[mask].astype(int)
    data.index.name = "year"
    return data


def popularity_window(years: list[int], n: int = POPULARITY_YEARS) -> list[int]:
    years_sorted = sorted(set(int(y) for y in years))
    if len(years_sorted) < n:
        raise ValueError(f"ONS table has {len(years_sorted)} years, need {n}")
    return years_sorted[-n:]


def mean_rank(series: pd.Series, years: list[int]) -> float:
    vals = pd.to_numeric(series.reindex(years), errors="coerce")
    if vals.notna().sum() == 0:
        return float("inf")
    return float(vals.mean())


def spelling_cluster(name: str) -> frozenset[str] | None:
    for cluster in SPELLING_CLUSTERS:
        if name in cluster:
            return cluster
    return None


def is_spelling_variant(a: str, b: str) -> bool:
    if levenshtein(a, b) <= 1:
        return True
    ca, cb = spelling_cluster(a), spelling_cluster(b)
    return ca is not None and ca == cb


def select_by_popularity(ranked: list[tuple[str, float]], k: int) -> tuple[list[str], list[tuple[str, str]]]:
    """Walk names in increasing 20-year mean rank; skip spelling variants of a keeper."""
    kept: list[str] = []
    dropped: list[tuple[str, str]] = []
    for name, _rank in ranked:
        rival = next((k0 for k0 in kept if is_spelling_variant(name, k0)), None)
        if rival is not None:
            dropped.append((name, rival))
            continue
        kept.append(name)
        if len(kept) == k:
            break
    if len(kept) < k:
        raise ValueError(f"Only {len(kept)} names survived variant filtering, need {k}")
    return kept, dropped


def load_ons_name_pool(xlsx: Path) -> NamePool:
    if not xlsx.is_file():
        raise FileNotFoundError(
            f"ONS baby-names workbook not found at {xlsx}. "
            "Download the explorer spreadsheet from ONS and save it there."
        )
    girls = load_ons_rank_table(xlsx, "Table_1")
    boys = load_ons_rank_table(xlsx, "Table_2")
    years = popularity_window(list(girls.index))
    if popularity_window(list(boys.index)) != years:
        raise ValueError("Girls and boys ONS tables have different year coverage")
    g_rank = {n: mean_rank(girls[n], years) for n in girls.columns}
    b_rank = {n: mean_rank(boys[n], years) for n in boys.columns}

    unisex: list[tuple[str, str, float, float]] = []
    for name in sorted(set(g_rank) & set(b_rank)):
        if b_rank[name] <= g_rank[name]:
            unisex.append((name, "M", b_rank[name], g_rank[name]))
            del g_rank[name]
        else:
            unisex.append((name, "F", b_rank[name], g_rank[name]))
            del b_rank[name]

    male, drop_m = select_by_popularity(sorted(b_rank.items(), key=lambda kv: kv[1]), N_NAMES_PER_GENDER)
    female, drop_f = select_by_popularity(sorted(g_rank.items(), key=lambda kv: kv[1]), N_NAMES_PER_GENDER)
    rank_20y = {n: b_rank[n] for n in male} | {n: g_rank[n] for n in female}
    logger.info(
        "ONS names: window %d-%d; selected %d male (mean rank %.1f) and %d female (mean rank %.1f); "
        "dropped %d spelling variants; unisex assigned: %s",
        years[0], years[-1], len(male), float(np.mean([rank_20y[n] for n in male])),
        len(female), float(np.mean([rank_20y[n] for n in female])),
        len(drop_m) + len(drop_f),
        ", ".join(f"{n}->{g}" for n, g, *_ in unisex) or "none",
    )
    return NamePool(
        male=male,
        female=female,
        rank_20y=rank_20y,
        window=(years[0], years[-1]),
        dropped_variants=drop_m + drop_f,
        unisex=unisex,
    )


def snake_names(names: list[str]) -> dict[int, list[str]]:
    """Deal an ordered pool (most popular first) into N_LISTS groups of 10."""
    if len(names) != N_NAMES_PER_GENDER:
        raise ValueError(f"Need {N_NAMES_PER_GENDER} names, got {len(names)}")
    groups: dict[int, list[str]] = {lid: [] for lid in range(1, N_LISTS + 1)}
    for i, name in enumerate(names):
        rnd, idx = divmod(i, N_LISTS)
        lid = (idx + 1) if rnd % 2 == 0 else (N_LISTS - idx)
        groups[lid].append(name)
    return groups


def name_violations(names: list[str]) -> list[tuple[str, str, int]]:
    out = []
    for a, b in itertools.combinations(names, 2):
        d = levenshtein(a, b)
        if d < MIN_NAME_DISTANCE:
            out.append((a, b, d))
    return out


def repair_name_lists(groups_m: dict[int, list[str]], groups_f: dict[int, list[str]], max_passes: int = 200) -> None:
    """Swap same-gender names between lists until every list meets MIN_NAME_DISTANCE.

    Greedy first-improvement search on the global violation count, so a swap
    that merely reduces (not fully resolves) violations is still accepted.
    """

    def total_violations() -> int:
        return sum(
            len(name_violations(groups_m[lid] + groups_f[lid]))
            for lid in range(1, N_LISTS + 1)
        )

    for _ in range(max_passes):
        current = total_violations()
        if current == 0:
            return
        improved = False
        for lid in range(1, N_LISTS + 1):
            viols = name_violations(groups_m[lid] + groups_f[lid])
            if not viols:
                continue
            offenders = sorted({n for a, b, _ in viols for n in (a, b)})
            for bad in offenders:
                groups = groups_m if bad in groups_m[lid] else groups_f
                i = groups[lid].index(bad)
                for other in range(1, N_LISTS + 1):
                    if other == lid:
                        continue
                    for j in range(len(groups[other])):
                        cand = groups[other][j]
                        groups[lid][i], groups[other][j] = cand, bad
                        if total_violations() < current:
                            improved = True
                            break
                        groups[lid][i], groups[other][j] = bad, cand
                    if improved:
                        break
                if improved:
                    break
            if improved:
                break
        if not improved:
            break
    remaining = {
        lid: name_violations(groups_m[lid] + groups_f[lid]) for lid in range(1, N_LISTS + 1)
    }
    remaining = {k: v for k, v in remaining.items() if v}
    if remaining:
        raise ValueError(f"Could not satisfy name-distance constraint: {remaining}")


def _group_arrays(groups: dict[int, list[str]], value_of) -> dict[int, np.ndarray]:
    return {lid: np.array([value_of(n) for n in groups[lid]]) for lid in range(1, N_LISTS + 1)}


def _hinged_imbalance(arrays: dict[int, np.ndarray]) -> float:
    """Same hinged max-|SMD| + variance-ratio score used for the face partition."""
    max_smd = max(abs(smd(arrays[i], arrays[j])) for i, j in LIST_PAIRS)
    total = max(0.0, max_smd - SMD_CRITERION / 2)
    variances = [arrays[lid].var(ddof=1) for lid in arrays]
    total += 0.5 * max(0.0, max(variances) / min(variances) - 1.1)
    return total


def name_objective(
    groups_m: dict[int, list[str]], groups_f: dict[int, list[str]], rank_of: dict[str, float]
) -> float:
    """Imbalance of 20-year mean rank within each gender, plus a light length penalty.

    Male and female pools are scored separately so a list cannot hide unpopular
    names of one gender behind popular names of the other.
    """
    total = 0.0
    for groups in (groups_m, groups_f):
        total += _hinged_imbalance(_group_arrays(groups, rank_of.__getitem__))
        total += 0.25 * _hinged_imbalance(_group_arrays(groups, len))
    return total


def balance_name_lists(
    groups_m: dict[int, list[str]],
    groups_f: dict[int, list[str]],
    rank_of: dict[str, float],
    max_iters: int = 400,
) -> None:
    """Hill-climb same-gender swaps: popularity-balance lists without mixing genders.

    Candidates that reintroduce a within-list Levenshtein violation are rejected.
    """

    def total_violations() -> int:
        return sum(
            len(name_violations(groups_m[lid] + groups_f[lid]))
            for lid in range(1, N_LISTS + 1)
        )

    if total_violations() != 0:
        raise ValueError("balance_name_lists requires Levenshtein already satisfied")

    for it in range(max_iters):
        current = name_objective(groups_m, groups_f, rank_of)
        best_gain, best_move = 0.0, None
        for groups in (groups_m, groups_f):
            for lid_a, lid_b in LIST_PAIRS:
                for i, a in enumerate(groups[lid_a]):
                    for j, b in enumerate(groups[lid_b]):
                        groups[lid_a][i], groups[lid_b][j] = b, a
                        if total_violations() == 0:
                            gain = current - name_objective(groups_m, groups_f, rank_of)
                            if gain > best_gain + 1e-12:
                                best_gain, best_move = gain, (groups, lid_a, i, lid_b, j, a, b)
                        groups[lid_a][i], groups[lid_b][j] = a, b
        if best_move is None:
            logger.info("Name balance converged after %d swaps (score %.4f)", it, current)
            break
        groups, lid_a, i, lid_b, j, a, b = best_move
        groups[lid_a][i], groups[lid_b][j] = b, a
    for label, groups in (("male", groups_m), ("female", groups_f)):
        g = _group_arrays(groups, rank_of.__getitem__)
        max_smd = max(abs(smd(g[i], g[j])) for i, j in LIST_PAIRS)
        variances = [g[lid].var(ddof=1) for lid in g]
        logger.info(
            "Name balance %s: max|SMD|=%.3f VR=%.3f means=%s",
            label,
            max_smd,
            max(variances) / min(variances),
            ", ".join(f"{lid}:{g[lid].mean():.1f}" for lid in range(1, N_LISTS + 1)),
        )


def assign_names(
    selected: list[Target],
    seed: int,
    pool: NamePool,
    *,
    shuffle_pair_ids: bool = True,
) -> None:
    rng = np.random.default_rng(seed)
    groups_m = snake_names(pool.male)
    groups_f = snake_names(pool.female)
    repair_name_lists(groups_m, groups_f)
    balance_name_lists(groups_m, groups_f, pool.rank_20y)
    for lid in range(1, N_LISTS + 1):
        males = [t for t in list_targets(selected, lid) if t.gender == "M"]
        females = [t for t in list_targets(selected, lid) if t.gender == "F"]
        m_names = list(groups_m[lid])
        f_names = list(groups_f[lid])
        rng.shuffle(m_names)
        rng.shuffle(f_names)
        for t, n in zip(sorted(males, key=lambda t: t.model), m_names):
            t.name = n
            t.name_rank_20y = pool.rank_20y[n]
        for t, n in zip(sorted(females, key=lambda t: t.model), f_names):
            t.name = n
            t.name_rank_20y = pool.rank_20y[n]
        if shuffle_pair_ids:
            members = list_targets(selected, lid)
            order = rng.permutation(len(members))
            for pid, idx in enumerate(order):
                members[idx].pair_id = pid


# ---------------------------------------------------------------------------
# Images + outputs
# ---------------------------------------------------------------------------

def process_images(zf: zipfile.ZipFile, selected: list[Target]) -> None:
    OUT_IMAGES.mkdir(parents=True, exist_ok=True)
    aw, ah = CROP_ASPECT
    for t in selected:
        with zf.open(t.zip_member) as fh:
            img = Image.open(io.BytesIO(fh.read())).convert("RGB")
        w, h = img.size
        crop_w = min(w, int(h * aw / ah))
        crop_h = min(h, int(crop_w * ah / aw))
        left = (w - crop_w) // 2
        top = (h - crop_h) // 2
        img = img.crop((left, top, left + crop_w, top + crop_h)).resize(OUT_SIZE, Image.LANCZOS)
        img.save(OUT_IMAGES / t.face_file, "JPEG", quality=JPEG_QUALITY, optimize=True)
    total_kb = sum((OUT_IMAGES / t.face_file).stat().st_size for t in selected) / 1024
    logger.info("Wrote %d images (%.1f MB) to %s", len(selected), total_kb / 1024, OUT_IMAGES)


def load_from_lists_json() -> tuple[list[Target], int]:
    """Rebuild Target objects from the committed lists.json (for --repartition,
    which re-optimizes the partition without needing the CFD zip)."""
    data = json.loads((OUT_IMAGES / "lists.json").read_text())
    selected = []
    for lst in data["lists"]:
        for p in lst["pairs"]:
            selected.append(
                Target(
                    model=p["cfd_target"].removeprefix("CFD-"),
                    race=p["race"],
                    gender=p["gender"],
                    age_rated=p["age_rated"],
                    attractive=p["attractive"],
                    zip_member="",
                    list_id=lst["list_id"],
                    pair_id=p["pair_id"],
                    name=p["name"],
                    name_rank_20y=float(p.get("name_rank_20y", 0.0)),
                )
            )
    return selected, int(data.get("eligible_pool", 554))


def write_lists_json(selected: list[Target], seed: int, eligible_pool: int, name_pool: NamePool) -> None:
    lists = []
    for lid in range(1, N_LISTS + 1):
        pairs = sorted(list_targets(selected, lid), key=lambda t: t.pair_id)
        lists.append(
            {
                "list_id": lid,
                "pairs": [
                    {
                        "pair_id": t.pair_id,
                        "face_file": t.face_file,
                        "cfd_target": t.cfd_target,
                        "race": t.race,
                        "gender": t.gender,
                        "age_rated": round(t.age_rated, 2),
                        "attractive": round(t.attractive, 2),
                        "name": t.name,
                        "name_rank_20y": round(t.name_rank_20y, 2),
                    }
                    for t in pairs
                ],
            }
        )
    payload = {
        "version": LISTS_VERSION,
        "generated_note": (
            f"build_stimuli.py seed={seed} on {date.today().isoformat()}; "
            "Chicago Face Database neutral images, rated age 18-40 "
            "(Ma, Correll, & Wittenbrink, 2015); "
            f"names from ONS England & Wales baby-name ranks {name_pool.window[0]}-{name_pool.window[1]}"
        ),
        "eligible_pool": eligible_pool,
        "lists": lists,
    }
    out = OUT_IMAGES / "lists.json"
    out.write_text(json.dumps(payload, indent=2))
    logger.info("Wrote %s", out)


def write_report(selected: list[Target], pool_size: int, seed: int, name_pool: NamePool) -> None:
    lines = [
        "# fname-pairs stimulus balance report",
        "",
        f"Generated by `build_stimuli.py --seed {seed}` on {date.today().isoformat()}.",
        f"Source: Chicago Face Database (main set, neutral expression), eligible pool = {pool_size} targets (rated age {MIN_AGE:.0f}-{MAX_AGE:.0f}; the public CFD norms publish perceived age only).",
        f"Names: ONS Baby names explorer, England and Wales, mean rank {name_pool.window[0]}-{name_pool.window[1]}.",
        "",
        "| List | n | M/F | A/B/L/W | AgeRated M (SD) | Attractive M (SD) | Name len M | Rank 20y male | Rank 20y female |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for lid in range(1, N_LISTS + 1):
        ts = list_targets(selected, lid)
        ages = np.array([t.age_rated for t in ts])
        attrs = np.array([t.attractive for t in ts])
        ranks_m = np.array([t.name_rank_20y for t in ts if t.gender == "M"])
        ranks_f = np.array([t.name_rank_20y for t in ts if t.gender == "F"])
        nm = sum(1 for t in ts if t.gender == "M")
        races = "/".join(str(sum(1 for t in ts if t.race == r)) for r in RACES)
        name_len = np.mean([len(t.name) for t in ts])
        lines.append(
            f"| {lid} | {len(ts)} | {nm}/{len(ts) - nm} | {races} "
            f"| {ages.mean():.1f} ({ages.std(ddof=1):.1f}) "
            f"| {attrs.mean():.2f} ({attrs.std(ddof=1):.2f}) | {name_len:.1f} "
            f"| {ranks_m.mean():.1f} ({ranks_m.std(ddof=1):.1f}) "
            f"| {ranks_f.mean():.1f} ({ranks_f.std(ddof=1):.1f}) |"
        )
    lines += [
        "",
        "## Balance verification",
        "",
        "Lists are a fixed partition of the 80 selected targets, so balance is assessed with",
        "descriptive equivalence criteria rather than a null-hypothesis test alone:",
        "",
        "- **max |SMD|** — largest pairwise standardized mean difference between any two lists",
        f"  (pooled-SD denominator); < {SMD_CRITERION} is the conventional negligible-imbalance",
        "  threshold from the covariate-balance literature (Austin, 2009).",
        f"- **Variance ratio** — largest/smallest list variance; criterion < {VR_CRITERION}.",
        "- **max KS D** — largest pairwise two-sample Kolmogorov-Smirnov statistic",
        "  (whole-distribution overlap, not just means).",
        f"- **TOST max p** — Welch two one-sided tests with a +/-{TOST_BOUND_SD} pooled-SD",
        "  equivalence bound (Lakens, 2017), worst pair; p < .05 demonstrates all six list",
        "  pairs are statistically equivalent within the bound. Note: with n=20 per list the",
        "  smallest demonstrable bound is ~0.53 SD even at a zero observed difference, so the",
        f"  +/-{TOST_BOUND_SD} test cannot reach significance by design; **TOST bound** gives the",
        "  smallest bound (worst pair) at which equivalence IS demonstrated at alpha=.05.",
        "- ANOVA F/p across the four lists is retained for reference only.",
        "",
        "| Attribute | max \\|SMD\\| | Variance ratio | max KS D | TOST max p | TOST bound | ANOVA F(3,76) | ANOVA p |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for attr in BALANCE_ATTRS:
        m = balance_metrics(selected, attr)
        lines.append(
            f"| {attr} | {m['max_abs_smd']:.3f} | {m['variance_ratio']:.3f} "
            f"| {m['max_ks']:.3f} | {m['max_tost_p']:.4f} | +/-{m['tost_min_bound']:.2f} SD "
            f"| {m['anova_f']:.3f} | {m['anova_p']:.3f} |"
        )
    lines += ["", "Pairwise SMDs (list i vs j; positive = list i higher):", ""]
    header = " | ".join(f"{i}v{j}" for i, j in LIST_PAIRS)
    lines += [f"| Attribute | {header} |", "|---" * (len(LIST_PAIRS) + 1) + "|"]
    for attr in BALANCE_ATTRS:
        m = balance_metrics(selected, attr)
        cells_ = " | ".join(f"{m['smds'][pair]:+.3f}" for pair in LIST_PAIRS)
        lines.append(f"| {attr} | {cells_} |")
    lines += [
        "",
        f"Within-list pairwise name Levenshtein distance >= {MIN_NAME_DISTANCE} (enforced).",
        "",
        "## Names",
        "",
        "First names are taken from the Office for National Statistics *Baby names explorer*",
        "(England and Wales; released 9 July 2025;",
        "[ONS baby names explorer](https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/articles/babynamesexplorer/2019-06-07)),",
        "which ranks the 100 most frequent given names of each gender in the latest year",
        "and reports each name's annual rank back to 1996 (Open Government Licence v3.0).",
        f"**20-year historical popularity** is the mean annual rank over {name_pool.window[0]}-{name_pool.window[1]}",
        f"(the most recent {POPULARITY_YEARS} published years); rank 1 is the most frequent name that year.",
        "ONS ranks exact spellings separately, so the selector keeps one member of each",
        "transliteration/spelling cluster (the historically more popular one). Unisex names",
        "that appear in both gender tables are assigned to the gender where they are more popular.",
        "The 40 names of each gender with the lowest 20-year mean rank are then snake-dealt",
        "into the four lists (10 male and 10 female per list). A hill-climb then swaps names",
        "only within gender until 20-year mean rank is equated across lists *separately* for",
        "male names and for female names, so one gender cannot offset imbalance in the other,",
        f"subject to the within-list Levenshtein floor of {MIN_NAME_DISTANCE}.",
        "",
    ]
    if name_pool.unisex:
        kept = ", ".join(
            f"{n} ({g}, male rank {rm:.1f} / female rank {rf:.1f})"
            for n, g, rm, rf in name_pool.unisex
            if n in name_pool.male or n in name_pool.female
        )
        if kept:
            lines += [f"Unisex names in the selected set: {kept}.", ""]
    if name_pool.dropped_variants:
        dropped = ", ".join(f"{d} (kept {k})" for d, k in name_pool.dropped_variants)
        lines += [f"Spelling variants dropped: {dropped}.", ""]
    name_rows = [
        ("name_rank_20y (male)", [t for t in selected if t.gender == "M"]),
        ("name_rank_20y (female)", [t for t in selected if t.gender == "F"]),
        ("name_rank_20y (all)", selected),
    ]
    lines += [
        "| Attribute | max \\|SMD\\| | Variance ratio | max KS D | TOST max p | TOST bound | ANOVA F | ANOVA p |",
        "|---|---|---|---|---|---|---|---|",
    ]
    metrics = []
    for label, subset in name_rows:
        m = balance_metrics(subset, "name_rank_20y")
        metrics.append((label, m))
        lines.append(
            f"| {label} | {m['max_abs_smd']:.3f} | {m['variance_ratio']:.3f} "
            f"| {m['max_ks']:.3f} | {m['max_tost_p']:.4f} | +/-{m['tost_min_bound']:.2f} SD "
            f"| {m['anova_f']:.3f} | {m['anova_p']:.3f} |"
        )
    lines += [
        "",
        "Pairwise SMDs of 20-year mean rank (list i vs j; positive = list i less popular / higher rank):",
        "",
    ]
    header = " | ".join(f"{i}v{j}" for i, j in LIST_PAIRS)
    lines += [f"| Attribute | {header} |", "|---" * (len(LIST_PAIRS) + 1) + "|"]
    for label, m in metrics:
        cells_ = " | ".join(f"{m['smds'][pair]:+.3f}" for pair in LIST_PAIRS)
        lines.append(f"| {label} | {cells_} |")
    lines += [
        "",
        "Names on each list, most historically popular first (20-year mean rank in parentheses):",
        "",
    ]
    for lid in range(1, N_LISTS + 1):
        ts = list_targets(selected, lid)
        lines.append(f"**List {lid}**")
        for gender, label in (("M", "Male"), ("F", "Female")):
            members = sorted(
                [t for t in ts if t.gender == gender],
                key=lambda t: (t.name_rank_20y, t.name),
            )
            cells = ", ".join(f"{t.name} ({t.name_rank_20y:.1f})" for t in members)
            lines.append(f"- {label}: {cells}")
        lines.append("")
    lines += [
        "## Pairs",
        "",
        "| List | pair_id | CFD target | Race | Gender | AgeRated | Attractive | Name | Rank 20y |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for lid in range(1, N_LISTS + 1):
        for t in sorted(list_targets(selected, lid), key=lambda t: t.pair_id):
            lines.append(
                f"| {lid} | {t.pair_id} | {t.cfd_target} | {t.race} | {t.gender} "
                f"| {t.age_rated:.1f} | {t.attractive:.2f} | {t.name} | {t.name_rank_20y:.1f} |"
            )
    REPORT_PATH.write_text("\n".join(lines) + "\n")
    logger.info("Wrote %s", REPORT_PATH)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--cfd-zip", type=Path, default=Path("/tmp/cfd.zip"))
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--inspect", action="store_true", help="print workbook structure and exit")
    ap.add_argument(
        "--repartition",
        action="store_true",
        help="re-optimize the list partition of the 80 targets already in lists.json "
        "(no CFD zip or image processing; the image set is unchanged)",
    )
    ap.add_argument(
        "--reassign-names",
        action="store_true",
        help="keep the face partition and pair_ids in lists.json; reassign ONS names only",
    )
    ap.add_argument(
        "--ons-xlsx",
        type=Path,
        default=ONS_XLSX,
        help="ONS Baby names explorer workbook (England and Wales ranks)",
    )
    args = ap.parse_args()

    if args.repartition and args.reassign_names:
        ap.error("use only one of --repartition and --reassign-names")

    name_pool = None if args.inspect else load_ons_name_pool(args.ons_xlsx)

    if args.reassign_names:
        selected, pool_size = load_from_lists_json()
        assign_names(selected, args.seed, name_pool, shuffle_pair_ids=False)
        write_lists_json(selected, args.seed, pool_size, name_pool)
        write_report(selected, pool_size, args.seed, name_pool)
        logger.info("Reassigned names on %d targets across %d lists", len(selected), N_LISTS)
        return

    if args.repartition:
        selected, pool_size = load_from_lists_json()
        cells: dict[tuple[str, str], list[Target]] = {}
        for t in selected:
            cells.setdefault((t.race, t.gender), []).append(t)
        hill_climb(selected, cells)
        assign_names(selected, args.seed, name_pool)
        write_lists_json(selected, args.seed, pool_size, name_pool)
        write_report(selected, pool_size, args.seed, name_pool)
        logger.info("Repartitioned %d targets across %d lists", len(selected), N_LISTS)
        return

    with zipfile.ZipFile(args.cfd_zip) as zf:
        member = find_norming_workbook(zf)
        df = load_norming_sheet(zf, member, inspect=args.inspect)
        if args.inspect:
            logger.info("Detected columns: %s", list(df.columns)[:40])
            return
        assert name_pool is not None
        images = index_neutral_images(zf)
        logger.info("Neutral images indexed: %d models", len(images))
        pool = build_pool(df, images)
        cells = select_cells(pool)
        selected = [t for members in cells.values() for t in members]
        snake_deal(cells)
        hill_climb(selected, cells)
        assign_names(selected, args.seed, name_pool)
        process_images(zf, selected)

    write_lists_json(selected, args.seed, len(pool), name_pool)
    write_report(selected, len(pool), args.seed, name_pool)
    logger.info("Done: %d targets across %d lists", len(selected), N_LISTS)


if __name__ == "__main__":
    main()
