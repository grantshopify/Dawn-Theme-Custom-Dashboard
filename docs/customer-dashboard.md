# Custom customer dashboard

A custom account dashboard at `/pages/dashboard` for this Dawn 15.4.1 theme.
Customers sign in with Shopify's own customer accounts, using email and a
verification code. All data is read from and written to Shopify through the
**Customer Account API**.

There is no second customer database and no server to host: it all runs in the
theme.

## How it works

```
Browser ── https://<store>/pages/dashboard   (Dawn page template, header/footer intact)
   │  assets/customer-dashboard.js — public OAuth client, PKCE, tokens in memory only
   ├──► Shopify login / token endpoints        (from /.well-known/openid-configuration)
   └──► https://<store>/customer/api/<version>/graphql   (from /.well-known/customer-account-api)
```

- **Shopify's documented browser flow.** The dashboard is a **public client**,
  which is the client type Shopify documents for browser apps. It uses the
  authorization code flow with PKCE (S256), plus `state` and `nonce`. No client
  secret exists, so there is nothing secret in the theme.
- **Reusing the Shopify login.**
  1. The header account icon sends signed-out customers to Shopify's storefront
     login: `/customer_authentication/login?return_to=/pages/dashboard`.
  2. Back on the dashboard, the script asks Shopify for a token with
     `prompt=none`. Shopify sees the existing login and answers immediately,
     with no second login screen.
  3. If Shopify answers `login_required`, the script falls back to the normal
     login.
- **Tokens are held only in JavaScript memory.** They are never stored in
  localStorage, sessionStorage, cookies or URLs. sessionStorage holds only the
  one-time PKCE, state and nonce values for the redirect round trip, and they're
  deleted as soon as the customer returns.
  - Moving between dashboard sections doesn't reload the page.
  - A full reload (or opening the page again) runs a quick, normally invisible,
    silent sign-in round trip.
  - Expired access tokens are renewed with the refresh token, also held in memory.
- **Logout.** **Log Out** ends the Shopify session through
  `end_session_endpoint` with `id_token_hint`, then lands on the storefront's
  `/account/logout`, so the storefront session ends too.
  - Pages restored from the browser's back/forward cache are reloaded, so
    account data never reappears after logout.

### Trade-off of the no-server setup

Any other script running on the page could in principle intercept the
in-memory token. That includes app and analytics scripts that Shopify adds to
every page. The token only grants access to that customer's own account, and
it's short-lived. The dashboard keeps its own reference to the browser's `fetch`
before other scripts can wrap it, and never exposes the token on `window`.

If the store moves to a custom domain, the stricter server-backed version in
[`auth-service/`](../auth-service/README.md) can replace this. It's kept in the
repository but **is not used** by the theme right now.

## Designs and switching back (blue-green)

Two complete designs are installed side by side. Both are on the same URL
(`/pages/dashboard`), use the same sign-in and the same Shopify data; only the
page template differs.

| Design | Template | Section | Assets |
|---|---|---|---|
| **Wordmark** (current) | `page.dashboard` | `sections/customer-dashboard.liquid` | `customer-dashboard.css`, `customer-dashboard.js`, `customer-dashboard-cover.jpg` |
| **Classic** (archived, Shopify-admin style) | `page.dashboard-classic` | `sections/customer-dashboard-classic.liquid` | `customer-dashboard-classic.css`, `customer-dashboard-classic.js` |

**To switch** (instant, no code change): Shopify admin → *Online Store → Pages*
→ your dashboard page → *Theme template* → choose `page.dashboard-classic`
(or back to `page.dashboard`) → Save. The header account link keeps working
because it points to the page, not the template.

**In git:** the tag `dashboard-classic-v1` marks the commit (`2be4f65`) the
Classic design came from.

Shared by both designs: `snippets/customer-dashboard-icons.liquid`,
`assets/customer-dashboard-countries.json`, the header account link and the
Customer Account API client ID. A fix to sign-in or data loading should be
applied to both `customer-dashboard.js` and `customer-dashboard-classic.js`.


### New

