/**
 * Generates the Docusaurus docs pages from the task source code.
 *
 * For every task it extracts:
 *   - the `defaultParameters` schema (name, type, default, enum, description)
 *     from the assessment source (custom tasks) or the bundled m2c2kit module
 *     (npm tasks, from dist/modules/@m2c2kit/<pkg>@<version>/dist/index.js);
 *   - the URL keys the launch wrapper actually reads (`params.get("x")` and
 *     whitelist arrays in `for (const key of [...])` loops);
 *   - deployment overrides (the first `setParameters({...})` literal in the
 *     wrapper).
 *
 * Output: website/docs/**.md (fully generated — never edit by hand).
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { SITE_BASE, WRAPPER_PARAM_DOCS, TASKS } from "../tasks.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DOCS_DIR = path.join(__dirname, "..", "docs");

const warnings = [];
const warn = (msg) => {
  warnings.push(msg);
  console.warn(`WARN: ${msg}`);
};

// --------------------------------------------------------------------------
// Extraction helpers
// --------------------------------------------------------------------------

/** Return the source text of a brace-balanced `{...}` starting at `start`. */
function braceMatch(text, start) {
  if (text[start] !== "{") throw new Error("braceMatch: not at '{'");
  let depth = 0;
  let inString = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inString = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("braceMatch: unbalanced braces");
}

/** Evaluate an object-literal source string in an isolated context. */
function evalObjectLiteral(objText) {
  return vm.runInNewContext(`(${objText})`, {}, { timeout: 1000 });
}

/**
 * Extract the `const defaultParameters = {...}` schema from an assessment
 * source file. Returns { name: { default, type, enum?, description } }.
 */
function extractSchema(file) {
  const text = fs.readFileSync(file, "utf8");
  const marker = "defaultParameters = {";
  const idx = text.indexOf(marker);
  if (idx === -1) throw new Error(`No defaultParameters found in ${file}`);
  const objText = braceMatch(text, idx + marker.length - 1);
  return evalObjectLiteral(objText);
}

/** URL keys read by a wrapper via literal `.get("x")` calls. */
function extractLiteralGetKeys(text) {
  const keys = new Set();
  const re = /(?:[Pp]arams|searchParams)\.get\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of text.matchAll(re)) keys.add(m[1]);
  const inlineRe = /URLSearchParams\([^)]*\)\.get\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of text.matchAll(inlineRe)) keys.add(m[1]);
  return keys;
}

/** String elements of `for (const key of [ "...", ... ])` whitelist loops. */
function extractWhitelistKeys(text) {
  const keys = new Set();
  const re = /for\s*\(\s*const\s+\w+\s+of\s+(\[[^\]]*\])\s*\)/g;
  for (const m of text.matchAll(re)) {
    for (const s of m[1].matchAll(/["']([^"']+)["']/g)) keys.add(s[1]);
  }
  return keys;
}

