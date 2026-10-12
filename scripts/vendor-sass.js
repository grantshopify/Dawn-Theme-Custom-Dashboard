#!/usr/bin/env node
/*
 * vendor-sass.js — regenerate docs/vendor/sass.js (the offline in-browser
 * SCSS compiler used by the playground).
 *
 * The bundle is three concatenated CLASSIC scripts (no ESM, no fetch, no
 * Worker, no WASM) so it loads from file:// with no CORS issues:
 *   1) immutable (UMD)            -> global Immutable
 *   2) dart-sass sass.dart.js     -> pushes globalThis._cliPkgExports
 *   3) glue                       -> window.dartSass = { compileString, ... }
 *
 * Run: npm run guide:vendor   (also runs automatically on `npm install`)
 *
 * Safe as a postinstall hook: if sass/immutable aren't present (e.g.
 * `npm install --omit=dev`), it skips with a notice and exits 0 instead of
 * failing the install. The playground then shows its "simulated" fallback.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "vendor", "sass.js");
const immutable = path.join(ROOT, "node_modules", "immutable", "dist", "immutable.min.js");
const dartSass = path.join(ROOT, "node_modules", "sass", "sass.dart.js");

if (!fs.existsSync(immutable) || !fs.existsSync(dartSass)) {
  console.log("vendor:sass — skipped (sass/immutable not installed). " +
    "Run `npm install` then `npm run guide:vendor` to enable the real compiler.");
  process.exit(0);
}

const sassVer = require(path.join(ROOT, "node_modules", "sass", "package.json")).version;
const immVer = require(path.join(ROOT, "node_modules", "immutable", "package.json")).version;

const header = `/* Vendored offline SCSS compiler for the SCSS Handbook playground.
   Regenerate with: npm run guide:vendor
   Concatenated CLASSIC scripts (no ESM / fetch / Worker / WASM) so they load from file://:
     1) immutable ${immVer}  (node_modules/immutable/dist/immutable.min.js) -> global Immutable
     2) dart-sass ${sassVer}  (node_modules/sass/sass.dart.js) -> globalThis._cliPkgExports
     3) glue -> window.dartSass = { compileString, ... } */
(function(){ if (typeof globalThis._cliPkgExports === "undefined") globalThis._cliPkgExports = []; })();
`;

const glue = `
;(function(){
  try {
    var lib = globalThis._cliPkgExports.pop();
    if (globalThis._cliPkgExports && globalThis._cliPkgExports.length === 0) { try { delete globalThis._cliPkgExports; } catch (e) {} }
    var ex = {};
    lib.load({ immutable: globalThis.Immutable }, ex);
    globalThis.dartSass = ex;
  } catch (err) { globalThis.dartSassError = String(err && err.stack || err); }
})();
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const bundle = header + fs.readFileSync(immutable, "utf8") + "\n;\n" +
  fs.readFileSync(dartSass, "utf8") + "\n" + glue;
fs.writeFileSync(OUT, bundle);
console.log("vendor:sass — wrote docs/vendor/sass.js (%d bytes) — dart-sass %s, immutable %s",
  bundle.length, sassVer, immVer);