| Path | Purpose |
|---|---|
| `sections/customer-dashboard.liquid` | Dashboard shell: sidebar, mobile menu, view container and settings. Contains no customer data. |
| `snippets/customer-dashboard-icons.liquid` | SVG icon sprite |
| `snippets/customer-account-url.liquid` | Builds the header account link (see the header setting below) |
| `templates/page.dashboard.json` | Page template that uses the section |
| `assets/customer-dashboard.js` | Dashboard app: OAuth client, allowlisted GraphQL operations, and the views. Vanilla JS, no dependencies. |
| `assets/customer-dashboard.css` | Styles, all scoped under `.cd`; uses Dawn colour-scheme and font variables |
| `assets/customer-dashboard-countries.json` | Country address formats, labels, postal-code patterns and exact `zoneCode` values, generated from Shopify's MIT-licensed [worldwide](https://github.com/Shopify/worldwide) data |
| `scripts/build-address-data.rb` | Regenerates the countries JSON |
| `auth-service/` | Optional server-backed version for custom domains. Not used. |
| `assets/wishlist.js`, `assets/wishlist.css` | Wishlist on the storefront: save buttons, header count, toast, pending changes. Loaded only when the wishlist is enabled. |
| `snippets/wishlist-button.liquid` | The save button (text style or round icon) |
| `snippets/wishlist-setup.liquid` | Loads `wishlist.js` and passes it the signed-in customer's saved list |

### Modified (minimal)

| Path | Change |
|---|---|
| `sections/header.liquid` | The account `href` now uses `customer-account-url`. Adds a **Customer dashboard page** setting. |
| `snippets/header-drawer.liquid` | The mobile drawer's account `href` uses the same snippet |
| `layout/theme.liquid` | Adds `noindex, nofollow` on the dashboard template only |
| `locales/en.default.json` | Adds a `customer_dashboard` block (navigation labels) and `products.wishlist` strings |
| `config/settings_schema.json` | Adds the **Wishlist** settings group (off by default) |
| `layout/theme.liquid` | Loads the wishlist styles and script, only when the wishlist is enabled |
| `snippets/buy-buttons.liquid` | Renders the save button under the buy buttons (product page, Featured product, quick add) |
| `snippets/card-product.liquid` | Renders the round save button on product cards, when that option is on |
| `sections/header.liquid` | Adds the wishlist header icon with a count, when enabled |

**The header change is off until you choose a dashboard page.** With the new
setting empty, the account links behave exactly as stock Dawn. Checkout, the
cart and Shop Pay are untouched.

## Setup (store: `dawn-theme-customize-dashboard.myshopify.com`)

1. **Customer accounts.** In *Settings → Customer accounts*, make sure the
   current **Customer accounts** option is selected, not legacy accounts.
2. **Headless channel.** Install the free **Headless** sales channel and create
   a storefront. Open *Customer Account API → Application setup* and set:
   - **Client type:** **Public** (web).
   - **Callback URI:** `https://dawn-theme-customize-dashboard.myshopify.com/pages/dashboard`
   - **JavaScript origin:** `https://dawn-theme-customize-dashboard.myshopify.com`
   - **Logout URI:** `https://dawn-theme-customize-dashboard.myshopify.com/account/logout`
   - **Permissions:** customer read and write access.
   - Copy the **Client ID**. It's public, not a secret.
3. **Theme.** Connect the `feature/customer-dashboard` branch from GitHub as a
   new draft theme: *Online Store → Themes → Add theme → Connect from GitHub*.
   Don't publish yet.
4. **Page.** In *Online Store → Pages*, add a page:
   - Title: e.g. "My Account".
   - Handle: `dashboard`.
   - Theme template: `page.dashboard`.
   - Leave it **visible**: hidden pages return 404.
5. **Theme editor (draft theme), dashboard page.** Paste the Client ID into
   **Customer Account API client ID**.
6. **Theme editor (draft theme), header section.** Set **Customer dashboard
   page** to the page from step 4.
7. **Preview** the draft theme and run the testing checklist below.

If the store later gets a custom domain, update the three URLs in step 2 to
that domain. The callback URI is always `<primary domain>/pages/dashboard`.

