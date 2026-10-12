# Custom customer dashboard

A custom account dashboard at `/pages/dashboard` for this Dawn 15.4.1 theme.
Customers sign in with Shopify's own customer accounts, using email and a
verification code. All data is read from and written to Shopify through the
**Customer Account API**. There is no second customer database.

## Architecture

```
Browser ── https://yourstore.com/pages/dashboard  (Dawn page template, header/footer intact)
   │          JS: assets/customer-dashboard.js   — no tokens, only GraphQL results
   │  fetch(credentials: include)
   ▼
https://auth.yourstore.com  (auth-service/, one Netlify Function, no database)
   │  confidential OAuth client · encrypted HttpOnly session cookie · operation allowlist
   ▼
Shopify Customer Account API  (https://yourstore.com/customer/api/<version>/graphql)
```

**Why a small backend is needed.** Signing in to the storefront fills Liquid's
`customer` object, but it doesn't give page JavaScript a Customer Account API
token. Getting a token takes the OAuth authorization code flow.
- A theme-only "public client" would have to keep tokens in page JavaScript.
  Every app and analytics script injected through `content_for_header` could
  reach them.
- The backend keeps tokens in a cookie that JavaScript can't read, and keeps
  the client secret off the storefront.

**How the Shopify login is reused.**
1. The header account icon links to `/customer_authentication/login?return_to=/pages/dashboard`.
   This is Shopify's own storefront login.
2. Back on the dashboard the customer is now signed in, so the dashboard asks
   the auth service to authorize with `prompt=none`.
3. Shopify recognises the existing session and returns immediately, with no
   second login screen.
4. If Shopify answers `login_required`, the auth service falls back to the
   normal interactive login.

**Session lifetime.**
- The access token is refreshed on the server shortly before it expires.
- The session has an absolute lifetime of `SESSION_MAX_AGE_DAYS` (default 14).
- After that, or if a refresh fails, the dashboard goes through sign-in again.
  This is silent while the Shopify session is still valid.

**Logout.** The **Log Out** button posts to `auth.yourstore.com/auth/logout`, which:
1. clears the session cookie;
2. ends the Shopify session through `end_session_endpoint` with `id_token_hint`;
3. redirects to the storefront's `/account/logout`, so the Liquid storefront session ends too.

## Files

### New

| Path | Purpose |
|---|---|
| `sections/customer-dashboard.liquid` | Dashboard shell: sidebar, mobile menu, view container and section settings. Contains no customer data. |
| `snippets/customer-dashboard-icons.liquid` | SVG icon sprite |
| `snippets/customer-account-url.liquid` | Builds the header account link (see the header setting below) |
| `templates/page.dashboard.json` | Page template that uses the section |
| `assets/customer-dashboard.js` | Dashboard app: vanilla JS, no dependencies, routed by URL hash |
| `assets/customer-dashboard.css` | Styles, all scoped under `.cd`; uses Dawn colour-scheme and font variables |
| `assets/customer-dashboard-countries.json` | Country address formats, labels, postal-code patterns and the exact `zoneCode` values. Generated from Shopify's MIT-licensed [worldwide](https://github.com/Shopify/worldwide) data. |
| `scripts/build-address-data.rb` | Regenerates the countries JSON |
| `auth-service/` | Netlify Function auth service, with tests. See [its README](../auth-service/README.md). |

### Modified (minimal)

| Path | Change |
|---|---|
| `sections/header.liquid` | The account `href` now uses `customer-account-url`. Adds a **Customer dashboard page** setting. |
| `snippets/header-drawer.liquid` | The mobile drawer's account `href` uses the same snippet |
| `layout/theme.liquid` | Adds `noindex, nofollow` on the dashboard template only |
| `locales/en.default.json` | Adds a `customer_dashboard` block (navigation labels) |

**The header change is off until you choose a dashboard page.** With the new
setting empty, the account links behave exactly as stock Dawn. Checkout, the
cart, Shop Pay and the other templates are untouched.

## Shopify admin configuration

1. **Customer accounts.** In *Settings → Customer accounts*, make sure the
   current **Customer accounts** option is selected, not legacy accounts.
