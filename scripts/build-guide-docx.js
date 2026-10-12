#!/usr/bin/env node
/*
 * build-guide-docx.js — regenerate docs/scss-system-guide.docx from the
 * SAME source of truth as the HTML guide:
 *   - section list/summaries: parsed from docs/scss-system-guide.html
 *   - mixin/function/token/utility/spacing/breakpoint reference: the
 *     #guide-data island (generated from styles/ by build-guide-data.js)
 *
 * So the Word file stays in sync with styles/ — rebuild any time with:
 *   npm run guide:docx        (after npm run guide:build)
 *
 * The .docx is the printable / offline READ. All interactivity (playground,
 * SCSS Quest, quizzes, XP) lives ONLY in the HTML; the doc says so.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const HTML = path.join(ROOT, "docs", "scss-system-guide.html");
const OUT = path.join(ROOT, "docs", "scss-system-guide.docx");

const html = fs.readFileSync(HTML, "utf8");

// ---- pull the data island (source of truth for SCSS facts) ----
const islandMatch = html.match(/<script type="application\/json" id="guide-data">([\s\S]*?)<\/script>/);
if (!islandMatch) { console.error("guide:docx — no #guide-data island found. Run `npm run guide:build` first."); process.exit(1); }
const data = JSON.parse(islandMatch[1]);

// ---- parse lesson sections (id, title, first-paragraph summary) ----
const stripTags = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x[0-9a-fA-F]+;/g, "").replace(/\s+/g, " ").trim();
const sections = [];
const secRe = /<section class="lesson"[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g;
let sm;
while ((sm = secRe.exec(html)) !== null) {
  const id = sm[1];
  const inner = sm[2];
  const h2 = inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (!h2) continue;
  const title = stripTags(h2[1]);
  const p = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  let summary = p ? stripTags(p[1]) : "";
  if (summary.length > 320) summary = summary.slice(0, 317) + "…";
  sections.push({ id, title, summary });
}

const FONT = "Arial", MONO = "Consolas";
const border = { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function P(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, ...opts.p,
    children: [new TextRun({ text, font: FONT, ...opts.run })] });
}
function H(text, level) {
  return new Paragraph({ heading: { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 }[level],
    spacing: { before: 240, after: 140 }, children: [new TextRun({ text, font: FONT, bold: true })] });
}
function tbl(headers, rows, widths) {
  const total = 9360;
  const cw = widths || headers.map(() => Math.floor(total / headers.length));
  cw[cw.length - 1] = total - cw.slice(0, -1).reduce((a, b) => a + b, 0);
  const mkCell = (txt, i, head) => new TableCell({
    borders: cellBorders, width: { size: cw[i], type: WidthType.DXA },
    shading: head ? { type: ShadingType.CLEAR, fill: "F1F5F9" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: String(txt), font: head ? FONT : MONO, bold: !!head, size: head ? 20 : 18 })] })],
  });
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: cw,
    rows: [ new TableRow({ tableHeader: true, children: headers.map((h, i) => mkCell(h, i, true)) },),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => mkCell(c, i, false)) })) ] });
}

const today = new Date().toISOString().slice(0, 10);
const kids = [];

kids.push(
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "TEMPLATE V1 — INTERNAL STYLING HANDBOOK", font: FONT, bold: true, size: 18, color: "14383D" })] }),
  H("Shopify Theme SCSS System Guide", 1),
  P(`Printable reference. Generated from styles/ on ${today} (dart-sass ${data.sass && data.sass.version || "?"}).`, { run: { italics: true, color: "5D687B" } }),
  P("This Word file is the static, offline read. The interactive version — live SCSS Playground, SCSS Quest world-map games, quizzes, XP and badges — lives ONLY in scss-system-guide.html. Open that file in a browser to play and practice.", { run: { italics: true } }),
  P(`Coverage from the live data island: ${data.counts.mixins} mixins · ${data.counts.functions} functions · ${data.counts.tokens} tokens · ${data.counts.utilities} utilities.`),
);

// ---- Section index ----
kids.push(H("Sections", 2));
sections.forEach((s) => {
  kids.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: s.title, font: FONT, bold: true })] }));
  if (s.summary) kids.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: s.summary, font: FONT, size: 20, color: "44515f" })] }));
});

// ---- Reference (island-driven) ----
kids.push(H("Reference — generated from styles/", 2));

kids.push(H("Mixins", 3));
kids.push(tbl(["Mixin", "Signature", "Lives in"],
  data.mixins.map((m) => [m.name, m.args, m.file.replace("styles/", "") + ":" + m.line]),
  [2200, 4000, 3160]));

kids.push(H("Functions", 3));
kids.push(tbl(["Function", "Signature", "Lives in"],
  data.functions.map((f) => [f.name, f.args, f.file.replace("styles/", "") + ":" + f.line]),
  [2200, 4000, 3160]));

kids.push(H("Tokens", 3));
kids.push(tbl(["Token", "Value"], data.tokens.map((t) => [t.name, t.value]), [4680, 4680]));

kids.push(H("Spacing scale — spacing(key)", 3));
kids.push(P("Keys → values from $spacing-values. Call as spacing(16), etc.", { run: { size: 20, color: "5D687B" } }));
kids.push(tbl(["Key", "Value", "Key", "Value"],
  (() => {
    const keys = Object.keys(data.spacing);
    const rows = [];
    for (let i = 0; i < keys.length; i += 2) rows.push([keys[i], data.spacing[keys[i]], keys[i + 1] || "", keys[i + 1] ? data.spacing[keys[i + 1]] : ""]);
    return rows;
  })(), [2340, 2340, 2340, 2340]));

kids.push(H("Breakpoints — breakpoint(key)", 3));
kids.push(tbl(["Key", "Value"], Object.keys(data.breakpoints).map((k) => [k, data.breakpoints[k]]), [4680, 4680]));

kids.push(H("Utility classes", 3));
kids.push(P("Markup-facing classes Liquid can apply directly.", { run: { size: 20, color: "5D687B" } }));
kids.push(tbl(["Class", "Defined in"], data.utilities.map((u) => [u.selector, u.file.replace("styles/", "")]), [4680, 4680]));

kids.push(H("Rebuild", 2));
kids.push(P("This document is generated. Do not hand-edit. Rebuild with: npm run guide:build && npm run guide:docx", { run: { italics: true } }));

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 34, bold: true, font: FONT, color: "14383D" }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: FONT, color: "14383D" }, paragraph: { spacing: { before: 220, after: 140 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: FONT, color: "14383D" }, paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: kids,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("guide:docx — wrote %s (%d bytes) — %d sections, %d mixins, %d tokens, %d utilities",
    path.relative(ROOT, OUT), buf.length, sections.length, data.counts.mixins, data.counts.tokens, data.counts.utilities);
});
