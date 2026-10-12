# Shopify Theme SCSS Style Guide

This theme is a standard Shopify Liquid theme. Keep styling changes compatible with Shopify theme assets and Liquid templates; do not introduce React, Hydrogen, Next.js, Tailwind, or another styling framework.

## Import Order

`styles/main.scss` is only a load-order file:

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

Do not place component, section, template, or page CSS directly in `main.scss`.

## Folder Responsibilities

- `abstracts/`: SCSS-only tools. Variables, maps, tokens, functions, mixins, breakpoints, and helper mixins belong here. Files in this folder should not output selectors unless the selector is inside a mixin that is not included by default.
- `base/`: Global element-level styling such as typography, resets, body/html defaults, default links, images, and forms.
- `layout/`: Theme layout structure such as header, footer, navigation, containers, and layout wrappers.
- `components/`: Reusable UI and snippet-related styling such as buttons, product cards, prices, badges, cart items, modals, drawers, quantity selectors, and animations.
- `sections/`: Shopify section-specific styling. Prefer one SCSS partial per section where custom section CSS is needed.
- `templates/`: Template-level styling for product, collection, cart, account, login, search, and other page contexts. Do not put section-specific styles here.
- `utilities/`: Small helper classes such as text alignment, visibility, spacing helpers, and display helpers. Avoid generating large utility frameworks.

## Current Audit Notes

- True tools: `abstracts/_config.variables.scss`, `abstracts/_config.breakpoints.scss`, `abstracts/_config.font-variables.scss`, `abstracts/_tools.color-palette.scss`, `abstracts/_tokens.scss`, and `abstracts/_mixins.scss`.
- Global/base CSS: no active custom base partials currently. Keep `base/` for future reset, global, typography, form, link, and media defaults.
- Layout CSS: `layout/_header.scss` and `layout/_footer.scss`.
- Component CSS/API: `components/_button.scss`, `components/_form-controls.scss`, `components/_text-primitives.scss`, `components/_product-form.scss`, `components/_product-price.scss`, `components/_product-rating.scss`, `components/_product-variants.scss`, and `components/_quantity.scss`.
- Section CSS: `sections/_main-product.scss` and `sections/_featured-product.scss`.
- Template CSS: `templates/_cart.scss`. Other previous template partials were removed because they only contained inactive commented code and emitted no CSS.
- Utility CSS: `utilities/_color.scss`, `utilities/_text.scss`, `utilities/_spacing.scss`, `utilities/_flex.scss`, `utilities/_layout.scss`, and `utilities/_visibility.scss`.
- Dormant section CSS was removed when it was not forwarded/imported or only contained inactive commented code.

## Current Compiled Graph

The active SCSS entrypoint forwards these partials:

```text
styles/main.scss
abstracts/
  _config.variables.scss
  _config.breakpoints.scss
  _config.font-variables.scss
  _tools.color-palette.scss
  _tokens.scss
  _mixins.scss
base/
  _index.scss
layout/
  _footer.scss
  _header.scss
components/
  _button.scss
  _form-controls.scss
  _text-primitives.scss
  _product-form.scss
  _product-price.scss
  _product-rating.scss
  _product-variants.scss
  _quantity.scss
sections/
  _main-product.scss
  _featured-product.scss
templates/
  _cart.scss
utilities/
  _color.scss
  _text.scss
  _spacing.scss
  _flex.scss
  _layout.scss
  _visibility.scss
```

Keep `_index.scss` files as the only forwarding files for each folder. Add a new partial to an index only when it emits needed CSS or exposes a Sass API that is used by compiled styles.

## Naming

Use BEM-style class names where possible:

```scss
.product-card {}
.product-card__media {}
.product-card__image {}
.product-card__title {}
.product-card__price {}
.product-card__button {}
.product-card--sold-out {}
```

Avoid vague global names such as `.box`, `.title`, `.text`, `.custom-style`, and `.image` for new work. Do not rename existing Liquid classes unless the markup and CSS can be safely updated together.

## Shopify Mapping

Prefer section-to-SCSS mapping when a section has active custom CSS:

```text
sections/main-product.liquid -> styles/sections/_main-product.scss
sections/featured-product.liquid -> styles/sections/_featured-product.scss
```

For future section CSS, create the matching partial only when there is active custom CSS to compile. `sections/main-list-collections.liquid` currently does not need a custom section partial. `sections/main-cart-items.liquid` should map to `styles/sections/_main-cart-items.scss` only if that section needs custom styles.

Prefer snippet-to-component mapping:

```text
snippets/card-product.liquid -> styles/components/_product-card.scss
snippets/price.liquid -> styles/components/_price.scss
snippets/cart-drawer.liquid -> styles/components/_drawer.scss
snippets/quantity-input.liquid -> styles/components/_quantity.scss
```

Create these files only when the project has active custom CSS for that snippet or section. Do not keep empty or comment-only partials in the compiled graph.

