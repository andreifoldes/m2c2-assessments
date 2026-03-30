#!/usr/bin/env node
/**
 * Face Selection Tool — select a balanced subset from the analyzed pool
 *
 * Balances across gender, age bins, and skin tone groups.
 *
 * Usage:
 *   node select-faces.js [options]
 *
 * Options:
 *   --pool <path>     Path to all-faces-metadata.json
 *   --target <n>      Number of faces to select (default: 100)
 *   --min-age <n>     Minimum age (default: 18)
 *   --max-age <n>     Maximum age (default: 75)
 *   --output <path>   Output path for selected-faces.json
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const DEFAULT_IMAGES = join(__dirname, "..", "assets", "fname", "images");
const POOL_PATH = getArg("pool", join(DEFAULT_IMAGES, "all-faces-metadata.json"));
const TARGET = parseInt(getArg("target", "100"), 10);
const MIN_AGE = parseInt(getArg("min-age", "18"), 10);
const MAX_AGE = parseInt(getArg("max-age", "75"), 10);
const OUTPUT_PATH = getArg("output", join(DEFAULT_IMAGES, "selected-faces.json"));

let pool;
try {
  pool = JSON.parse(readFileSync(POOL_PATH, "utf8"));
} catch (e) {
  console.error(`Cannot read pool: ${POOL_PATH}`);
  process.exit(1);
}

const ageFiltered = pool.filter((f) => f.age >= MIN_AGE && f.age <= MAX_AGE);
console.log(`Pool: ${pool.length} total, ${ageFiltered.length} in age ${MIN_AGE}-${MAX_AGE}`);
console.log(`Target: ${TARGET} faces\n`);

// ---------------------------------------------------------------------------
// Bucket definitions
// ---------------------------------------------------------------------------
const GENDERS = ["Male", "Female"];
const AGE_BINS = [
  { label: "18-29", min: 18, max: 29 },
  { label: "30-39", min: 30, max: 39 },
  { label: "40-49", min: 40, max: 49 },
  { label: "50-59", min: 50, max: 59 },
  { label: "60+", min: 60, max: 999 },
];
const SKIN_GROUPS = ["light", "medium", "dark"];

function getAgeBin(age) {
  for (const bin of AGE_BINS) {
    if (age >= bin.min && age <= bin.max) return bin.label;
  }
  return "unknown";
}

function getSkinGroup(face) {
  return face.skin_tone_group || "unknown";
}

// ---------------------------------------------------------------------------
// Stratified selection: fill each (gender × ageBin × skinGroup) cell evenly
// ---------------------------------------------------------------------------
// Build cells
const cells = {};
for (const g of GENDERS) {
  for (const ab of AGE_BINS) {
    for (const sg of SKIN_GROUPS) {
      const key = `${g}|${ab.label}|${sg}`;
      cells[key] = [];
    }
  }
}

// Assign each face to its cell
for (const face of ageFiltered) {
  const g = face.gender;
  const ab = getAgeBin(face.age);
  const sg = getSkinGroup(face);
  const key = `${g}|${ab}|${sg}`;
  if (cells[key]) cells[key].push(face);
}

// Print cell availability
console.log("Available faces per cell (gender × age × skin):");
const nonEmpty = [];
for (const [key, faces] of Object.entries(cells)) {
  if (faces.length > 0) {
    nonEmpty.push({ key, count: faces.length });
  }
}
nonEmpty.sort((a, b) => a.count - b.count);
for (const { key, count } of nonEmpty) {
  console.log(`  ${key}: ${count}`);
}
const emptyCells = Object.entries(cells).filter(([, v]) => v.length === 0);
if (emptyCells.length > 0) {
  console.log(`  (${emptyCells.length} empty cells — not enough diversity in pool)`);
}

// Round-robin selection: pick one face from each non-empty cell, repeat
const selected = [];
const used = new Set();

// Shuffle faces within each cell for randomness
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const cellQueues = {};
for (const [key, faces] of Object.entries(cells)) {
  cellQueues[key] = shuffle(faces);
}

// Prioritize rare cells (fewer available faces) to maximize diversity
const cellOrder = Object.keys(cells)
  .filter((k) => cells[k].length > 0)
  .sort((a, b) => cells[a].length - cells[b].length);

let passes = 0;
while (selected.length < TARGET && passes < 50) {
  let addedThisPass = false;
  for (const key of cellOrder) {
    if (selected.length >= TARGET) break;
    const queue = cellQueues[key];
    while (queue.length > 0) {
      const face = queue.shift();
      if (!used.has(face.id)) {
        selected.push(face);
        used.add(face.id);
        addedThisPass = true;
        break;
      }
    }
  }
  if (!addedThisPass) break;
  passes++;
}

// If we still need more, fill from remaining age-filtered faces
if (selected.length < TARGET) {
  for (const face of shuffle(ageFiltered)) {
    if (selected.length >= TARGET) break;
    if (!used.has(face.id)) {
      selected.push(face);
      used.add(face.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log(`\nSelected: ${selected.length}/${TARGET}\n`);

const gCounts = {};
const abCounts = {};
const sgCounts = {};
for (const f of selected) {
  gCounts[f.gender] = (gCounts[f.gender] || 0) + 1;
  const ab = getAgeBin(f.age);
  abCounts[ab] = (abCounts[ab] || 0) + 1;
  const sg = getSkinGroup(f);
  sgCounts[sg] = (sgCounts[sg] || 0) + 1;
}

console.log("Gender:", gCounts);
console.log("Age bins:", abCounts);
console.log("Skin tone:", sgCounts);

if (selected.length > 0) {
  const ages = selected.map((f) => f.age);
  console.log(
    `Age range: ${Math.min(...ages)}-${Math.max(...ages)}, mean ${(
      ages.reduce((a, b) => a + b, 0) / ages.length
    ).toFixed(1)}`,
  );
}

writeFileSync(OUTPUT_PATH, JSON.stringify(selected, null, 2));
console.log(`\nSaved to ${OUTPUT_PATH}`);