/** First `setParameters({...})` object literal in a wrapper (site overrides). */
function extractSiteOverrides(text) {
  const re = /setParameters\(\s*\{/g;
  for (const m of text.matchAll(re)) {
    const braceStart = text.indexOf("{", m.index + "setParameters(".length - 1);
    try {
      return evalObjectLiteral(braceMatch(text, braceStart));
    } catch {
      // Non-literal call (e.g. references runtime variables) — try the next one.
    }
  }
  return {};
}

function analyzeWrapper(file) {
  const text = fs.readFileSync(file, "utf8");
  return {
    urlKeys: new Set([
      ...extractLiteralGetKeys(text),
      ...extractWhitelistKeys(text),
    ]),
    forwardsAllParams: text.includes("setGameParametersFromUrlParams"),
    siteOverrides: extractSiteOverrides(text),
  };
}

/** Latest `<base>@x.y.z` directory in `dir`, by semver. */
function latestVersionDir(dir, base) {
  const versions = fs
    .readdirSync(dir)
    .filter((d) => d.startsWith(`${base}@`))
    .map((d) => d.slice(base.length + 1))
    .sort((a, b) => {
      const pa = a.split(".").map(Number);
      const pb = b.split(".").map(Number);
      for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
      return 0;
    });
  if (versions.length === 0) throw new Error(`No versions of ${base} in ${dir}`);
  return versions[versions.length - 1];
}

// --------------------------------------------------------------------------
// Per-task model
// --------------------------------------------------------------------------

function resolveTask(task) {
  if (task.kind === "custom") {
    const wrapper = analyzeWrapper(path.join(REPO_ROOT, task.wrapperFile));
    return {
      ...task,
      schema: extractSchema(path.join(REPO_ROOT, task.sourceFile)),
      wrapper,
      launchUrl: `${SITE_BASE}/${task.launchPath}`,
      version: null,
    };
  }

  // m2c2kit npm assessment: resolve the latest deployed version.
  const assessDir = path.join(REPO_ROOT, "dist", "assessments", "@m2c2kit");
  const version = latestVersionDir(assessDir, task.pkg);
  const wrapperFile = path.join(assessDir, `${task.pkg}@${version}`, "index.js");
  const moduleFile = path.join(
    REPO_ROOT,
    "dist",
    "modules",
    "@m2c2kit",
    `${task.pkg}@${version}`,
    "dist",
    "index.js",
  );
  return {
    ...task,
    schema: extractSchema(moduleFile),
    wrapper: analyzeWrapper(wrapperFile),
    launchUrl: `${SITE_BASE}/dist/assessments/@m2c2kit/${task.pkg}@${version}/`,
    version,
    sourceFile: path.relative(REPO_ROOT, moduleFile),
    wrapperFile: path.relative(REPO_ROOT, wrapperFile),
  };
}

// --------------------------------------------------------------------------
// Markdown rendering
// --------------------------------------------------------------------------

/** Make a value safe inside a CommonMark table cell. */
function cell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function fmtDefault(value) {
  if (value === undefined || value === "—") return "—";
  if (typeof value === "string") {
    if (value === "" ) return "`\"\"`";
    if (value === "—") return "—";
    return `\`${value}\``;
  }
  return `\`${JSON.stringify(value)}\``;
}

function fmtType(spec) {
  const t = spec.type ?? "string";
  return Array.isArray(t) ? t.join(" or ") : t;
}

function fmtDescription(spec) {
  let d = spec.description ?? "";
  if (spec.enum) {
    const values = spec.enum.map((v) => `\`${JSON.stringify(v)}\``).join(", ");
    d += ` Allowed values: ${values}.`;
  }
  return d.trim();
}

/**
 * Split a task's URL surface into wrapper-level (session) parameters and
 * assessment (schema) parameters, and figure out which schema parameters can
 * be set through the URL.
 */
function paramTables(task) {
  const schemaNames = new Set(Object.keys(task.schema));
  const sessionParams = [];
  for (const key of [...task.wrapper.urlKeys].sort()) {
    if (schemaNames.has(key)) continue; // documented in the schema table
    const doc = WRAPPER_PARAM_DOCS[key];
    if (!doc) {
      warn(`${task.id}: URL parameter "${key}" has no entry in WRAPPER_PARAM_DOCS`);
      sessionParams.push({ name: key, type: "string", default: "—", description: "" });
      continue;
    }
    sessionParams.push({ name: key, ...doc });
  }

  const gameParams = Object.entries(task.schema).map(([name, spec]) => {
    const urlSettable = task.wrapper.forwardsAllParams
      ? true
      : task.wrapper.urlKeys.has(name) ||
        (name === "show_tutorial" && task.wrapper.urlKeys.has("tutorial"));
    const override = task.wrapper.siteOverrides[name];
    return { name, spec, urlSettable, override };
  });

  return { sessionParams, gameParams };
}

function exampleUrls(task, gameParams) {
  const lines = [`# Plain launch (debug mode: results shown on-screen)`, task.launchUrl];
  const has = (k) => task.wrapper.urlKeys.has(k);

  if (has("show_end_screen")) {
    lines.push("", "# Suppress the completion screen", `${task.launchUrl}?show_end_screen=false`);
  }
  if (has("webcam")) {
    lines.push("", "# With camera recording", `${task.launchUrl}?webcam=1`);
  }
  if (has("webgazer")) {
    lines.push("", "# With eye tracking", `${task.launchUrl}?webgazer=1`);
  }

  const custom = gameParams
    .filter((p) => p.urlSettable && ["number", "integer", "boolean"].includes(p.spec.type))
    .slice(0, 3)
    .map((p) => `${p.name}=${JSON.stringify(p.override ?? p.spec.default)}`);
  if (custom.length > 0) {
    lines.push("", "# Customized assessment parameters (values shown are the defaults)");
    lines.push(`${task.launchUrl}?${custom.join("&")}`);
  }

  // Task-specific worked examples from tasks.config.mjs (extraExamples).
  // Entries without a `query` render as section headers grouping the examples below them.
  for (const ex of task.extraExamples ?? []) {
    if (!ex.query) {
      lines.push("", `# ═══ ${ex.comment} ═══`);
      continue;
    }
    lines.push("", `# ${ex.comment}`, `${task.launchUrl}?${ex.query}`);
  }

  lines.push(
    "",
    "# Production: submit results to your server",
    `${task.launchUrl}?token=<TOKEN>&callback_url=<CALLBACK_URL>`,
  );
  return lines.join("\n");
}

function renderTaskPage(task, position) {
  const { sessionParams, gameParams } = paramTables(task);
  const out = [];

  out.push("---");
  out.push(`id: ${task.id}`);
  out.push(`title: "${task.title}"`);
  out.push(`sidebar_position: ${position}`);
  out.push("---");
  out.push("");
  out.push(`# ${task.title}`);
  out.push("");
  out.push(task.blurb);
  out.push("");
  out.push(`- **Duration:** ${task.duration}`);
  out.push(`- **Source:** ${task.reference}`);
  if (task.version) out.push(`- **Deployed version:** \`${task.pkg}@${task.version}\``);
  out.push(`- **Launch URL:** [${task.launchUrl}](${task.launchUrl})`);
  out.push("");

  // Task-specific prose sections from tasks.config.mjs (extraSections).
  for (const section of task.extraSections ?? []) {
    out.push(`## ${section.title}`);
    out.push("");
    out.push(section.body);
    out.push("");
  }

  out.push("## Example URL commands");
  out.push("");
  out.push("```text");
  out.push(exampleUrls(task, gameParams));
  out.push("```");
  out.push("");

  if (sessionParams.length > 0) {
    out.push("## Session parameters");
    out.push("");
    out.push(
      "Handled by the launch wrapper (results submission and optional sensors), not by the assessment itself.",
    );
    out.push("");
    out.push("| Parameter | Type | Default | Description |");
    out.push("|---|---|---|---|");
    for (const p of sessionParams) {
      out.push(
        `| \`${p.name}\` | ${cell(p.type)} | ${cell(fmtDefault(p.default))} | ${cell(p.description)} |`,
      );
    }
    out.push("");
  }

  out.push("## Assessment parameters");
  out.push("");
  if (task.wrapper.forwardsAllParams) {
    out.push(
      "Every parameter below can be set directly as a URL query parameter — the launch wrapper forwards all query parameters to the assessment.",
    );
  } else {
    out.push(
      "Parameters marked **URL** can be set as URL query parameters; the rest are fixed deployment defaults.",
    );
  }
  out.push("");
  out.push("| Parameter | Type | Default | URL | Description |");
  out.push("|---|---|---|---|---|");
  for (const p of gameParams) {
    let def = fmtDefault(p.spec.default);
    if (p.override !== undefined && p.override !== p.spec.default) {
      def = `${fmtDefault(p.override)} (site override; package default ${fmtDefault(p.spec.default)})`;
    }
    const url = p.urlSettable ? "✅" : "—";
    out.push(
      `| \`${p.name}\` | ${cell(fmtType(p.spec))} | ${cell(def)} | ${url} | ${cell(fmtDescription(p.spec))} |`,
    );
  }
  out.push("");

  const extraOverrides = Object.entries(task.wrapper.siteOverrides).filter(
    ([k]) => !(k in task.schema),
  );
  if (extraOverrides.length > 0) {
    out.push("## Deployment overrides");
    out.push("");
    out.push("Engine-level settings applied by the launch wrapper:");
    out.push("");
    for (const [k, v] of extraOverrides) {
      out.push(`- \`${k}\` = \`${JSON.stringify(v)}\``);
    }
    out.push("");
  }

  out.push("---");
  out.push("");
  out.push(
    `*Generated from [\`${task.sourceFile}\`](https://github.com/andreifoldes/m2c2-assessments/blob/main/${task.sourceFile}) and [\`${task.wrapperFile}\`](https://github.com/andreifoldes/m2c2-assessments/blob/main/${task.wrapperFile}). Do not edit by hand.*`,
  );
  out.push("");
  return out.join("\n");
}

function renderIndexPage(tasks) {
  const out = [];
  out.push("---");
  out.push("id: index");
  out.push("title: Overview");
  out.push("sidebar_position: 1");
  out.push("slug: /");
  out.push("---");
  out.push("");
  out.push("# m2c2-assessments URL parameter reference");
  out.push("");
  out.push(
    "Cognitive assessments hosted on GitHub Pages, built with [m2c2kit](https://github.com/m2c2-project/m2c2kit). " +
      "Every task is configured entirely through URL query parameters — this reference is **generated from the task source code** on every change, so it is always in sync with what is deployed.",
  );
  out.push("");
  out.push("| Task | Description | Duration | Launch |");
  out.push("|---|---|---|---|");
  for (const t of tasks) {
    out.push(
      `| [${t.title}](tasks/${t.id}) | ${cell(t.blurb.split(". ")[0])}. | ${cell(t.duration)} | [Launch](${t.launchUrl}) |`,
    );
  }
  out.push("");
  out.push("## How parameters work");
  out.push("");
  out.push(
    "Each task is launched as a plain URL. Query parameters fall into two groups:",
  );
  out.push("");
  out.push(
    "1. **Session parameters** — handled by the launch wrapper: results submission (`token`, `callback_url`), UI behavior (`show_end_screen`, `tutorial`), and optional sensor add-ons (`webcam`, `webgazer`, `light`). See [Common parameters](common-parameters).",
  );
  out.push(
    "2. **Assessment parameters** — forwarded to the m2c2kit game engine to configure the task itself (trial counts, durations, difficulty). Documented on each task's page.",
  );
  out.push("");
  out.push(
    "Without `token` and `callback_url`, tasks run in **debug mode** and display collected trial data on-screen at the end instead of submitting it.",
  );
  out.push("");
  return out.join("\n");
}

function renderCommonPage(tasks) {
  const out = [];
  out.push("---");
  out.push("id: common-parameters");
  out.push("title: Common parameters");
  out.push("sidebar_position: 2");
  out.push("---");
  out.push("");
  out.push("# Common session parameters");
  out.push("");
  out.push(
    "These parameters are handled by each task's launch wrapper. Support varies slightly by task — the matrix below is derived from the wrapper source code.",
  );
  out.push("");
  out.push("| Parameter | Type | Default | Description |");
  out.push("|---|---|---|---|");

  const usedKeys = new Set();
  for (const t of tasks) {
    for (const k of t.wrapper.urlKeys) {
      if (!(k in t.schema)) usedKeys.add(k);
    }
  }
  const commonKeys = Object.keys(WRAPPER_PARAM_DOCS).filter((k) => usedKeys.has(k));
  for (const key of commonKeys) {
    const doc = WRAPPER_PARAM_DOCS[key];
    out.push(
      `| \`${key}\` | ${cell(doc.type)} | ${cell(fmtDefault(doc.default))} | ${cell(doc.description)} |`,
    );
  }
  out.push("");

  out.push("## Support matrix");
  out.push("");
  out.push(`| Parameter | ${tasks.map((t) => t.title).join(" | ")} |`);
  out.push(`|---|${tasks.map(() => "---").join("|")}|`);
  for (const key of commonKeys) {
    const row = tasks.map((t) => (t.wrapper.urlKeys.has(key) ? "✅" : "—"));
    out.push(`| \`${key}\` | ${row.join(" | ")} |`);
  }
  out.push("");
  out.push(
    "> ✅ = the launch wrapper reads this parameter. For m2c2kit library tasks, unknown query parameters are forwarded to the game engine, so only the parameters listed here and on the task pages have an effect.",
  );
  out.push("");
  return out.join("\n");
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

// Remind maintainers when a new task folder exists but is not documented yet.
const NON_TASK_DIRS = new Set(["webcam", "webgazer", "ambient-light", "@m2c2kit"]);
const documentedDirs = new Set(
  TASKS.filter((t) => t.kind === "custom").map((t) => path.basename(path.dirname(t.wrapperFile))),
);
for (const dir of fs.readdirSync(path.join(REPO_ROOT, "assessments"), { withFileTypes: true })) {
  if (!dir.isDirectory() || NON_TASK_DIRS.has(dir.name) || documentedDirs.has(dir.name)) continue;
  if (fs.existsSync(path.join(REPO_ROOT, "assessments", dir.name, "index.html"))) {
    warn(
      `assessments/${dir.name}/ looks like a task but has no entry in website/tasks.config.mjs — add one so it gets documented`,
    );
  }
}

const tasks = TASKS.map(resolveTask);

fs.rmSync(DOCS_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(DOCS_DIR, "tasks"), { recursive: true });

fs.writeFileSync(path.join(DOCS_DIR, "index.md"), renderIndexPage(tasks));
fs.writeFileSync(
  path.join(DOCS_DIR, "common-parameters.md"),
  renderCommonPage(tasks),
);
fs.writeFileSync(
  path.join(DOCS_DIR, "tasks", "_category_.json"),
  JSON.stringify({ label: "Tasks", position: 3, collapsed: false }, null, 2),
);

tasks.forEach((task, i) => {
  fs.writeFileSync(
    path.join(DOCS_DIR, "tasks", `${task.id}.md`),
    renderTaskPage(task, i + 1),
  );
  const settable = Object.keys(task.schema).length;
  console.log(
    `Generated tasks/${task.id}.md (${settable} schema params, ${task.wrapper.urlKeys.size} wrapper URL keys)`,
  );
});

console.log(`\nDone: ${tasks.length} task pages written to ${path.relative(process.cwd(), DOCS_DIR)}`);
if (warnings.length > 0) {
  console.warn(`\n${warnings.length} warning(s) — see above.`);
}