2. **Headless channel.** Install the free Headless channel from the Shopify App
   Store and create a storefront. Then open *Customer Account API → Application
   setup* and set:
   - **Client type:** Confidential.
   - **Callback URI:** `https://auth.yourstore.com/auth/callback`
   - **Logout URI:** `https://yourstore.com/account/logout`. This must match
     `POST_LOGOUT_REDIRECT_URI` if you override it.
   - **JavaScript origins:** not needed for a confidential client.
   - **Permissions:** customer read and write access.
   - Copy the **Client ID** and **Client secret** into the Netlify environment variables.
3. **Theme.** Work on an **unpublished copy** first. Either duplicate the live
   theme, or push this branch with `shopify theme push --unpublished`.
4. **Page.** In *Online Store → Pages*, add a page:
   - Title: e.g. "My Account".
   - Handle: `dashboard`.
   - Theme template: `page.dashboard`.
   - Leave it **visible**: hidden pages return 404.
   - Don't add it to navigation menus.
5. **Theme editor, dashboard page.** Set **Auth service URL** to `https://auth.yourstore.com`.
6. **Theme editor, header section.** Set **Customer dashboard page** to the page
   from step 4. This turns on the new account link.
7. **Auth service.** Deploy it with its environment variables and the
   `auth.yourstore.com` custom domain. See the [auth-service README](../auth-service/README.md).

**Requirements:**
- A custom storefront domain. The auth service must be a subdomain of it.
- A plan that includes the Headless channel. Community reports say Basic or
  higher; Shopify doesn't list this officially, so confirm in your admin.

## Local development

- **Auth service unit tests:** `cd auth-service && npm test`. No network access
  or dependencies needed.
- **Theme:** `shopify theme dev` works for the layout and the theme editor.
  The dashboard shows a notice in the editor instead of loading customer data.
  Live data **can't** load from `127.0.0.1:9292`, because the session cookie is
  tied to the store's own domain.
- **Live testing:** use the unpublished theme's preview on the real domain, e.g.
  `https://yourstore.com/pages/dashboard?preview_theme_id=<id>`, against the
  deployed auth service. Shopify doesn't allow `localhost` or `http` callback
  URLs.
- **Address data:** to regenerate it, run
  `git clone --depth 1 https://github.com/Shopify/worldwide /tmp/worldwide && ruby scripts/build-address-data.rb /tmp/worldwide/data/regions`.

## Deployment

1. Deploy the auth service to Netlify and confirm `https://auth.yourstore.com/api/session` returns `403` in a browser tab.
2. Push the theme branch as an unpublished theme and complete the admin steps above.
3. Run the testing checklist on the preview with real test customers.
4. Publish the theme once approved. **Do not publish without sign-off.**

To roll back, clear the header's **Customer dashboard page** setting. The
account icon immediately returns to Shopify's standard account pages.

## Feature notes and limitations

- **Summary cards.** The Customer Account API has no order-count field, so the
  dashboard pages through the customer's orders (100 at a time, up to 3,000) and
  counts them exactly.
  - "In progress" means not cancelled and not `FULFILLED`.
  - "Completed" means `FULFILLED`.
  - Cancelled orders count toward the total only.
  - Above 3,000 orders, the total shows "3,000+" and the other two cards show "—".
- **Profile.** `customerUpdate` only allows first and last name. Email and phone
  are shown read-only, with a link to Shopify's hosted profile page, where
  changes are verified.
- **Addresses.**
  - Shopify doesn't allow deleting the default address, so the UI explains this.
  - The default address can't be demoted directly; set another address as
    default instead.
- **Tracking.**
  - Uses Shopify fulfillment data only: carrier, number, URL,
    `latestShipmentStatus` and estimated delivery.
  - The dashboard never invents carrier events.
- **Order details.**
  - Show up to 50 line items. Beyond that, the order status page link has the rest.
  - "Discounts" is the sum of Shopify's discount allocations. It's already
    reflected in the other amounts.
- **Wishlist.** Deliberately not shipped in this release. The navigation item
  is hidden because it has no working implementation yet.
  - A Shopify-native option exists for release 2: a customer metafield whose
    definition has customer-account access set to "Read and write", written with
    the Customer Account API `metafieldsSet` mutation.
- **Strings.** The navigation labels are in `locales/en.default.json`. The
  dashboard's other text is in the `STRINGS` object at the top of
  `customer-dashboard.js`.
- **Stateless sessions.** Logout deletes the cookie and ends the Shopify
  session, but the service doesn't keep a server-side revocation list. That
  would need a database. A copied cookie value is limited by its encryption,
  `HttpOnly`, `SameSite=Strict`, and Shopify ending the session.

## Not yet verified against a live store

