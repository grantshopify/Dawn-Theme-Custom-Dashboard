// guide.test.mjs — unit tests for the handbook's pure logic.
// Run: npm run guide:test   (node --test, no external deps)
import { test } from "node:test";
import assert from "node:assert/strict";
import L from "./guide-logic.mjs";

test("levelInfo: thresholds and names", () => {
  assert.equal(L.levelInfo(0).name, "Reader");
  assert.equal(L.levelInfo(0).num, 1);
  assert.equal(L.levelInfo(199).name, "Reader");
  assert.equal(L.levelInfo(200).name, "Selector Apprentice");
  assert.equal(L.levelInfo(500).name, "Mixin Wielder");
  assert.equal(L.levelInfo(1000).name, "Token Smith");
  assert.equal(L.levelInfo(1000).num, 4);
  assert.equal(L.levelInfo(2000).name, "Cascade Master");
  assert.equal(L.levelInfo(3500).name, "Architecture Sage");
  assert.equal(L.levelInfo(999999).name, "Architecture Sage");
});

test("levelInfo: percentage to next level", () => {
  assert.equal(L.levelInfo(0).pct, 0);
  assert.equal(L.levelInfo(100).pct, 50); // halfway from 0 to 200
  assert.equal(L.levelInfo(200).pct, 0);  // just hit lvl 2
  assert.equal(L.levelInfo(3500).pct, 100); // max level
});

test("levelInfo: clamps junk input", () => {
  assert.equal(L.levelInfo(-50).num, 1);
  assert.equal(L.levelInfo(undefined).num, 1);
  assert.equal(L.levelInfo("nope").num, 1);
});

test("xpForType: per-widget economy", () => {
  assert.equal(L.xpForType("choice"), 10);
  assert.equal(L.xpForType("confidence"), 10);
  assert.equal(L.xpForType("fill"), 20);
  assert.equal(L.xpForType("multi"), 20);
  assert.equal(L.xpForType("reveal"), 20);
  assert.equal(L.xpForType("match"), 30);
  assert.equal(L.xpForType("order"), 30);
  assert.equal(L.xpForType("capstone"), 50);
  assert.equal(L.xpForType("branch"), 50);
  assert.equal(L.xpForType("playground"), 50);
  assert.equal(L.xpForType("freeform"), 50);
  assert.equal(L.xpForType("review"), 15);
  assert.equal(L.xpForType("boss"), 100);
  assert.equal(L.xpForType("unknown-type"), 10); // safe default
});

test("srsNext: SM-2-lite doubling and reset", () => {
  const day = L.DAY_MS;
  // fresh + correct -> interval 2, due now + 2 days
  let r = L.srsNext(undefined, true, 0);
  assert.equal(r.interval, 2);
  assert.equal(r.due, 2 * day);
  // existing interval 2 + correct -> 4
  r = L.srsNext({ interval: 2 }, true, 1000);
  assert.equal(r.interval, 4);
  assert.equal(r.due, 1000 + 4 * day);
  // wrong -> reset to 1 day
  r = L.srsNext({ interval: 16 }, false, 0);
  assert.equal(r.interval, 1);
  assert.equal(r.due, day);
});

test("isDue: past due vs future", () => {
  assert.equal(L.isDue({ due: 100 }, 200), true);
  assert.equal(L.isDue({ due: 300 }, 200), false);
  assert.equal(L.isDue(null, 200), false);
  assert.equal(L.isDue({}, 200), false);
});

test("branchScore: clean vs wrong turns", () => {
  assert.deepEqual(
    L.branchScore([{ good: true }, { good: true }, { good: true }, { good: true }]),
    { steps: 4, wrongTurns: 0, clean: true }
  );
  assert.deepEqual(
    L.branchScore([{ good: true }, { good: false }, { good: true }]),
    { steps: 3, wrongTurns: 1, clean: false }
  );
  assert.equal(L.branchScore([]).clean, false); // empty path is not a clean win
});

test("bossUnlocked / bossPassed", () => {
  assert.equal(L.bossUnlocked(999), false);
  assert.equal(L.bossUnlocked(1000), true);
  assert.equal(L.bossPassed(14, 15), true);   // 93%
  assert.equal(L.bossPassed(13, 15), false);  // 86%
  assert.equal(L.bossPassed(0, 0), false);    // no division by zero
});

