// guide-logic.mjs
// SINGLE SOURCE OF TRUTH for the handbook's pure, testable logic.
// - Imported directly by scripts/guide.test.mjs (node:test).
// - Injected into docs/scss-system-guide.html (as window.__guideLogic) by
//   scripts/build-guide-data.js, so the runtime and the tests never diverge.
// Keep this file free of DOM/browser APIs — pure functions only.

export const DAY_MS = 86400000;

export const LEVELS = [
  { name: "Reader", min: 0 },
  { name: "Selector Apprentice", min: 200 },
  { name: "Mixin Wielder", min: 500 },
  { name: "Token Smith", min: 1000 },
  { name: "Cascade Master", min: 2000 },
  { name: "Architecture Sage", min: 3500 }
];

// xp -> level info (number, name, % to next, thresholds)
export function levelInfo(xp) {
  const x = Math.max(0, Number(xp) || 0);
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i += 1) if (x >= LEVELS[i].min) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  const floor = cur.min;
  const ceil = next ? next.min : cur.min;
  const pct = next ? Math.round(((x - floor) / (ceil - floor)) * 100) : 100;
  return { idx, num: idx + 1, name: cur.name, next, floor, ceil, pct };
}

export const XP_BY_TYPE = {
  choice: 10, confidence: 10, checklist: 10,
  fill: 20, multi: 20, reveal: 20,
  match: 30, order: 30,
  capstone: 50, branch: 50, playground: 50,
  freeform: 50, review: 15, boss: 100
};
export function xpForType(type) {
  return Object.prototype.hasOwnProperty.call(XP_BY_TYPE, type) ? XP_BY_TYPE[type] : 10;
}

// SM-2-lite: on correct, interval doubles; on wrong, resets to 1 day.
// Returns the next record {interval, due}. `now` is a ms timestamp.
export function srsNext(rec, correct, now, dayMs = DAY_MS) {
  const prev = (rec && rec.interval) || 1;
  const interval = correct ? prev * 2 : 1;
  return { interval, due: now + interval * dayMs };
}

// A review/boss card is "due" when its scheduled time has passed.
export function isDue(rec, now) {
  return !!(rec && typeof rec.due === "number" && rec.due <= now);
}

// Branch incident scoring. `choices` is an array of {good:boolean}.
export function branchScore(choices) {
  const list = Array.isArray(choices) ? choices : [];
  const wrongTurns = list.filter((c) => c && !c.good).length;
  return { steps: list.length, wrongTurns, clean: list.length > 0 && wrongTurns === 0 };
}

// Boss exam unlocks at Level 4 (Token Smith, 1000 XP).
export function bossUnlocked(xp) {
  return levelInfo(xp).num >= 4;
}

// Passing the boss: >= 90%.
export function bossPassed(score, total) {
  if (!total) return false;
  return (score / total) >= 0.9;
}

// Speed Reader: a section finished in (0, 180) seconds.
export function speedReaderQualifies(elapsedSeconds) {
  return elapsedSeconds > 0 && elapsedSeconds < 180;
}

// Normalize compiled CSS so free-form answers can be graded
// independent of whitespace, comments, and declaration order.
export function normalizeCss(css) {
  if (!css) return "";
  let s = String(css).replace(/\/\*[\s\S]*?\*\//g, " "); // strip block comments
  s = s.replace(/\/\/[^\n]*/g, " "); // strip line comments
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  let matchedAny = false;
  while ((m = re.exec(s)) !== null) {
    matchedAny = true;
    const selector = m[1].replace(/\s+/g, " ").trim();
    const decls = m[2]
      .split(";")
      .map((d) => d.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .map((d) => d.replace(/\s*:\s*/, ":"))
      .sort();
    rules.push(selector + "{" + decls.join(";") + "}");
  }
  if (!matchedAny) return s.replace(/\s+/g, " ").trim();
  return rules.sort().join("");
}

// Badge predicates that are pure (id-set / count based).
export const badgePredicates = {
  bugHunter: (completedIds) => ["lab-c1", "lab-c2", "lab-c3", "lab-c4", "lab-c5"]
    .every((id) => completedIds.includes(id)),
  polyglot: (widgetTypesSeen) => ["choice", "fill", "multi", "match", "order", "confidence"]
    .every((t) => widgetTypesSeen.includes(t)),
  bossSlayer: (passesInARow) => passesInARow >= 2
};

/* ===================================================================
   SCSS Quest — deterministic RNG + sampling + difficulty (pure logic)
   Used by the runtime generators AND covered by unit tests so the
   "deepen content" features stay correct and the daily run is stable.
   =================================================================== */

// mulberry32 — tiny deterministic PRNG. Returns a function -> [0,1).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable 32-bit seed from a "YYYY-M-D" string (no Date needed at call time).
export function seedFromDate(dateStr) {
  let h = 2166136261 >>> 0;
  const s = String(dateStr);
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Fisher–Yates using an injected rng() -> [0,1). Returns a new array.
export function shuffleSeeded(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// Pick n distinct items from arr using rng (n clamped to arr length).
export function pickN(arr, n, rng) {
  return shuffleSeeded(arr, rng).slice(0, Math.max(0, Math.min(n, arr.length)));
}

// Difficulty tiers: knobs the zones read. Keep names stable.
export const TIERS = {
  easy: { label: "Easy", options: 2, arenaTime: 60, arenaTarget: 5, rounds: 3, starBonus: 0 },
  standard: { label: "Standard", options: 3, arenaTime: 40, arenaTarget: 6, rounds: 4, starBonus: 0 },
  hard: { label: "Hard", options: 4, arenaTime: 28, arenaTarget: 8, rounds: 6, starBonus: 1 }
};
export function tierConfig(tier) {
  return TIERS[tier] || TIERS.standard;
}

// Stars by mistakes, nudged by tier (hard is more forgiving by +starBonus,
// capped at 3). 0 wrong = 3 stars; <=2 = 2; else 1.
export function starsForTier(wrongs, tier) {
  const base = wrongs === 0 ? 3 : (wrongs <= 2 ? 2 : 1);
  const cfg = tierConfig(tier);
  return Math.max(1, Math.min(3, base + (wrongs > 0 ? cfg.starBonus : 0)));
}

const API = {
  DAY_MS, LEVELS, levelInfo, XP_BY_TYPE, xpForType, srsNext, isDue,
  branchScore, bossUnlocked, bossPassed, speedReaderQualifies, normalizeCss, badgePredicates,
  mulberry32, seedFromDate, shuffleSeeded, pickN, TIERS, tierConfig, starsForTier
};
export default API;
