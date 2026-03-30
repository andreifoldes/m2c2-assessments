#!/usr/bin/env node
/**
 * Face Database Curation Tool
 *
 * Fetches candidate face images from 100k-faces, analyzes demographics via
 * Face++ API, and selects a balanced subset matching UK population targets.
 *
 * Usage:
 *   node curate-faces.js --key <FPP_KEY> --secret <FPP_SECRET> [options]
 *
 * Or with env vars:
 *   FPP_KEY=... FPP_SECRET=... node curate-faces.js
 *
 * Options:
 *   --candidates <n>   Number of faces to fetch and analyze (default: 300)
 *   --target <n>       Number of faces to select for the final set (default: 60)
 *   --output <dir>     Output directory (default: ../assets/fname/images)
 *   --dry-run          Analyze only, don't save images
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const FPP_KEY = getArg("key", process.env.FPP_KEY);
const FPP_SECRET = getArg("secret", process.env.FPP_SECRET);
const NUM_CANDIDATES = parseInt(getArg("candidates", "2000"), 10);
const TARGET_COUNT = parseInt(getArg("target", "100"), 10);
const MIN_AGE_POOL = parseInt(getArg("min-age-pool", "200"), 10);
const OUTPUT_DIR = getArg(
  "output",
  join(__dirname, "..", "assets", "fname", "images"),
);
const DRY_RUN = args.includes("--dry-run");

if (!FPP_KEY || !FPP_SECRET) {
  console.error(
    "Error: Face++ API key and secret required.\n" +
      "  --key <KEY> --secret <SECRET>  or  FPP_KEY=... FPP_SECRET=...",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// UK demographic targets (2021 Census approximate)
// ---------------------------------------------------------------------------
const UK_TARGETS = {
  gender: { Male: 0.50, Female: 0.50 },
  // Fitzpatrick skin tone targets (approximate UK population)
  // I-II ~70%, III-IV ~20%, V-VI ~10%
  skinTone: {
    light: { types: ["I", "II"], target: 0.70 },
    medium: { types: ["III", "IV"], target: 0.20 },
    dark: { types: ["V", "VI"], target: 0.10 },
  },
  age: { min: 40, max: 75 },
};

// ---------------------------------------------------------------------------
// Fetch face image
// ---------------------------------------------------------------------------
function randomFaceUrl() {
  const id = Math.floor(Math.random() * 10000);
  const padded = String(id).padStart(6, "0");
  const dir1 = Math.floor(id / 10000);
  const dir2 = Math.floor((id % 10000) / 1000);
  return {
    url: `https://ozgrozer.github.io/100k-faces/${dir1}/${dir2}/${padded}.jpg`,
    id: padded,
  };
}

async function fetchImageAsBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

// ---------------------------------------------------------------------------
// Face++ API
// ---------------------------------------------------------------------------
const FPP_API = "https://api-us.faceplusplus.com/facepp/v3/detect";

async function analyzeFace(base64) {
  const formData = new URLSearchParams();
  formData.append("api_key", FPP_KEY);
  formData.append("api_secret", FPP_SECRET);
  formData.append("image_base64", base64);
  formData.append("return_attributes", "gender,age,ethnicity");

  const resp = await fetch(FPP_API, {
    method: "POST",
    body: formData,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (resp.status === 403) {
    const text = await resp.text();
    throw new Error(`Face++ 403: ${text}`);
  }
  if (!resp.ok) throw new Error(`Face++ HTTP ${resp.status}`);

  const data = await resp.json();
  if (!data.faces || data.faces.length === 0) return null;

  const face = data.faces[0];
  const attrs = face.attributes;
  return {
    age: attrs.age?.value ?? null,
    gender: attrs.gender?.value ?? null,
    _faceRect: face.face_rectangle,
  };
}

// ---------------------------------------------------------------------------
// Skin tone classification via SkinToneClassifier (stone)
// pip install skin-tone-classifier
// ---------------------------------------------------------------------------
async function classifySkinTone(imagePath) {
  const { execSync } = await import("child_process");
  try {
    // Run stone CLI on the image, capture JSON output
    const result = execSync(
      `stone -i "${imagePath}" --return_report_image=False -q`,
      { encoding: "utf8", timeout: 30000 },
    );
    // stone outputs a CSV-like result. Parse the last line.
    const lines = result.trim().split("\n").filter(Boolean);
    // Look for the result CSV file instead
    return null; // Will parse from CSV below
  } catch (_) {
    return null;
  }
}

async function classifySkinToneBatch(imageDir) {
  const { execSync } = await import("child_process");
  try {
    // Run stone on the entire directory — much faster than per-image
    // -o sends output CSV to imageDir, no -d means no debug images
    execSync(
      `stone -i "${imageDir}" -o "${imageDir}"`,
      { encoding: "utf8", timeout: 300000 },
    );
    // stone writes result.csv in the output dir
    const { readFileSync } = await import("fs");
    const csvPath = join(imageDir, "result.csv");
    if (!existsSync(csvPath)) {
      console.warn("  [WARN] stone did not produce result.csv");
      return {};
    }
    const csv = readFileSync(csvPath, "utf8");
    const lines = csv.trim().split("\n");
    const header = lines[0].split(",").map((h) => h.trim());
    const results = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const row = {};
      header.forEach((h, idx) => (row[h] = cols[idx]?.trim()));
      const fname = row["file"];
      if (fname) results[fname] = row;
    }
    return results;
  } catch (e) {
    console.warn(`  [WARN] stone classification failed: ${e.message}`);
    console.warn("  Install with: pip install skin-tone-classifier");
    return {};
  }
}

// Rate limit: Face++ free tier allows ~1 request/second
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Selection algorithm
// ---------------------------------------------------------------------------
// Group skin tone by hex luminance. BW scale hex values like #C0C0C0.
function hexToLuminance(hex) {
  if (!hex || !hex.startsWith("#")) return -1;
  const r = parseInt(hex.slice(1, 3), 16);
  return r; // BW scale: R=G=B, so just use R channel (0=darkest, 255=lightest)
}

function getSkinToneGroup(skinTone) {
  const lum = hexToLuminance(skinTone?.hex);
  if (lum < 0) return "unknown";
  if (lum >= 176) return "light";   // #B0+ (lighter tones)
  if (lum >= 112) return "medium";  // #70-#AF
  return "dark";                    // below #70
}

function selectBalancedSubset(candidates, targetCount) {
  const genderTargets = {};
  for (const [g, pct] of Object.entries(UK_TARGETS.gender)) {
    genderTargets[g] = Math.round(targetCount * pct);
  }

  const skinTargets = {};
  for (const [group, def] of Object.entries(UK_TARGETS.skinTone)) {
    skinTargets[group] = Math.round(targetCount * def.target);
  }

  // Filter by age range (40+)
  const ageFiltered = candidates.filter(
    (c) =>
      c.demographics &&
      c.demographics.age >= UK_TARGETS.age.min &&
      c.demographics.age <= UK_TARGETS.age.max,
  );

  console.log(
    `  Age-filtered: ${ageFiltered.length}/${candidates.length} (${UK_TARGETS.age.min}-${UK_TARGETS.age.max})`,
  );

  const selected = [];
  const genderCounts = {};
  const skinCounts = {};
  const used = new Set();

  // Sort: prioritize darker tones first (rarer in AI-generated datasets)
  const sorted = [...ageFiltered].sort((a, b) => {
    const aLum = hexToLuminance(a.demographics.skinTone?.hex);
    const bLum = hexToLuminance(b.demographics.skinTone?.hex);
    return aLum - bLum; // lower luminance (darker) first
  });

  for (const face of sorted) {
    if (selected.length >= targetCount) break;
    if (used.has(face.id)) continue;

    const d = face.demographics;
    const skinGroup = getSkinToneGroup(d.skinTone);

    const gCount = genderCounts[d.gender] || 0;
    const sCount = skinCounts[skinGroup] || 0;
    const gTarget = genderTargets[d.gender] || 0;
    const sTarget = skinTargets[skinGroup] || Infinity;

    if (gCount >= gTarget && sCount >= sTarget) continue;

    selected.push(face);
    used.add(face.id);
    genderCounts[d.gender] = gCount + 1;
    skinCounts[skinGroup] = sCount + 1;
  }

  // Fill remaining with any age-filtered candidate
  for (const face of ageFiltered) {
    if (selected.length >= targetCount) break;
    if (used.has(face.id)) continue;
    selected.push(face);
    used.add(face.id);
    const d = face.demographics;
    genderCounts[d.gender] = (genderCounts[d.gender] || 0) + 1;
    const sg = getSkinToneGroup(d.skinTone);
    skinCounts[sg] = (skinCounts[sg] || 0) + 1;
  }

  return { selected, genderCounts, skinCounts };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { mkdtempSync, rmSync, copyFileSync } = await import("fs");
  const { tmpdir } = await import("os");

  console.log("Face Database Curation Tool");
  console.log("==========================");
  console.log(`Max candidates: ${NUM_CANDIDATES}`);
  console.log(`Min age 40+ faces needed: ${MIN_AGE_POOL}`);
  console.log(`Target selection size: ${TARGET_COUNT}`);
  console.log(`Age range: ${UK_TARGETS.age.min}-${UK_TARGETS.age.max}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log();

  // Load existing pool if present (to avoid re-fetching)
  const existingMetaPath = join(OUTPUT_DIR, "all-faces-metadata.json");
  let existingPool = [];
  const usedIds = new Set();
  if (existsSync(existingMetaPath)) {
    try {
      existingPool = JSON.parse(readFileSync(existingMetaPath, "utf8"));
      for (const f of existingPool) usedIds.add(f.id);
      console.log(`  Loaded ${existingPool.length} existing faces (will skip these IDs)`);
    } catch (_) {}
  }
  const priorAgeQualified = existingPool.filter(
    (f) => f.age >= UK_TARGETS.age.min && f.age <= UK_TARGETS.age.max,
  ).length;
  console.log(`  Existing 40+ faces: ${priorAgeQualified}`);
  if (priorAgeQualified >= MIN_AGE_POOL) {
    console.log(`  Already have enough! Skipping fetch, proceeding to selection.`);
  }

  // Step 1: Fetch images + Face++ age/gender until we have enough 40+ faces
  console.log("\nStep 1: Fetching new faces until we have enough 40+ images...");
  const tmpDir = mkdtempSync(join(tmpdir(), "fname-faces-"));
  console.log(`  Temp dir: ${tmpDir}`);
  const candidates = [];
  let failures = 0;
  let fetched = 0;
  let ageQualified = priorAgeQualified;

  while (ageQualified < MIN_AGE_POOL && fetched < NUM_CANDIDATES) {
    const target = randomFaceUrl();
    if (usedIds.has(target.id)) continue; // avoid duplicate IDs
    usedIds.add(target.id);
    fetched++;

    try {
      const base64 = await fetchImageAsBase64(target.url);
      const fppResult = await analyzeFace(base64);

      if (fppResult) {
        const filename = `face_${target.id}.jpg`;
        writeFileSync(join(tmpDir, filename), Buffer.from(base64, "base64"));
        const isAgeOk =
          fppResult.age >= UK_TARGETS.age.min &&
          fppResult.age <= UK_TARGETS.age.max;
        if (isAgeOk) ageQualified++;
        candidates.push({
          id: target.id,
          filename,
          base64,
          demographics: {
            age: fppResult.age,
            gender: fppResult.gender,
            skinTone: null, // filled in step 2
          },
        });
        process.stdout.write(
          `\r  [${fetched}] ${target.id}: ` +
            `${fppResult.gender}, age ${fppResult.age}` +
            ` | 40+ pool: ${ageQualified}/${MIN_AGE_POOL}` +
            "                    ",
        );
      } else {
        failures++;
      }
    } catch (e) {
      failures++;
      process.stdout.write(
        `\r  [${fetched}] ${target.id}: ERROR ${e.message}                `,
      );
    }
    await sleep(1100); // Face++ rate limit
  }

  console.log(
    `\n\n  Total fetched: ${candidates.length} faces (${failures} failures)`,
  );
  console.log(
    `  Age ${UK_TARGETS.age.min}+ qualified: ${ageQualified}`,
  );

  // Step 2: Batch skin tone classification with stone
  console.log("\nStep 2: Running skin tone classification (stone)...");
  const stoneResults = await classifySkinToneBatch(tmpDir);
  const stoneKeys = Object.keys(stoneResults);
  console.log(`  stone analyzed: ${stoneKeys.length} faces`);

  // Merge stone results into candidates
  for (const c of candidates) {
    const stoneRow = stoneResults[c.filename];
    if (stoneRow) {
      c.demographics.skinTone = {
        hex: stoneRow["skin tone"] || null,
        tone_label: stoneRow["tone label"] || null,
        accuracy: parseFloat(stoneRow["accuracy(0-100)"] || "0"),
        dominant_1: stoneRow["dominant 1"] || null,
      };
    }
  }

  // Build combined candidate list for selection (existing + new)
  // Convert existing metadata back to candidate format
  const allCandidates = [
    ...existingPool.map((m) => ({
      id: m.id,
      filename: m.filename,
      demographics: {
        age: m.age,
        gender: m.gender,
        skinTone: { hex: m.skin_tone_hex, tone_label: m.skin_tone_label, accuracy: m.skin_tone_accuracy },
      },
    })),
    ...candidates,
  ];

  // Step 3: Print demographics summary
  console.log(`\nStep 3: Demographics summary of full pool (${allCandidates.length} faces):`);
  const genders = {};
  const toneLabels = {};
  const ages = [];
  for (const c of allCandidates) {
    const d = c.demographics;
    genders[d.gender] = (genders[d.gender] || 0) + 1;
    const group = getSkinToneGroup(d.skinTone);
    toneLabels[group] = (toneLabels[group] || 0) + 1;
    ages.push(d.age);
  }
  console.log("  Genders:", genders);
  console.log("  Skin tone labels:", toneLabels);
  if (ages.length > 0) {
    console.log(
      `  Age range: ${Math.min(...ages)}-${Math.max(...ages)}, ` +
        `mean: ${(ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1)}`,
    );
  }

  // Step 4: Select balanced subset
  console.log(`\nStep 4: Selecting ${TARGET_COUNT} balanced faces...`);
  const { selected, genderCounts, skinCounts } = selectBalancedSubset(
    allCandidates,
    TARGET_COUNT,
  );
  console.log(`  Selected: ${selected.length}`);
  console.log("  Gender distribution:", genderCounts);
  console.log("  Skin tone distribution:", skinCounts);

  // Step 5: Save ALL analyzed images + merge with existing metadata
  const totalNew = candidates.length;
  console.log(`\nStep 5: Saving ${totalNew} new faces to ${OUTPUT_DIR} (merging with ${existingPool.length} existing)...`);
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const allMetadata = [];
  for (const face of candidates) {
    const filepath = join(OUTPUT_DIR, face.filename);
    copyFileSync(join(tmpDir, face.filename), filepath);
    allMetadata.push({
      id: face.id,
      filename: face.filename,
      age: face.demographics.age,
      gender: face.demographics.gender,
      skin_tone_hex: face.demographics.skinTone?.hex ?? null,
      skin_tone_label: face.demographics.skinTone?.tone_label ?? null,
      skin_tone_group: getSkinToneGroup(face.demographics.skinTone),
      skin_tone_accuracy: face.demographics.skinTone?.accuracy ?? null,
      dominant_color: face.demographics.skinTone?.dominant_1 ?? null,
    });
  }

  // Merge with existing pool
  const mergedMetadata = [...existingPool, ...allMetadata];
  const allMetaPath = join(OUTPUT_DIR, "all-faces-metadata.json");
  writeFileSync(allMetaPath, JSON.stringify(mergedMetadata, null, 2));
  console.log(`  Total pool: ${mergedMetadata.length} faces (${existingPool.length} existing + ${allMetadata.length} new)`);

  // Save the selected subset as a separate file
  if (!DRY_RUN) {
    const selectedMeta = mergedMetadata.filter((m) =>
      selected.some((s) => s.id === m.id),
    );
    const selectedPath = join(OUTPUT_DIR, "selected-faces.json");
    writeFileSync(selectedPath, JSON.stringify(selectedMeta, null, 2));
    console.log(`  Selected subset: ${selectedMeta.length} → selected-faces.json`);
  }

  // Cleanup temp
  rmSync(tmpDir, { recursive: true, force: true });

  console.log("\nDone!");
  console.log("  all-faces-metadata.json  — full pool with demographics");
  console.log("  selected-faces.json      — balanced subset for the assessment");
  console.log("\nTo re-select with different criteria, run:");
  console.log("  node select-faces.js --pool all-faces-metadata.json --target 60");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
