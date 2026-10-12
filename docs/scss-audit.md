# SCSS Audit

This audit covers the current Shopify theme SCSS structure. The theme remains a standard Liquid Shopify theme and does not introduce React, Hydrogen, Next.js, Tailwind, or another styling framework.

## Current Structure

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

`styles/main.scss` is a load-order file only.

## Classification

- `abstracts/`: Sass tools and design tokens only. Current files provide variables, spacing helpers, breakpoint helpers, font maps, type helpers, color lookup, shared tokens, and selector-free mixins.
- `base/`: Reserved for global element defaults. There are no active custom base partials currently.
- `components/`: Reusable UI styles and component APIs. Current active component CSS is button styling, and mixin-only APIs are available for form controls, product form, price, rating, variants, and quantity patterns.
- `layout/`: Header and footer layout styles.
- `sections/`: Shopify section-specific styles for main product and featured product.
- `templates/`: Template-level styles. Current active template CSS is cart styling.
- `utilities/`: Small helper classes for color, text, spacing, flex, layout, and visibility, including accessibility and truncation helpers.

## Compatibility Notes

- Existing Liquid classes were preserved.
- Generated Shopify theme assets remain in `assets/main.css`, `assets/main.min.css`, and `assets/main.css.map`.
- The numeric spacing map was kept for backwards compatibility because active styles depend on exact spacing keys.
- Empty, comment-only, or dormant partials were removed from the compiled graph instead of kept as placeholders.
- Legacy abstract entrypoints remain as compatibility shims while spacing and typography APIs live in dedicated partials.

## Validation

- `npm run build:css`: passes.
- `npm run build:js`: passes.
- `npm run verify:css`: available for fast Sass rebuild and diff hygiene checks.

Known warnings:

- Node `fs.Stats` deprecation warning from the current tooling stack.

## Current Helper Surface

Abstract helper mixins now include:

```scss
@include transition(color, background-color);
@include transition-config((color, background-color), $transition-duration-base, $transition-ease-smooth);
@include inline-center;
@include flex-center;
@include absolute-fill;
@include inset-x(0);
@include square(spacing(24));
@include size(100%, 40px);
@include control-size($control-height-product, $radius-control);
@include container-inline(64rem, spacing(24));
@include section-space(spacing(48));
@include section-inline-padding(spacing(32));
@include visually-hidden;
@include visually-hidden-focusable;
@include text-truncate;
@include line-clamp(2);
@include focus-ring;
@include focus-ring-visible;
@include interactive-color(theme-color("light-black"), theme-color("grey"));
@include stack(spacing(16));
@include cluster(spacing(12));
@include card-surface(theme-color("light-grey"), $radius-md, spacing(16));
```

Component mixin APIs now include:

```scss
@include form-controls.control-surface(...);
@include form-controls.control-min-height(...);
@include form-controls.control-inline-size(...);
@include form-controls.control-frame(...);
@include form-controls.control-padding-x(...);
@include form-controls.control-padding-y(...);
@include form-controls.control-padding(...);
@include form-controls.control-disabled;
@include form-controls.control-opacity(...);
@include form-controls.control-focus-reset;
@include text-primitives.mulish-body(...);
@include text-primitives.hubot-text(...);
@include text-primitives.nunito-heading(...);
@include product-form.cart-button;
@include product-price.regular-item;
@include product-price.sale-item(...);
@include product-rating.summary(...);
@include product-rating.count;
@include product-variants.option-label(...);
@include quantity.control(...);
@include quantity.button(...);
@include quantity.input(...);
```

Abstract accessor helpers now also include:

```scss
spacing-value(16);
has-spacing(24);
font-size(14);
line-height(lh_3);
font-weight(semi-bold);
type-values("button");
type-size("button", desktop);
type-line-height("button");
breakpoint("sm");
```

Small utility helpers now include:

```text
.truncate
.line-clamp-2
.line-clamp-3
.focus-ring
.sr-only
.sr-only-focusable
.stack-8
.stack-12
.stack-16
.stack-24
.cluster-8
.cluster-12
.cluster-16
.cluster-24
.container-sm
.container-md
.container-lg
.section-x-16
.section-x-24
.section-x-32
.section-y-32
.section-y-48
.section-y-64
.absolute-fill
.inline-center
.flex-center
.square-16
.square-20
.square-24
```

## Current Focus

- Abstracts now cover both component-level and layout-level helper primitives.
- Layout utilities remain intentionally small; they are meant for direct Liquid use, not as a generated framework.
- Existing layout, section, and component files have started adopting the new helper layer so the APIs are not purely theoretical.
- The next useful work is broader adoption in real section/snippet CSS, not adding many more helper types.