These steps were built from Shopify's documentation and tested with a simulated
Shopify. Confirm each one in the first live test:

1. **Discovery.** `https://<custom domain>/.well-known/openid-configuration` and
   `/.well-known/customer-account-api` both answer. If they don't, set
   `SHOPIFY_SHOP_DOMAIN` to the `myshopify.com` domain.
2. **PKCE.** The confidential client accepts the PKCE parameters it sends.
   - Symptom if not: `invalid_grant` or `invalid_request` at the callback.
   - Check the Netlify function logs.
3. **Silent sign-in.** After the storefront login, `prompt=none` returns a code
   without a second prompt (test case 2). If it doesn't, the customer sees
   Shopify's login once more and everything else still works.
4. **Refresh tokens** are issued and rotate as expected (test case 10).
5. **Logout chain.** `end_session` → `/account/logout` → home also ends the Liquid
   storefront session (test case 7).
6. **Clearing a province.** On address update, sending `zoneCode: null` clears
   the province when the country changes to one without provinces.
7. **Phone number.** The `phoneNumber` field is readable for your app. Phone is
   protected customer data; if it's restricted, the dashboard shows "Not provided".
8. **Query cost.** The order details query (50 line items, 5 fulfillments × 25
   items) stays under Shopify's per-query cost limit.

## Security checklist

- [x] Authorization code flow with PKCE (S256), `state` (constant-time compare) and `nonce`
- [x] ID token signature verified against Shopify's JWKS, plus `iss`, `aud`, `exp` and `nonce`
- [x] Client secret only in the Netlify environment, never in the theme or browser
- [x] No Admin API token anywhere
- [x] Tokens only in an encrypted `HttpOnly` / `Secure` / `SameSite=Strict` `__Host-` cookie; never in `localStorage`, URLs or JavaScript
- [x] OAuth transaction cookie is encrypted, expires after 10 minutes and is single-use
- [x] Open-redirect protection: `return_to` accepts only relative storefront paths
- [x] CORS allowlist with credentials. Every API call requires the storefront `Origin` and `Content-Type: application/json`, which blocks CSRF via simple forms.
- [x] Logout is POST-only with an `Origin` check
- [x] Operation allowlist with strict variable validation. Customer IDs are never accepted, and Shopify scopes every query to the token's customer.
- [x] Refresh on the server, a single retry on a 401, and the session cleared if refresh fails. Requests are serialised so only one refresh runs at a time.
- [x] Absolute session lifetime and support for rotating the session secret
- [x] `Cache-Control: no-store`, `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff` on every auth response
- [x] XSS: all API data is rendered with `textContent`. Link and image URLs must be `http(s)`, so `javascript:` URLs are rejected.
- [x] No customer data in Liquid HTML. Pages restored from the back/forward cache reload and re-check the session.
- [x] Dashboard template is `noindex`
- [x] Rate limits: `429` and `THROTTLED` are passed through with `Retry-After`, and the client backs off
- [x] Logs never contain tokens or customer data

## Testing checklist

✅ means tested in the local simulated environment. ⬜ means it needs the live
store, with real Shopify, test customers and a real checkout.

| # | Case | Local | Live |
|---|---|---|---|
| 1 | Signed-out customer clicks Account → Shopify login → dashboard | ✅ | ⬜ |
| 2 | Signed-in customer clicks Account → dashboard without another prompt | ✅ (simulated `prompt=none`) | ⬜ |
| 3 | Customer with orders sees only their orders, with pagination, details and tracking | ✅ | ⬜ |
| 4 | Customer without orders sees the empty states | ✅ | ⬜ |
| 5 | Profile name update saves; server validation errors show on the field | ✅ | ⬜ |
| 6 | Address create, edit, set default and delete (confirmation, default delete blocked); country-aware fields | ✅ | ⬜ |
| 7 | Logout clears the session; Back shows no data and requires sign-in | ✅ | ⬜ |
| 8 | Another customer's order ID returns "not found"; customer IDs rejected (unit tests) | ✅ | ⬜ |
| 9 | Mobile layout and menu, no horizontal scroll at 375px | ✅ | ⬜ |
| 10 | Expired or revoked access token refreshed on the server without re-login | ✅ | ⬜ |
| 11 | Dashboard → storefront → dashboard without a prompt | ✅ | ⬜ |
| 12 | Checkout and Shop Pay unchanged (not modified by this work) | n/a | ⬜ |