test("speedReaderQualifies: open interval (0,180)", () => {
  assert.equal(L.speedReaderQualifies(179), true);
  assert.equal(L.speedReaderQualifies(180), false);
  assert.equal(L.speedReaderQualifies(0), false);
  assert.equal(L.speedReaderQualifies(-5), false);
});

test("normalizeCss: whitespace + declaration-order insensitive", () => {
  const a = ".demo { display: flex;  gap: 16px; flex-direction: column; }";
  const b = ".demo{flex-direction:column;gap:16px;display:flex}";
  assert.equal(L.normalizeCss(a), L.normalizeCss(b));
});

test("normalizeCss: distinguishes different output", () => {
  const a = ".demo { gap: 16px; }";
  const b = ".demo { gap: 24px; }";
  assert.notEqual(L.normalizeCss(a), L.normalizeCss(b));
});

test("normalizeCss: strips comments and tolerates empties", () => {
  const a = ".demo { /* note */ gap: 8px; }";
  const b = ".demo { gap: 8px; }";
  assert.equal(L.normalizeCss(a), L.normalizeCss(b));
  assert.equal(L.normalizeCss(""), "");
});

test("badgePredicates: pure id/count checks", () => {
  assert.equal(L.badgePredicates.bugHunter(["lab-c1", "lab-c2", "lab-c3", "lab-c4", "lab-c5", "x"]), true);
  assert.equal(L.badgePredicates.bugHunter(["lab-c1", "lab-c2"]), false);
  assert.equal(L.badgePredicates.polyglot(["choice", "fill", "multi", "match", "order", "confidence"]), true);
  assert.equal(L.badgePredicates.polyglot(["choice", "fill"]), false);
  assert.equal(L.badgePredicates.bossSlayer(2), true);
  assert.equal(L.badgePredicates.bossSlayer(1), false);
});

test("mulberry32: deterministic and in range", () => {
  const a = L.mulberry32(123), b = L.mulberry32(123), c = L.mulberry32(456);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);                 // same seed -> same sequence
  assert.notDeepEqual(seqA, [c(), c(), c()]);   // different seed -> different
  seqA.forEach((n) => { assert.ok(n >= 0 && n < 1); });
});

test("seedFromDate: stable per date, differs across dates", () => {
  assert.equal(L.seedFromDate("2026-6-15"), L.seedFromDate("2026-6-15"));
  assert.notEqual(L.seedFromDate("2026-6-15"), L.seedFromDate("2026-6-16"));
});

test("shuffleSeeded: same seed -> same order, is a permutation", () => {
  const arr = [1, 2, 3, 4, 5, 6];
  const s1 = L.shuffleSeeded(arr, L.mulberry32(7));
  const s2 = L.shuffleSeeded(arr, L.mulberry32(7));
  assert.deepEqual(s1, s2);
  assert.deepEqual(s1.slice().sort((a, b) => a - b), arr); // same multiset
  assert.deepEqual(arr, [1, 2, 3, 4, 5, 6]);               // input not mutated
});

test("pickN: count clamped, distinct, deterministic", () => {
  const arr = ["a", "b", "c", "d"];
  assert.equal(L.pickN(arr, 2, L.mulberry32(1)).length, 2);
  assert.equal(L.pickN(arr, 99, L.mulberry32(1)).length, 4); // clamped
  assert.deepEqual(L.pickN(arr, 3, L.mulberry32(9)), L.pickN(arr, 3, L.mulberry32(9)));
});

test("tierConfig + starsForTier", () => {
  assert.equal(L.tierConfig("easy").options, 2);
  assert.equal(L.tierConfig("hard").options, 4);
  assert.equal(L.tierConfig("nope").options, 3); // falls back to standard
  assert.equal(L.starsForTier(0, "standard"), 3);
  assert.equal(L.starsForTier(1, "standard"), 2);
  assert.equal(L.starsForTier(5, "standard"), 1);
  assert.equal(L.starsForTier(5, "hard"), 2);    // hard is +1 forgiving on mistakes
  assert.equal(L.starsForTier(0, "hard"), 3);    // flawless still caps at 3
});
