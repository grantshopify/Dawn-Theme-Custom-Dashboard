import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pkceChallenge } from '../src/crypto.mjs';
import { AUTH, STOREFRONT, apiRequest, cookieHeaderFrom, setCookies, setup, signIn } from './helpers.mjs';

test('login redirects to Shopify with state, nonce and PKCE (S256)', async () => {
  const ctx = await setup();
  const response = await ctx.handle(new Request(`${AUTH}/auth/login?return_to=%2Fpages%2Fdashboard%23orders`));
  assert.equal(response.status, 302);
  const location = new URL(response.headers.get('Location'));
  assert.equal(location.origin + location.pathname, `${ctx.shopify.ISSUER}/oauth/authorize`);
  const params = location.searchParams;
  assert.equal(params.get('client_id'), 'client-123');
  assert.equal(params.get('response_type'), 'code');
  assert.equal(params.get('scope'), 'openid email customer-account-api:full');
  assert.equal(params.get('redirect_uri'), `${AUTH}/auth/callback`);
  assert.equal(params.get('code_challenge_method'), 'S256');
  assert.ok(params.get('state').length >= 43);
  assert.ok(params.get('nonce').length >= 43);
  assert.equal(params.get('prompt'), null);

  const cookie = setCookies(response).find((line) => line.startsWith('__Host-cd_oauth='));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, new RegExp(params.get('state')), 'transaction cookie must be encrypted');
});

test('silent login passes prompt=none', async () => {
  const ctx = await setup();
  const response = await ctx.handle(new Request(`${AUTH}/auth/login?prompt=none&locale=fr-CA`));
  const params = new URL(response.headers.get('Location')).searchParams;
  assert.equal(params.get('prompt'), 'none');
  assert.equal(params.get('locale'), 'fr-CA');
});

test('return_to cannot redirect off the storefront', async () => {
  const ctx = await setup();
  for (const evil of ['//evil.com/x', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)']) {
    const { callback } = await signIn(ctx, { returnTo: evil });
    assert.equal(callback.headers.get('Location'), `${STOREFRONT}/pages/dashboard`, evil);
  }
});

test('callback exchanges the code with client credentials and PKCE verifier, then sets an encrypted session', async () => {
  const ctx = await setup();
  const { authorize, callback } = await signIn(ctx, { returnTo: '/pages/dashboard' });
  assert.equal(callback.status, 302);
  assert.equal(callback.headers.get('Location'), `${STOREFRONT}/pages/dashboard`);

  const tokenCall = ctx.shopify.state.calls.find((call) => call.url.endsWith('/oauth/token'));
  assert.equal(tokenCall.method, 'POST');
  assert.equal(tokenCall.body.grant_type, 'authorization_code');
  assert.equal(tokenCall.body.code, 'abc');
  assert.equal(tokenCall.headers.get('Authorization'), `Basic ${Buffer.from('client-123:secret-xyz').toString('base64')}`);
  assert.equal(await pkceChallenge(tokenCall.body.code_verifier), authorize.searchParams.get('code_challenge'));

  const lines = setCookies(callback);
  const session = lines.find((line) => line.startsWith('__Host-cd_session.0='));
  assert.ok(session, 'session cookie set');
  assert.match(session, /HttpOnly/);
  assert.match(session, /SameSite=Strict/);
  assert.doesNotMatch(session, /shcat_|shcrt_/, 'tokens must not be readable in the cookie');
  assert.ok(lines.some((line) => line.startsWith('__Host-cd_oauth=;') && /Max-Age=0/.test(line)), 'transaction cleared');
});

test('callback rejects a mismatched state', async () => {
  const ctx = await setup();
  const login = await ctx.handle(new Request(`${AUTH}/auth/login`));
  const response = await ctx.handle(
    new Request(`${AUTH}/auth/callback?code=abc&state=forged`, { headers: { Cookie: cookieHeaderFrom(login) } })
  );
  assert.equal(response.headers.get('Location'), `${STOREFRONT}/pages/dashboard?cd_auth_error=state`);
  assert.ok(!ctx.shopify.state.calls.some((call) => call.url.endsWith('/oauth/token')), 'no token exchange');
});

