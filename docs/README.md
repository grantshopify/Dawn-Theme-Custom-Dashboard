# SCSS System Guide — docs/

An interactive, self-teaching handbook for this theme's Sass system. It's a
single HTML file a teammate opens and learns from — lessons, a live SCSS
playground, quizzes, and a game layer ("SCSS Quest"), plus XP/badges.

## Files

| File | What it is |
|------|------------|
| `scss-system-guide.html` | The guide. Single, self-contained, works offline. **This is the thing you open.** |
| `scss-system-guide.docx` | Printable/offline read. Generated — do not hand-edit. |
| `vendor/sass.js` | Vendored dart-sass (~5 MB) for the playground. **Git-ignored**, rebuilt on `npm install`. |
| `README.md` | This file. |

The facts in the guide (every mixin, function, token, utility, the spacing &
breakpoint scales) are **generated from `styles/`** into a JSON "data island"
(`<script id="guide-data">`) embedded in the HTML. The guide renders its
reference tables, playground, and dependency graph from that island, so the
docs can never silently drift from the real SCSS.

## Opening it

- **Locally:** double-click `scss-system-guide.html` (works as `file://`). The
  playground's "Enable real Sass compiler" needs `vendor/sass.js` present (run
  `npm install` once); without it, the playground falls back to a clearly
  labelled "simulated" mode — nothing breaks.
- **Hosting (optional):** serve the `docs/` folder as static files (any static
  host / `python3 -m http.server`). No backend, no build step at runtime.

## Rebuilding (after editing `styles/` or the guide)

```bash
npm install            # also rebuilds vendor/sass.js (postinstall)
npm run guide:build    # re-extract styles/ -> data island + logic in the HTML
npm run guide:docx     # regenerate the .docx from the same island
npm run guide:check    # guide:verify (no drift) + unit tests  ← run before committing
```

Other scripts: `guide:verify` (fails if the embedded island ≠ `styles/`),
`guide:test` (pure-logic unit tests), `guide:vendor` (rebuild the compiler),
`hooks:install` (opt-in pre-commit gate that runs `guide:check`).

## How the data island works

`scripts/build-guide-data.js` parses `styles/` and injects two blocks into the
HTML between markers:

- `<!--GUIDE_DATA_START-->…<!--GUIDE_DATA_END-->` — the JSON island.
- `<!--GUIDE_LOGIC_START-->…<!--GUIDE_LOGIC_END-->` — the pure logic from
  `scripts/guide-logic.mjs` (XP/levels/SRS/scoring), so the runtime and the
  unit tests share one source.

## Adding a lesson or activity (without breaking checks)

1. Add your `<section class="lesson" id="...">` in the HTML. For an interactive
   item, give it `data-activity="unique-id"` and use an existing widget pattern
   (`.choice[data-correct]`, `[data-fill]`, `[data-multi]`, `[data-match]`,
   `[data-order]`, `[data-confidence]`, or a reveal panel). XP/badges flow
   automatically via the `scss-activity-complete` event.
2. If you reference a mixin/token/utility, it's already covered by the island —
   prefer rendering from it (see the Auto Reference in §22) over hardcoding.
3. Run `npm run guide:build` (only needed if `styles/` changed), then
   `npm run guide:check`. Commit the updated HTML.

The `.docx` and `vendor/sass.js` are generated artifacts — don't edit by hand.
