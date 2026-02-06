/**
 * Build script for m2c2kit cognitive assessments.
 *
 * Copies the pre-built assessment bundles from node_modules into
 * ./assessments/ so GitHub Pages can serve them alongside index.html.
 *
 * Usage:
 *   npm install
 *   npm run build
 *   # then commit and push to deploy via GitHub Pages
 */

const fs = require("fs");
const path = require("path");

const assessments = [
  {
    name: "symbol-search",
    pkg: "@m2c2kit/assessment-symbol-search",
  },
  {
    name: "color-dots",
    pkg: "@m2c2kit/assessment-color-dots",
  },
  {
    name: "color-shapes",
    pkg: "@m2c2kit/assessment-color-shapes",
  },
];

const outputBase = path.join(__dirname, "assessments");

for (const assessment of assessments) {
  const destDir = path.join(outputBase, assessment.name);
  fs.mkdirSync(destDir, { recursive: true });

  const pkgRoot = path.join(__dirname, "node_modules", assessment.pkg);
  if (!fs.existsSync(pkgRoot)) {
    console.error(`Could not find package ${assessment.pkg}. Run npm install first.`);
    process.exit(1);
  }

  // Copy dist/ (JS bundles) and assets/ (fonts, images)
  const distDir = path.join(pkgRoot, "dist");
  if (fs.existsSync(distDir)) {
    copyRecursive(distDir, destDir);
  }
  const assetsDir = path.join(pkgRoot, "assets");
  if (fs.existsSync(assetsDir)) {
    const destAssets = path.join(destDir, "assets");
    fs.mkdirSync(destAssets, { recursive: true });
    copyRecursive(assetsDir, destAssets);
  }
  console.log(`Copied ${assessment.name} -> ${destDir}`);
}

console.log("Build complete. Commit and push to deploy.");

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