## Wishlist

**Off by default.** Turn it on in the theme editor: **Theme settings → Wishlist → Enable wishlist**. With it off, nothing loads and nothing shows.

When it's on:
- A **Save to wishlist** button appears under the buy buttons on the product page, in the Featured product section and in quick add.
- **Show a save button on product cards** (off by default) adds a round heart to cards in collections, search and product grids.
- **Show wishlist icon in the header** (on by default) adds a heart with the number of saved products.
- The dashboard gets a **Wishlist** page (`#wishlist`), with its own cover photo setting, and an Overview quick link.

### One-time setup in Shopify admin

The list is stored in the customer's Shopify account as a customer metafield. Create its definition once:

1. **Settings → Custom data → Customers → Add definition.**
2. Name: `Wishlist`. Namespace and key: `custom.wishlist`.
3. Type: **JSON**.
4. Under access, set **Customer accounts** to **Read and write**. Shopify only lets the admin set this for store-owned metafields. I couldn't confirm the exact label in the current admin, so check it during setup.
5. Save.

Without this step the wishlist still works, but only in each browser. The Wishlist page then shows a short note.

### How saving works (no extra database)

- **On product pages** there's no Customer Account API session, so a save is recorded as a pending change in the browser's `localStorage` (product ID and handle only). The heart, the header count and the toast update straight away.
- **On the dashboard**, which has a session, pending changes are applied to the account metafield with `metafieldsSet`, then cleared. This happens in the background on any dashboard page, and when the Wishlist page opens. The write uses `compareDigest`, so a change saved from another device isn't overwritten; on a conflict it re-reads and tries once more.
- **Signed-in pages** read the saved list from the metafield in Liquid, so the hearts are right on every device.
- **Guests** can save too. Their saves join their account the first time they open the dashboard after signing in. The toast suggests signing in.
- **Signing out** from the dashboard clears the browser's pending changes. Pending changes left by a different customer, or by someone who has signed out, are discarded.
- **The Wishlist page** loads live product data from the storefront (`/products/<handle>.js`): photo, price, sale price, stock. "Add to cart" adds single-variant products; products with options link to the product page. There's sorting, "Hide sold out", and remove with Undo. A product that has been deleted, or whose handle changed, shows as "No longer available".

### Limits

- Saves made on product pages reach the account the next time the customer opens the dashboard. Until then they live in that browser.
- Up to 100 products.
- The saved list (product IDs and handles) is in the page HTML only for the signed-in customer's own page views.

## Local checks

- Run `shopify theme dev` to see the layout. In the theme editor the dashboard
  shows a notice instead of customer data.
- Shopify only accepts `https` callback URLs that are registered in the
  Headless channel. Live sign-in therefore has to be tested on the store
  itself, using the draft theme preview.
- To regenerate the address data, run
  `git clone --depth 1 https://github.com/Shopify/worldwide /tmp/worldwide && ruby scripts/build-address-data.rb /tmp/worldwide/data/regions`.

## Feature notes and limitations

- **Maps.** Only city, region and country ever go into an embedded map, so the dashboard doesn't send a street address to Google; the full address (without phone) is used only if the customer clicks "Open in Google Maps". All maps are turned off by the section setting **Show a map of the default address**. They use Google's public embed URL (no API key), which Google could change.
  - Overview: a black-and-white map of the default address, with buttons to switch between up to four saved addresses.
  - Saved Addresses: a small map on each address card (lazy-loaded).
  - Order details: a "Show on map" tile that opens the map in a pop-up; nothing loads from Google until it's opened.
- **Cover notification (Overview).** The floating card on the cover shows one box per stage of the customer's open orders (being prepared, shipped, in transit, ready for pickup, out for delivery, delayed). Each box has a product photo, the stage, the order number or the number of orders, and the most useful date (placed, shipped or estimated arrival). Every 4.5 seconds the next box slides up from the bottom. Thin bars on the right show which box is showing and the time until the next. Hovering or focusing the card pauses it. A single-order box links to that order; otherwise the card links to Order Tracking. Each order counts once, by its first shipment that hasn't arrived, out of the 10 most recent orders. With no open orders, the card shows the latest order instead.