test('callback without the transaction cookie fails safely', async () => {
  const ctx = await setup();
  const response = await ctx.handle(new Request(`${AUTH}/auth/callback?code=abc&state=x`));
  assert.equal(response.headers.get('Location'), `${STOREFRONT}/pages/dashboard?cd_auth_error=expired`);
});

test('callback rejects an ID token with the wrong nonce, issuer or audience', async () => {
  for (const override of [{ nonce: 'other' }, { iss: 'https://evil.example' }, { aud: 'someone-else' }]) {
    const ctx = await setup();
    const login = await ctx.handle(new Request(`${AUTH}/auth/login`));
    const authorize = new URL(login.headers.get('Location'));
    ctx.shopify.state.nextNonce = authorize.searchParams.get('nonce');
    ctx.shopify.state.idTokenOverrides = override;
    const response = await ctx.handle(
      new Request(`${AUTH}/auth/callback?code=abc&state=${authorize.searchParams.get('state')}`, {
        headers: { Cookie: cookieHeaderFrom(login) },
      })
    );
    assert.equal(response.headers.get('Location'), `${STOREFRONT}/pages/dashboard?cd_auth_error=failed`, JSON.stringify(override));
    assert.ok(!setCookies(response).some((line) => line.startsWith('__Host-cd_session.0=') && !/Max-Age=0/.test(line)));
  }
});

test('silent login with no Shopify session falls back to interactive login', async () => {
  const ctx = await setup();
  const login = await ctx.handle(new Request(`${AUTH}/auth/login?prompt=none&return_to=%2Fpages%2Fdashboard`));
  const state = new URL(login.headers.get('Location')).searchParams.get('state');
  const response = await ctx.handle(
    new Request(`${AUTH}/auth/callback?error=login_required&state=${state}`, { headers: { Cookie: cookieHeaderFrom(login) } })
  );
  const retry = new URL(response.headers.get('Location'));
  assert.equal(retry.origin + retry.pathname, `${AUTH}/auth/login`);
  assert.equal(retry.searchParams.get('prompt'), null);
  assert.equal(retry.searchParams.get('return_to'), '/pages/dashboard');
});

test('API endpoints reject requests from other origins', async () => {
  const ctx = await setup();
  const { cookie } = await signIn(ctx);
  for (const origin of [null, 'https://evil.com', 'http://shop.example.com']) {
    const response = await ctx.handle(apiRequest('/api/session', { cookie, origin }));
    assert.equal(response.status, 403, String(origin));
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
});

test('session endpoint reports authentication state', async () => {
  const ctx = await setup();
  const anonymous = await ctx.handle(apiRequest('/api/session'));
  assert.equal(anonymous.status, 401);

  const { cookie } = await signIn(ctx);
  const response = await ctx.handle(apiRequest('/api/session', { cookie }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: true });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), STOREFRONT);
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), 'true');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.doesNotMatch(await (await ctx.handle(apiRequest('/api/session', { cookie }))).text(), /shcat_|shcrt_/);
});

test('tampered session cookie is rejected and cleared', async () => {
  const ctx = await setup();
  const { cookie } = await signIn(ctx);
  const tampered = cookie.replace(/(__Host-cd_session\.0=)(.)/, (_, name, ch) => name + (ch === 'A' ? 'B' : 'A'));
  const response = await ctx.handle(apiRequest('/api/session', { cookie: tampered }));
  assert.equal(response.status, 401);
  assert.ok(setCookies(response).some((line) => line.startsWith('__Host-cd_session.0=;') && /Max-Age=0/.test(line)));
});