Reusable product form declarations can live in `components/_product-form.scss` as mixins when moving the emitted CSS would change cascade order. Include those mixins from the section that owns the current visual output.

## Abstracts

Abstract files should export only Sass values and APIs:

```scss
$radius-md: 8px;

@mixin max-width($breakpoint) {
  @media (max-width: map.get($breakpoints, $breakpoint)) {
    @content;
  }
}
```

Do not put emitted selectors in `abstracts/`:

```scss
// Avoid in abstracts/
.button--primary {
  background: $color-primary;
}
```

Move emitted selectors to `base/`, `components/`, `sections/`, `templates/`, or `utilities/`.

Current shared abstract shortcuts include:

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
@include text-truncate;
@include line-clamp(2);
@include focus-ring;
@include focus-ring-visible;
@include interactive-color(theme-color("light-black"), theme-color("grey"));
@include stack(spacing(16));
@include cluster(spacing(12));
@include card-surface(theme-color("light-grey"), $radius-md, spacing(16));
```

Use these only where they reduce repeated declarations while keeping compiled CSS equivalent.

Current reusable component form/product APIs include:

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

Preferred component primitive usage:

- Use `text-primitives.mulish-body(...)` for recurring body copy that currently repeats `Mulish Variablefont Wght`, `16px`, `400`, and `150%`.
- Use `text-primitives.hubot-text(...)` for recurring meta/label/eyebrow copy built on `Hubotsans`.
- Use `text-primitives.nunito-heading(...)` for custom product/editorial heading blocks that repeat the same family stack.
- Use `form-controls.control-inline-size(...)` and `form-controls.control-frame(...)` for button/input/select/quantity sizing before writing raw width/max-width/height groups again.

New abstract accessor APIs include:

```scss
spacing-value(16);
has-spacing(24);
font-size(14);
line-height(lh_3);
font-weight(semi-bold);
type-values("button");
type-size("button", mobile);
type-line-height("button");
breakpoint("sm");
```

New abstract convenience mixins include:

```scss
@include gap(16);
@include row-gap(24);
@include column-gap(8);
@include up("sm");
@include down("xs");
@include range("xl", "sm");
@include text-preset(14, semi-bold, lh_5);
```

Current small utility helpers include:

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

Preferred usage rules:

- Use `container-inline(...)` or the `.container-*` utilities for reusable page-width wrappers.
- Use `section-space(...)` and `section-inline-padding(...)` for section spacing before writing raw inline padding pairs again.
- Use `square(...)` for badges, icon wrappers, swatches, and count bubbles.
- Use `transition-config(...)` when duration or easing differs from the default abstract transition token.
- Use `interactive-color(...)` for simple link or text hover color states when no extra hover declarations are needed.
- Keep utility additions small and Liquid-oriented. If the helper is only useful inside one selector block, prefer a mixin instead of a new utility class.

## Workflow

Available scripts:

```text
npm run build:css
npm run build:js
npm run watch:css
npm run dev
npm run verify:css
```

`verify:css` is the quick validation path for Sass changes. It rebuilds CSS and runs `git diff --check` so whitespace and merge-marker issues fail fast.

## Base, Components, Sections, Templates, Utilities

- Base styles should target elements and global foundations.
- Components should be reusable and should not depend on one page unless the component itself is page-specific.
- Sections should target one Shopify section and use the section's Liquid class names.
- Templates should only contain page-context styling that spans multiple sections or applies to the whole template.
- Utilities should stay small, intentional, and backwards compatible.

## Spacing

The current spacing system uses numeric pixel keys through `$spacing-values` and `spacing(...)`. Keep it for backwards compatibility because active styles depend on exact values.

Preferred future scale:

```scss
$spacing: (
  0: 0,
  xs: 4px,
  sm: 8px,
  md: 16px,
  lg: 24px,
  xl: 32px,
  2xl: 48px,
  3xl: 64px
);
```

Migrate gradually. Do not replace numeric spacing values unless the compiled CSS remains visually equivalent.

## Breakpoints

Use the breakpoint mixins from `abstracts/_config.breakpoints.scss`:

```scss
@include max-width('xs') {
  display: none;
}
```

Prefer existing breakpoint keys over ad hoc media queries unless matching Shopify or existing asset behavior requires a custom value.

## Nesting

Keep nesting shallow, ideally two to three levels. Deeply nested selectors are harder to override and easier to break when Liquid markup changes.

## Shopify Section Settings

For dynamic section settings, prefer CSS variables in Liquid:

```liquid
<section
  class="image-banner section-{{ section.id }}"
  style="
    --padding-top: {{ section.settings.padding_top }}px;
    --padding-bottom: {{ section.settings.padding_bottom }}px;
  "
>
```

Then consume those variables in SCSS:

```scss
.image-banner {
  padding-top: var(--padding-top);
  padding-bottom: var(--padding-bottom);
}
```

This keeps dynamic Shopify settings in Liquid while preserving reusable SCSS structure.
