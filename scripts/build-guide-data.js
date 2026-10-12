#!/usr/bin/env node
/*
 * build-guide-data.js — source-of-truth sync for the SCSS Handbook.
 *
 * Parses styles/ and injects two generated blocks into
 * docs/scss-system-guide.html between HTML-comment markers:
 *
 *   <!--GUIDE_DATA_START--> <script type="application/json" id="guide-data">…</script> <!--GUIDE_DATA_END-->
 *   <!--GUIDE_LOGIC_START--> <script> window.__guideLogic = (…) </script> <!--GUIDE_LOGIC_END-->
 *
 * The data island contains every mixin/function/token/utility, the spacing &
 * breakpoint maps, the @use graph, and a standalone SCSS "preamble" the
 * playground compiles with real dart-sass. The guide reads ALL of these at
 * runtime instead of hardcoding them, so it can never drift from styles/.
 *
 * Usage:
 *   node scripts/build-guide-data.js            # build (writes HTML)
 *   node scripts/build-guide-data.js --verify   # exit 1 if HTML is stale
 *
 * Regex extraction (no Sass parser dependency). Limitations:
 *   - Mixin/function args are captured as a single-line signature; multi-line
 *     signatures are not split (none exist in this codebase today).
 *   - "tokens" are the top-level $vars in abstracts/_tokens.scss only.
 *   - Utility classes are top-of-line `.foo {` selectors in utilities/*.scss.
 *   Anything ambiguous is flagged in data.warnings[].
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STYLES = path.join(ROOT, "styles");
const HTML = path.join(ROOT, "docs", "scss-system-guide.html");
const LOGIC = path.join(ROOT, "scripts", "guide-logic.mjs");

function read(p) { return fs.readFileSync(p, "utf8"); }
function rel(p) { return path.relative(ROOT, p).split(path.sep).join("/"); }

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".scss")) out.push(full);
  }
  return out;
}

function extract() {
  const warnings = [];
  const files = walk(STYLES).sort();
  const mixins = [];
  const functions = [];
  const tokens = [];
  const utilities = [];
  const useGraph = {};
  let spacing = {};
  let breakpoints = {};

  for (const file of files) {
    const r = rel(file);
    const src = read(file);
    const lines = src.split("\n");
    const folder = path.basename(path.dirname(file));
    const base = path.basename(file);

    // @use graph (skip index files; record consumers' relative imports)
    const uses = [];
    lines.forEach((ln) => {
      const m = ln.match(/^\s*@use\s+["']([^"']+)["']/);
      if (m && !m[1].startsWith("sass:")) uses.push(m[1]);
    });
    if (uses.length && base !== "_index.scss") useGraph[r] = uses;

    lines.forEach((ln, i) => {
      const mm = ln.match(/^\s*@mixin\s+([\w-]+)\s*(\([^]*?\))?\s*\{?/);
      if (mm) mixins.push({ name: mm[1], args: (mm[2] || "()").trim(), file: r, line: i + 1, module: folder });
      const fm = ln.match(/^\s*@function\s+([\w-]+)\s*(\([^]*?\))?/);
      if (fm) functions.push({ name: fm[1], args: (fm[2] || "()").trim(), file: r, line: i + 1, module: folder });
      // utilities: top-level class selector lines in utilities/
      if (folder === "utilities") {
        const um = ln.match(/^\.([\w-]+)\s*(,|\{|:)/);
        if (um) utilities.push({ selector: "." + um[1], file: r });
      }
    });

    // tokens (abstracts/_tokens.scss only)
    if (base === "_tokens.scss") {
      lines.forEach((ln, i) => {
        const tm = ln.match(/^\$([\w-]+):\s*(.+?)\s*(!default)?\s*;/);
        if (tm) tokens.push({ name: "$" + tm[1], value: tm[2].trim(), file: r, line: i + 1 });
      });
    }

    // spacing map (abstracts only — utilities/_spacing.scss has no map)
    if (base === "_spacing.scss" && folder === "abstracts") {
      const block = src.match(/\$spacing-values:\s*\(([\s\S]*?)\)\s*;/);
      if (block) {
        for (const pair of block[1].split(",")) {
          const m = pair.match(/^\s*([\w-]+)\s*:\s*([^,]+?)\s*$/);
          if (m) spacing[m[1]] = m[2].trim();
        }
      } else warnings.push("Could not parse $spacing-values map in " + r);
    }

    // breakpoints map
    if (base === "_config.breakpoints.scss") {
      const block = src.match(/\$breakpoints:\s*\(([\s\S]*?)\)\s*(!default)?\s*;/);
      if (block) {
        for (const pair of block[1].split(",")) {
          const m = pair.match(/^\s*["']?([\w-]+)["']?\s*:\s*([^,]+?)\s*$/);
          if (m) breakpoints[m[1]] = m[2].trim();
        }
      } else warnings.push("Could not parse $breakpoints map in " + r);
    }
  }

  // Dedup utilities (a class may appear in multiple selector groups)
  const seen = new Set();
  const utils = utilities.filter((u) => {
    const k = u.selector + "|" + u.file;
    if (seen.has(k)) return false; seen.add(k); return true;
  });

  // Standalone SCSS preamble for the playground: concatenate real partial
  // bodies, stripping inter-file @use/@forward (everything is inlined).
  const preambleFiles = [
    "abstracts/_tokens.scss",
    "abstracts/_spacing.scss",
    "abstracts/_config.breakpoints.scss",
    "abstracts/_typography.scss",
    "abstracts/_mixins.scss",
    "components/_form-controls.scss"
  ];
  // Strip ALL @use/@forward from each body, but collect built-in `sass:` loads
  // so we can hoist them to the very top (Sass requires @use before other rules).
  const sassUses = new Set();
  const stripAllUses = (txt) => txt.split("\n").filter((ln) => {
    const u = ln.match(/^\s*@(use|forward)\s+["']([^"']+)["']\s*;?/);
    if (!u) return true;
    if (u[2].startsWith("sass:")) sassUses.add('@use "' + u[2] + '";');
    return false; // drop every @use/@forward from the body
  }).join("\n");
  let bodies = "";
  for (const pf of preambleFiles) {
    const full = path.join(STYLES, pf);
    if (fs.existsSync(full)) bodies += "// ===== " + pf + " =====\n" + stripAllUses(read(full)) + "\n";
    else warnings.push("Preamble source missing: " + pf);
  }
  const preamble = [...sassUses].join("\n") + "\n" + bodies;

  let sassVersion = "unknown";
  try { sassVersion = require(path.join(ROOT, "node_modules", "sass", "package.json")).version; } catch (_e) {}

  return {
    generatedFrom: "styles/",
    note: "AUTO-GENERATED by scripts/build-guide-data.js. Do not edit by hand. Run `npm run guide:build`.",
    sass: { version: sassVersion },
    counts: { mixins: mixins.length, functions: functions.length, tokens: tokens.length, utilities: utils.length },
    mixins, functions, tokens,
    spacing, breakpoints,
    utilities: utils,
    useGraph,
    preamble,
    warnings
  };
}

function logicToClassic() {
  let src = read(LOGIC);
  // strip the default-export line and convert named `export` to plain decls
  src = src.replace(/^export default[\s\S]*?;\s*$/m, "");
  src = src.replace(/^export\s+(const|function|class)\s/gm, "$1 ");
  return "window.__guideLogic = (function(){\n" + src +
    "\nreturn { DAY_MS, LEVELS, levelInfo, XP_BY_TYPE, xpForType, srsNext, isDue, branchScore, bossUnlocked, bossPassed, speedReaderQualifies, normalizeCss, badgePredicates, mulberry32, seedFromDate, shuffleSeeded, pickN, TIERS, tierConfig, starsForTier };\n})();";
}

function replaceBlock(html, startMarker, endMarker, inner) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker);
  if (s === -1 || e === -1 || e < s) {
    throw new Error("Markers not found in HTML: " + startMarker + " / " + endMarker +
      ". Add them once before running the build.");
  }
  return html.slice(0, s + startMarker.length) + "\n" + inner + "\n" + html.slice(e);
}

function buildHtml(html, data) {
  const island = '<script type="application/json" id="guide-data">' +
    JSON.stringify(data) + "</script>";
  const logic = "<script>" + logicToClassic() + "</script>";
  html = replaceBlock(html, "<!--GUIDE_DATA_START-->", "<!--GUIDE_DATA_END-->", island);
  html = replaceBlock(html, "<!--GUIDE_LOGIC_START-->", "<!--GUIDE_LOGIC_END-->", logic);
  return html;
}

function currentIslandData(html) {
  const m = html.match(/<script type="application\/json" id="guide-data">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (_e) { return null; }
}

function summarize(oldData, data) {
  const names = (arr) => new Set((arr || []).map((x) => x.name || x.selector));
  const diff = (a, b) => [...b].filter((x) => !a.has(x));
  const out = [];
  if (oldData) {
    const om = names(oldData.mixins), nm = names(data.mixins);
    const ot = names(oldData.tokens), nt = names(data.tokens);
    const ou = names(oldData.utilities), nu = names(data.utilities);
    const add = (label, arr) => { if (arr.length) out.push("  + " + label + ": " + arr.join(", ")); };
    const rem = (label, arr) => { if (arr.length) out.push("  - " + label + ": " + arr.join(", ")); };
    add("mixins added", diff(om, nm)); rem("mixins removed", diff(nm, om));
    add("tokens added", diff(ot, nt)); rem("tokens removed", diff(nt, ot));
    add("utilities added", diff(ou, nu)); rem("utilities removed", diff(nu, ou));
  }
  return out;
}

function main() {
  const verify = process.argv.includes("--verify");
  const data = extract();
  const html = read(HTML);
  const oldData = currentIslandData(html);

  if (verify) {
    const rebuilt = buildHtml(html, data);
    if (rebuilt === html) {
      console.log("guide:verify — OK. Data island is in sync with styles/.");
      process.exit(0);
    }
    console.error("guide:verify — STALE. The embedded data does not match styles/.");
    summarize(oldData, data).forEach((l) => console.error(l));
    console.error("Run `npm run guide:build` and commit the result.");
    process.exit(1);
  }

  const rebuilt = buildHtml(html, data);
  fs.writeFileSync(HTML, rebuilt);
  console.log("guide:build — wrote data island + logic into " + rel(HTML));
  console.log("  mixins: %d  functions: %d  tokens: %d  utilities: %d  sass: %s",
    data.counts.mixins, data.counts.functions, data.counts.tokens, data.counts.utilities, data.sass.version);
  const sum = summarize(oldData, data);
  if (sum.length) { console.log("  changes vs previous island:"); sum.forEach((l) => console.log(l)); }
  if (data.warnings.length) { console.log("  warnings:"); data.warnings.forEach((w) => console.log("  ! " + w)); }

  // Build-time sanity check: the preamble must compile with real dart-sass.
  try {
    const sass = require(path.join(ROOT, "node_modules", "sass"));
    const css = sass.compileString(data.preamble + "\n.__pg{ @include stack(spacing(16)); }").css;
    if (!/display:\s*flex/.test(css)) console.log("  ! preamble compiled but output unexpected");
    else console.log("  preamble compiles with dart-sass ✓");
  } catch (e) {
    console.log("  ! preamble failed to compile: " + (e && e.message ? e.message.split("\n")[0] : e));
    process.exitCode = 2;
  }
}

main();