test('a session signed with a different secret is rejected', async () => {
  const ctx = await setup();
  const { cookie } = await signIn(ctx);
  const other = await setup({ SESSION_SECRET: 'another-secret-another-secret-another-secret' });
  const response = await other.handle(apiRequest('/api/session', { cookie }));
  assert.equal(response.status, 401);
});

test('previous secret is still accepted during rotation', async () => {
  const ctx = await setup();
  const { cookie } = await signIn(ctx);
  const rotated = await setup({
    SESSION_SECRET: 'rotated-secret-rotated-secret-rotated-secret',
    SESSION_SECRET_PREVIOUS: 'test-secret-test-secret-test-secret-0123456789',
  });
  const response = await rotated.handle(apiRequest('/api/session', { cookie }));
  assert.equal(response.status, 200);
});

test('graphql forwards only allowlisted operations with the session token', async () => {
  const ctx = await setup();
  const { cookie } = await signIn(ctx);

  const response = await ctx.handle(apiRequest('/api/graphql', { cookie, body: { operation: 'Profile' } }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.customer.firstName, 'Ada');

  const call = ctx.shopify.state.calls.find((c) => c.url.endsWith('/graphql'));
  assert.equal(call.headers.get('Authorization'), 'shcat_access_1');
  assert.match(JSON.parse(call.body).query, /query Profile/);

  const unknown = await ctx.handle(apiRequest('/api/graphql', { cookie, body: { operation: 'toString' } }));
  assert.equal(unknown.status, 400);
  const raw = await ctx.handle(
    apiRequest('/api/graphql', { cookie, body: { query: '{ customer { id } }' } })
  );
  assert.equal(raw.status, 400);
});

test('graphql validates variables and never accepts customer identifiers', async () => {
  const ctx = await setup();
  const { cookie } = await signIn(ctx);
  const cases = [
    { operation: 'Order', variables: { id: 'gid://shopify/Customer/2' } },
    { operation: 'Order', variables: { id: '1 OR 1=1' } },
    { operation: 'Profile', variables: { customerId: 'gid://shopify/Customer/2' } },
    { operation: 'Orders', variables: { after: 'x', before: 'y' } },
    { operation: 'Orders', variables: { first: 250 } },
    { operation: 'ProfileUpdate', variables: { input: { email: 'x@example.com' } } },
    { operation: 'AddressCreate', variables: { address: { countryCode: 'Canada' } } },
    { operation: 'AddressDelete', variables: { addressId: 'gid://shopify/Order/1' } },
  ];
  for (const body of cases) {
    const response = await ctx.handle(apiRequest('/api/graphql', { cookie, body }));
    assert.equal(response.status, 400, JSON.stringify(body));
  }
  assert.ok(!ctx.shopify.state.calls.some((c) => c.url.endsWith('/graphql')), 'nothing forwarded');
});

test('graphql without a session returns 401', async () => {
  const ctx = await setup();
  const response = await ctx.handle(apiRequest('/api/graphql', { body: { operation: 'Profile' } }));
  assert.equal(response.status, 401);
});

test('graphql requires JSON (blocks simple cross-site form posts)', async () => {
  const ctx = await setup();
  const { cookie } = await signIn(ctx);
  const response = await ctx.handle(
    new Request(`${AUTH}/api/graphql`, {
      method: 'POST',
      headers: { Cookie: cookie, Origin: STOREFRONT, 'Content-Type': 'text/plain' },
      body: JSON.stringify({ operation: 'Profile' }),
    })
  );
  assert.equal(response.status, 400);
});

test('expired access token is refreshed server-side before calling Shopify', async () => {
  let now = Date.now();
  const ctx = await setup({}, { clock: () => now });
  const { cookie } = await signIn(ctx);
  now += 3600 * 1000; // access token expired
  const response = await ctx.handle(apiRequest('/api/graphql', { cookie, body: { operation: 'Profile' } }));
  assert.equal(response.status, 200);
  const refresh = ctx.shopify.state.calls.find((c) => c.url.endsWith('/oauth/token') && c.body.grant_type === 'refresh_token');
  assert.equal(refresh.body.refresh_token, 'shcrt_refresh_1');
  const call = ctx.shopify.state.calls.findLast((c) => c.url.endsWith('/graphql'));
  assert.equal(call.headers.get('Authorization'), 'shcat_access_2');
  assert.ok(setCookies(response).some((line) => line.startsWith('__Host-cd_session.0=') && !/Max-Age=0/.test(line)));
});

test('failed refresh ends the session', async () => {
  let now = Date.now();
  const ctx = await setup({}, { clock: () => now });
  const { cookie } = await signIn(ctx);
  now += 3600 * 1000;
  ctx.shopify.state.refreshFails = true;
  const response = await ctx.handle(apiRequest('/api/session', { cookie }));
  assert.equal(response.status, 401);
  assert.ok(setCookies(response).some((line) => line.startsWith('__Host-cd_session.0=;')));
});

test('upstream 401 triggers one refresh and retry', async () => {
  const ctx = await setup();
  const { cookie } = await signIn(ctx);
  ctx.shopify.state.graphqlStatusQueue = [401, 200];
  const response = await ctx.handle(apiRequest('/api/graphql', { cookie, body: { operation: 'Profile' } }));
  assert.equal(response.status, 200);
  const graphqlCalls = ctx.shopify.state.calls.filter((c) => c.url.endsWith('/graphql'));
  assert.deepEqual(graphqlCalls.map((c) => c.headers.get('Authorization')), ['shcat_access_1', 'shcat_access_2']);
});

test('session older than the absolute lifetime is rejected', async () => {
  let now = Date.now();
  const ctx = await setup({ SESSION_MAX_AGE_DAYS: '1' }, { clock: () => now });
  const { cookie } = await signIn(ctx);
  now += 2 * 86400 * 1000;
  const response = await ctx.handle(apiRequest('/api/session', { cookie }));
  assert.equal(response.status, 401);
});

test('rate limits are passed through with Retry-After', async () => {
  const ctx = await setup();
  const { cookie } = await signIn(ctx);
  ctx.shopify.state.graphqlStatus = 429;
  const response = await ctx.handle(apiRequest('/api/graphql', { cookie, body: { operation: 'Profile' } }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '5');

  ctx.shopify.state.graphqlStatus = 200;
  ctx.shopify.state.graphqlBody = { errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] };
  const throttled = await ctx.handle(apiRequest('/api/graphql', { cookie, body: { operation: 'Profile' } }));
  assert.equal(throttled.status, 429);
});

test('logout requires the storefront origin, clears cookies and ends the Shopify session', async () => {
  const ctx = await setup();
  const { cookie } = await signIn(ctx);

  const forged = await ctx.handle(apiRequest('/auth/logout', { cookie, method: 'POST', origin: 'https://evil.com' }));
  assert.equal(forged.status, 403);

  const response = await ctx.handle(apiRequest('/auth/logout', { cookie, method: 'POST' }));
  assert.equal(response.status, 302);
  const location = new URL(response.headers.get('Location'));
  assert.equal(location.origin + location.pathname, `${ctx.shopify.ISSUER}/logout`);
  assert.ok(location.searchParams.get('id_token_hint').split('.').length === 3);
  assert.equal(location.searchParams.get('post_logout_redirect_uri'), `${STOREFRONT}/account/logout`);
  const lines = setCookies(response);
  assert.ok(lines.some((line) => line.startsWith('__Host-cd_session.0=;') && /Max-Age=0/.test(line)));

  // The old cookie value is still cryptographically valid, but the browser has
  // dropped it; after logout the jar no longer has a session.
  const after = await ctx.handle(apiRequest('/api/session', { cookie: cookieHeaderFrom(response, cookie) }));
  assert.equal(after.status, 401);
});

test('logout via GET is not allowed', async () => {
  const ctx = await setup();
  const response = await ctx.handle(new Request(`${AUTH}/auth/logout`));
  assert.equal(response.status, 404);
});