- **Look.** The Wordmark design: a cover photo with the page name as a large wordmark, a left gutter label, large display type, thin rules instead of boxes, and a dark band on the Overview. Colours are set as `--cd-*` variables at the top of `customer-dashboard.css`. The Shopify-admin style is archived as the Classic design (see above).
- **My Orders.** Rows grouped by month: product photos, order number, date and items, fulfilment status (plus the payment status when it needs attention), total and item count.
- **Order details.** A facts row (total, items, placed, status), then shipment sections with the status as a large headline, an "Unfulfilled" section, and the payment summary. Product photos open larger on click, and the order number has a Copy button. The side panel has a timeline, contact, shipping address (map pop-up and Copy), billing address, shipping method and the optional help link (section setting **Order help link**).
- **Order timeline.** Built only from dated fields Shopify returns: order placed (`processedAt`), payment received and refunds (successful `SALE`/`CAPTURE`/`REFUND` entries in `Order.transactions`), each shipment (`createdAt`, with its latest status), the estimated delivery date, and cancellation. If the API refuses `transactions`, the order loads again without it and the timeline skips payment events.
- **Order Tracking.** One row per order: order number, date, status and link on the left; shipments on the right with a large status headline and the shipped and estimated delivery dates.
- **My Profile.** An identity header (initials, name, email, customer since, order count), then settings rows: personal information, sign-in and contact, and email preferences.
- **Saved Addresses.** Cards with a city-level map, a Default chip, Edit, Set as default, Copy and Delete, and a dashed "Add another address" tile.
- **Buy again.** Adds an order's items back to the cart through Shopify's storefront cart API (`/cart/add.js`), one line at a time, so sold-out or deleted products are reported instead of blocking the rest. The header cart count refreshes afterwards.
- **Order search.** Searches by order number using the API's `order_number:` filter.
- **Store credit.** Shown on the overview when the customer has a positive balance (`storeCreditAccounts`).
- **Latest shipment.** The overview highlights the most recent shipment that hasn't been delivered.
- **Email preference.** A switch on My Profile uses `customerEmailMarketingSubscribe` and `customerEmailMarketingUnsubscribe`. If the store uses double opt-in, the state shows as pending until the customer confirms.
- **Copy tracking number.** Next to each tracking number. There is no Print button; browser printing still uses a print layout that hides navigation and buttons.

- **Summary counts.** The Customer Account API has no order-count field, so the
  dashboard pages through the customer's orders (100 at a time, up to 3,000)
  and counts them exactly.
  - "In progress" means not cancelled and not `FULFILLED`.
  - "Completed" means `FULFILLED`.
  - Cancelled orders count toward the total only.
- **Shipment progress stepper.** It's derived only from Shopify's
  `latestShipmentStatus`. No carrier events are invented.
  - When it scrolls into view, the line fills to the current step and the dots light up in turn. The current step pulses while the shipment is moving.
  - Hovering, focusing or tapping a step shows a short explanation. Only "Ordered" and "Shipped" show dates, because the API has no timestamps for the other stages.
  - Reduced-motion settings turn the animation off.
- **Profile.** `customerUpdate` only allows first and last name. Email and phone
  are read-only, with a link to Shopify's hosted profile page, where changes are
  verified.
- **Addresses.**
  - Shopify doesn't allow deleting the default address, so the UI explains this.
  - The default address can't be demoted directly; set another address as
    default instead.
- **Order details.**
  - Show up to 50 line items. Beyond that, use the order status page link.
  - "Discounts" is the sum of Shopify's discount allocations. It's already
    reflected in the other amounts.
- **Wishlist.** See the Wishlist section above.
- **Strings.** The navigation labels are in `locales/en.default.json`. The
  dashboard's other text is in the `STRINGS` object at the top of
  `customer-dashboard.js`.

## Not yet verified against the live store

The flow was built from Shopify's documentation and tested end to end against a
simulated Shopify. Check these in the first live test:

1. **Discovery.** `https://<store>/.well-known/openid-configuration` and
   `/.well-known/customer-account-api` answer from the storefront domain.
2. **Token endpoint.** It accepts browser requests from the registered
   JavaScript origin.
3. **Silent sign-in.** `prompt=none` returns a code silently after the storefront
   login (test case 2). If it doesn't, customers see Shopify's login once more
   and everything else still works.
4. **Refresh tokens.** Public clients receive them (test case 10). If not, the
   dashboard silently signs in again when the token expires.
5. **Logout chain.** `end_session` → `/account/logout` also ends the storefront
   session (test case 7).
6. **Theme preview.** It survives the redirect back to `/pages/dashboard` while
   testing the draft theme.
7. **Clearing a province.** On address update, `zoneCode: null` clears the
   province when switching to a country without provinces.
8. **Phone number.** The `phoneNumber` field is readable. If it's restricted,
   the dashboard shows "Not provided".

## Security checklist

- [x] Authorization code flow with PKCE (S256), `state` (constant-time compare) and `nonce`
- [x] ID token claims checked: `iss`, `aud`, `exp` and `nonce`. The token is received directly from the token endpoint over TLS.
- [x] No client secret and no Admin API token anywhere
- [x] Tokens in memory only. Never in localStorage, sessionStorage, cookies or URLs, and never on `window`.
- [x] Authorization code removed from the URL and history immediately
- [x] The one-time transaction (state, nonce, verifier) expires after 10 minutes and is deleted on use
- [x] Redirects use `location.replace`, so Back never replays a sign-in step
- [x] Every request is scoped by Shopify to the token's customer; the dashboard never sends a customer ID
- [x] Refresh on expiry, a single retry on a 401, and a silent sign-in if refresh fails. Requests are serialised.
- [x] XSS: all API data is rendered with `textContent`. Link and image URLs must be `http(s)`.
- [x] No customer data in the Liquid HTML; back/forward-cache restores reload
- [x] Dashboard template is `noindex`
- [x] Rate limits (`429` / `THROTTLED`) are backed off and retried
- [x] A redirect-loop guard shows an error instead of redirecting forever

## Testing checklist

✅ means tested end to end in the local simulated environment. ⬜ means it needs
the live store.

| # | Case | Local | Live |
|---|---|---|---|
| 1 | Signed-out customer clicks Account → Shopify login → dashboard | ✅ | ⬜ |
| 2 | Signed-in customer opens the dashboard with no extra prompt (silent `prompt=none`) | ✅ | ⬜ |
| 3 | Customer with orders: list, pagination, details, tracking | ✅ | ⬜ |
| 4 | Customer without orders: empty states | ✅ | ⬜ |
| 5 | Profile name update saves; server errors show on the field | ✅ | ⬜ |
| 6 | Address create, edit, set default and delete; country-aware form | ✅ | ⬜ |
| 7 | Logout ends the session; Back shows sign-in, not data | ✅ | ⬜ |
| 8 | Another customer's order ID shows "not found" | ✅ | ⬜ |
| 9 | Mobile layout and menu, no horizontal scroll | ✅ | ⬜ |
| 10 | Expired access token refreshed without re-login | ✅ | ⬜ |
| 11 | Dashboard → storefront → dashboard with no prompt (reload re-auths silently) | ✅ | ⬜ |
| 12 | Checkout and Shop Pay unchanged | n/a | ⬜ |
| 13 | Wishlist off (default): no buttons, no header icon, no Wishlist page | code review | ⬜ |
| 14 | Guest saves on product page and cards; after sign-in they appear in the account | ✅ | ⬜ |
| 15 | Signed-in saves on product pages sync into `custom.wishlist` on the next dashboard visit | ✅ | ⬜ |
| 16 | Wishlist page: prices, sold out, options link, add to cart, sort, hide sold out, remove + Undo | ✅ | ⬜ |
| 17 | No metafield access: wishlist keeps working in the browser and shows the note | ✅ | ⬜ |
| 18 | Logout from the dashboard clears this browser's pending wishlist changes | ✅ | ⬜ |
