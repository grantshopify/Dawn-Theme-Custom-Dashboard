# Claude Handoff: Shopify Theme SCSS Refactor

## Project Context

This is a standard Shopify Liquid theme project, not headless Shopify, Hydrogen, React, Next.js, or Tailwind.

Primary goal: improve the SCSS structure safely without changing storefront design, breaking Liquid templates, or renaming existing classes.

Important constraints:

- Preserve Shopify theme compatibility.
- Do not introduce a new styling framework.
- Do not rename Liquid classes unless markup and styles are updated together.
- Keep `styles/main.scss` as a load-order file only.
- Use SCSS `@use` and `@forward`.
- Avoid visual changes unless explicitly requested.

## Current SCSS Structure

```text
styles/
  main.scss
  abstracts/
  base/
  components/
  layout/
  sections/
  templates/
  utilities/
```

`styles/main.scss` currently contains only:

```scss
@charset 'UTF-8';

@use 'abstracts' as *;
@use 'base';
@use 'layout';
@use 'components';
@use 'sections';
@use 'templates';
@use 'utilities';
```

## Completed Work

- Moved emitted CSS out of `abstracts/`.
- Replaced old `layouts/` and `pages/` structure with `layout/`, `sections/`, and `templates/`.
- Removed empty, dormant, or comment-only partials from the compiled graph.
- Split utility classes into `utilities/`.
- Added docs:
  - `docs/style-guide.md`
  - `docs/scss-audit.md`
- Added package scripts:
  - `npm run build:css`
  - `npm run build:js`
- Added `components/_product-form.scss` with reusable mixins:
  - `body-text`
  - `cart-button`
- Tokenized repeated values inside `sections/_main-product.scss`.
- Flattened safe nested selector areas in `sections/_main-product.scss`:
  - breadcrumbs
  - price/rating block
  - variants block
- Added selector-free abstract APIs:
  - `styles/abstracts/_tokens.scss`
  - `styles/abstracts/_mixins.scss`
- Cleaned breakpoint helpers and added:
  - `breakpoint($key)`
  - `@include between($min-breakpoint, $max-breakpoint)`

## Active SCSS Classification

- `abstracts/`: Sass tools, tokens, functions, breakpoint helpers, and selector-free mixins only.
- `base/`: currently an empty load point for future base styles.
- `components/`: reusable button CSS and product form mixin APIs.
- `layout/`: header and footer.
- `sections/`: main product, featured product, main list collections.
- `templates/`: cart template styles.
- `utilities/`: small helper classes for color, text, spacing, flex, and visibility.

## Validation Status

Last validation:

```bash
npm run build:css
npm run build:js
```

Both passed.

Known warnings:

- Dart Sass legacy JS API warning from the current `gulp-sass` pipeline.
- Node `fs.Stats` deprecation warning from current tooling.

No lint/check script currently exists in `package.json`.

## Important Notes

- `assets/main.css`, `assets/main.min.css`, and `assets/main.css.map` are generated theme assets and have been regenerated.
- `assets/main.min.js` may show as modified after running `npm run build:js`, but previous checks showed no content diff, likely line-ending metadata.
- The numeric `$spacing-values` map is intentionally preserved because active styles rely on exact pixel keys.
- The latest product-form extraction was verified against the previous `assets/main.css`; there were no compiled CSS output differences.
- The latest abstracts upgrade was verified against the previous `assets/main.css`; there were no compiled CSS output differences.
- `abstracts/` must remain selector-free. The only selector-looking code currently in abstracts is inside the optional `generate-spacing-utilities` mixin, which does not emit CSS unless explicitly included.

## Current Abstract APIs

`styles/abstracts/_index.scss` forwards:

```scss
@forward '_config.variables';
@forward '_config.breakpoints';
@forward '_config.font-variables';
@forward '_tools.color-palette';
@forward 'tokens';
@forward 'mixins';
```

Available value helpers:

```scss
spacing(16);
theme-color("light-black");
breakpoint("xs");
```

Available responsive helpers:

```scss
@include max-width("xs") { ... }
@include min-width("md") { ... }
@include between("xl", "lg") { ... }
```

