# Customer dashboard auth service (optional, not currently used)

> **Status:** the theme currently uses the no-server version: an in-browser
> public client (see [`docs/customer-dashboard.md`](../docs/customer-dashboard.md)).
> This service is kept as an upgrade path for when the store has its own domain.
> To use it, the dashboard JavaScript would need to switch back to calling this
> service.

A small backend (one Netlify Function) that connects the Dawn customer dashboard
at `/pages/dashboard` to Shopify's **Customer Account API**. It's a
confidential OAuth 2.0 client: it handles sign-in and sign-out and passes
dashboard requests to Shopify for the signed-in customer.

- **No database.** The session is an AES-256-GCM encrypted, `HttpOnly`,
  `Secure`, `SameSite=Strict` cookie that only this subdomain can read. It holds
  the Shopify access, refresh and ID tokens. Nothing else is stored anywhere.
- **No tokens in the browser.** Dashboard JavaScript only ever sees GraphQL
  results.
- **No arbitrary queries.** The browser names one of the operations allowlisted
  in [`src/operations.mjs`](src/operations.mjs). The variables are validated, and
  every query runs against the token's own customer. Customer IDs are never
  accepted from the browser.

See [`docs/customer-dashboard.md`](../docs/customer-dashboard.md) for the
overall architecture, the Shopify admin setup, and the testing checklist.

## Routes

| Route | Purpose |
|---|---|
| `GET /auth/login?return_to=/pages/dashboard[&prompt=none]` | Starts the authorization code flow, with PKCE (S256), `state` and `nonce` |
| `GET /auth/callback` | Checks `state`, exchanges the code, verifies the ID token (JWKS signature, `iss`, `aud`, `exp`, `nonce`), then sets the session |
| `POST /auth/logout` | Checks the storefront `Origin`, clears the session, then redirects to Shopify's `end_session_endpoint` with `id_token_hint` |
| `GET /api/session` | Returns `200` (signed in) or `401`, and refreshes the tokens if they're close to expiry |
| `POST /api/graphql` | `{ "operation": "Orders", "variables": { "after": "…" } }` runs one allowlisted operation |

The API routes are CORS-restricted to `STOREFRONT_URL` plus `ALLOWED_ORIGINS`,
with credentials allowed.

## Environment variables

See [`.env.example`](.env.example). Required:

- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `SHOPIFY_SHOP_DOMAIN`
- `STOREFRONT_URL`
- `PUBLIC_BASE_URL`
- `SESSION_SECRET`

Generate a session secret with `npm run secret`. Set the variables in Netlify
under Site configuration → Environment variables, and mark the client secret
and session secret as secret values. Never commit them.

To rotate the session secret:
1. Move the current value to `SESSION_SECRET_PREVIOUS`.
2. Set a new `SESSION_SECRET` and deploy.
3. Remove `SESSION_SECRET_PREVIOUS` after `SESSION_MAX_AGE_DAYS` have passed.

## Tests

```bash
cd auth-service
npm test
```

There are no dependencies to install. The tests use a fake Shopify (discovery,
JWKS, token and GraphQL endpoints) signed with a locally generated key. They
cover:
- PKCE, `state` and `nonce` checks
- ID token issuer and audience checks
- open-redirect protection
- origin and CSRF checks
- tampered and foreign cookies
- secret rotation
- server-side refresh, retry on a 401, and the absolute session lifetime
- rate-limit passthrough
- logout

## Deploy (Netlify)

1. In Netlify, choose **Add new site → Import an existing project** and pick this repository.
   - Set **Base directory** to `auth-service`.
   - Leave the build command empty.
   - `netlify.toml` already sets `publish = "public"` and `functions = "netlify/functions"`.
2. Add the environment variables, then deploy.
3. Under **Domain management**, add the custom domain `auth.<your-domain>`.
   - Create the DNS `CNAME` record Netlify shows you (`auth` → `<site>.netlify.app`).
   - Wait for the HTTPS certificate.
4. Check that `https://auth.<your-domain>/api/session` returns `403` when you
   open it directly. That's the origin check working.

The auth service **must** be on a subdomain of the storefront's own domain, for
example `auth.yourstore.com` for `yourstore.com`. That makes it the same site,
so browsers send its cookies with the dashboard's requests. A `*.netlify.app`
address won't work in production, because browsers treat it as third-party.