Available typography helper:

```scss
@include type-style("button");
@include type-style("small-text");
```

Available layout/declaration helpers:

```scss
@include transition(color, background-color);
@include inline-center;
@include flex-center;
@include absolute-fill;
@include control-size($control-height-product, $radius-control);
```

Shared tokens currently include:

```scss
$transition-duration-fast;
$transition-duration-base;
$transition-ease-base;
$transition-ease-smooth;
$radius-control;
$radius-pill;
$control-height-product;
```

Use these APIs gradually. Do not replace values just to use a mixin; replace only repeated declarations where the compiled CSS stays equivalent.

## Recommended Next Steps

Continue in small, reviewable batches. The next phase should move from folder cleanup into stronger Sass ergonomics while preserving the storefront output.

### Batch 0: Abstracts Follow-Up

Focus: improve `styles/abstracts` without touching emitted CSS.

Recommended work:

- Rename or split legacy abstract files only if all forwards/imports are updated safely.
- Consider moving spacing APIs from `_config.variables.scss` to a future `_spacing.scss`, but keep backwards compatibility through `abstracts/_index.scss`.
- Consider moving typography APIs from `_config.font-variables.scss` to a future `_typography.scss`, but only if compiled output remains unchanged.
- Consider making color token naming more consistent, but do not remove existing keys like `"light-black"` or `"qi-bg"` because active styles use them.
- Keep `$spacing-values` numeric map intact until all exact pixel dependencies are audited.

Acceptance criteria:

- `npm run build:css` passes.
- Generated `assets/main.css` has no output diff for source-only refactors.
- `abstracts/` still emits no CSS selectors by default.
- Existing public APIs still work:
  - `spacing(...)`
  - `theme-color(...)`
  - `type-style(...)`
  - `max-width(...)`
  - `min-width(...)`

### Batch 1: Finish Main Product Nesting Cleanup

Target file: `styles/sections/_main-product.scss`.

Flatten one block per batch and compare generated CSS after each change:

- quantity selector
- product form buttons
- promo and payment option text
- accordion meta
- size guide
- media wrapper
- info wrapper responsive rules

Goal: make selectors explicit and shallow without changing selector specificity or generated CSS.

Acceptance criteria:

- One block changed per batch.
- No Liquid class names renamed.
- `npm run build:css` passes.
- `assets/main.css` comparison is empty.

### Batch 2: Add Product Component APIs

Create mixin-only component partials when they improve reuse without moving emitted CSS order:

```text
styles/components/_product-price.scss
styles/components/_product-rating.scss
styles/components/_product-variants.scss
styles/components/_quantity.scss
```

Recommended mixins:

```scss
@mixin price-regular-item { ... }
@mixin price-sale-item { ... }
@mixin rating-summary { ... }
@mixin variant-option-label { ... }
@mixin quantity-control { ... }
@mixin quantity-button { ... }
@mixin quantity-input { ... }
```

Use these mixins from `sections/_main-product.scss` first. Do not move emitted selectors into component files unless CSS order and cascade are verified.

Acceptance criteria:

- New component files expose mixins first.
- Section still owns the emitted selector order unless cascade is deliberately verified.
- `components/_index.scss` forwards the new component API.
- Generated CSS remains equivalent unless a visual change is explicitly requested.

### Batch 3: Use Useful Abstract Shortcuts

The shared abstract shortcut files now exist. Use them only when they remove repeated real code. Avoid building a large framework.

Good candidates:

```scss
@mixin transition($properties...) {
  transition-property: $properties;
  transition-duration: $transition-duration-base;
  transition-timing-function: $transition-ease-base;
}

@mixin control-size($height, $radius: null) {
  min-height: $height;

  @if $radius != null {
    border-radius: $radius;
  }
}

@mixin inline-center {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@mixin absolute-fill {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
```

Current files:

```text
styles/abstracts/_mixins.scss
styles/abstracts/_tokens.scss
```

They are already forwarded from `styles/abstracts/_index.scss`.

Good first usage targets:

- Replace repeated `display: flex; align-items: center; justify-content: center;` with `@include flex-center`.
- Replace repeated `display: inline-flex; align-items: center; justify-content: center;` with `@include inline-center`.
- Replace repeated absolute fill declarations with `@include absolute-fill`.
- Replace repeated transition property/duration/timing groups with `@include transition(...)`.

Do not use shortcuts where shorthand would change generated CSS ordering or reset subproperties.

### Batch 4: Token Aliases, Not Full Redesign

Keep exact existing values, but give repeated values clear names.

Examples:

```scss
$transition-duration-base: 0.3s;
$transition-duration-fast: 0.2s;
$transition-ease-base: ease;
$radius-control: 8px;
$height-product-control: 62px;
```

Move values from local section tokens into abstracts only when they are reused across multiple files. Product-only values can remain local to `sections/_main-product.scss`.

Upgrade path:

1. Keep section-local tokens while values are used by only one section.
2. Promote to `abstracts/_tokens.scss` after the same semantic value appears in multiple folders.
3. Keep old token names for compatibility when promoting.
4. Replace usage in small batches with CSS comparison checks.

### Batch 5: Base Styles Only If Real Defaults Exist

Do not add empty placeholder partials. Add base files only if there are true global defaults to move:

```text
styles/base/_forms.scss
styles/base/_typography.scss
styles/base/_global.scss
```

Examples of valid base styles:

- `html`, `body`
- default `a`
- default `img`, `picture`, `svg`
- default form controls used globally

Do not move section-specific product form styling into base.

### Batch 6: Utility Audit

Review utilities for duplicate or unclear names. Keep existing classes for compatibility.

Safe improvements:

- document utility intent
- remove only confirmed unused/comment-only utility generation
- add future-facing aliases only if needed by new Liquid or SCSS

Avoid generating hundreds of utility classes.

### Batch 7: Build Pipeline Modernization

Handle separately from SCSS source refactors.

Goal: remove Sass legacy JS API warning if possible.

Current gulp file already uses `sass-embedded` through `gulp-sass`, but `gulp-sass` may still trigger the legacy API warning internally. Replacing it could affect sourcemaps and generated CSS, so treat this as a separate high-care task.

Validation must include:

```bash
npm run build:css
npm run build:js
```

Compare generated assets before and after. Do not mix this task with visual or SCSS selector changes.

## Suggested Immediate Next Batches

Recommended order from here:

1. Abstracts follow-up documentation and naming audit.
2. Quantity selector nesting cleanup in `sections/_main-product.scss`.
3. Add `components/_quantity.scss` with mixins, then include those mixins from the main product section.
4. Use `@include inline-center` or `@include flex-center` in one low-risk block and confirm generated CSS diff.
5. Product form buttons cleanup.
6. Add product button/form mixin refinements if repeated declaration groups remain.
7. Build pipeline modernization only after SCSS source work is stable.

## Do Not Do

- Do not add Tailwind, Bootstrap, Hydrogen, React, or Next.js.
- Do not move section selectors into component files unless cascade order is verified.
- Do not delete spacing keys from `$spacing-values`.
- Do not remove existing color keys from the theme color map.
- Do not generate a large utility class framework.
- Do not convert Liquid class names to new BEM names without updating Liquid and verifying templates.
- Do not combine build-pipeline changes with selector refactors.

## Next-Level Sass Rules

- Prefer mixins for repeated declaration groups.
- Prefer functions for value lookup or transformation.
- Prefer maps only when there are multiple related values.
- Prefer local section tokens for section-only values.
- Promote tokens to `abstracts/` only after reuse is proven.
- Keep `abstracts/` free of emitted CSS selectors.
- Keep `main.scss` as load order only.
- Keep CSS output comparisons for source-only refactors.
- Do not add a utility framework, Tailwind-like class generation, or unused placeholder partials.

## Safe Working Pattern

Before refactoring:

```bash
Copy-Item assets/main.css .tmp-main-before.css
```

After refactoring:

```bash
npm run build:css
Compare-Object (Get-Content .tmp-main-before.css) (Get-Content assets/main.css)
```

If the goal is source-only cleanup, the comparison should be empty.
