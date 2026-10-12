// Test doubles: a fake Shopify (discovery, JWKS, token and GraphQL endpoints)
// backed by a locally generated signing key. No network access.

import { loadConfig } from '../src/config.mjs';
import { createOidcClient } from '../src/oidc.mjs';
import { createRouter } from '../src/router.mjs';
import { base64UrlEncode } from '../src/crypto.mjs';
import { parseCookies } from '../src/cookies.mjs';

export const ENV = {
  SHOPIFY_CLIENT_ID: 'client-123',
  SHOPIFY_CLIENT_SECRET: 'secret-xyz',
  SHOPIFY_SHOP_DOMAIN: 'shop.example.com',
  STOREFRONT_URL: 'https://shop.example.com',
  PUBLIC_BASE_URL: 'https://auth.shop.example.com',
  SESSION_SECRET: 'test-secret-test-secret-test-secret-0123456789',
};

export const STOREFRONT = 'https://shop.example.com';
export const AUTH = 'https://auth.shop.example.com';
const ISSUER = 'https://shopify.com/authentication/1234';

export async function createFakeShopify() {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
  const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'key-1', alg: 'RS256', use: 'sig' };

  const state = {
    calls: [],
    nextNonce: null,
    idTokenOverrides: {},
    tokenCounter: 0,
    graphqlStatus: 200,
    graphqlStatusQueue: [],
    graphqlBody: { data: { customer: { id: 'gid://shopify/Customer/1', firstName: 'Ada' } } },
    refreshFails: false,
    expiresIn: 3600,
  };

  async function signIdToken(claims) {
    const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', kid: 'key-1', typ: 'JWT' })));
    const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${header}.${payload}`));
    return `${header}.${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
  }

  async function fetchImpl(input, init = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const headers = new Headers(init.headers);
    const body = init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : init.body;
    state.calls.push({ url: url.toString(), method: init.method || 'GET', headers, body });

    if (url.pathname === '/.well-known/openid-configuration') {
      return Response.json({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/oauth/authorize`,
        token_endpoint: `${ISSUER}/oauth/token`,
        end_session_endpoint: `${ISSUER}/logout`,
        jwks_uri: `${ISSUER}/.well-known/jwks.json`,
      });
    }
    if (url.pathname === '/.well-known/customer-account-api') {
      return Response.json({ graphql_api: 'https://shop.example.com/customer/api/2026-10/graphql' });
    }
    if (url.toString() === `${ISSUER}/.well-known/jwks.json`) return Response.json({ keys: [jwk] });
    if (url.toString() === `${ISSUER}/oauth/token`) {
      if (body.grant_type === 'refresh_token' && state.refreshFails) {
        return Response.json({ error: 'invalid_grant' }, { status: 400 });
      }
      state.tokenCounter += 1;
      const now = Math.floor(Date.now() / 1000);
      const idToken = await signIdToken({
        iss: ISSUER,
        aud: ENV.SHOPIFY_CLIENT_ID,
        sub: 'gid://shopify/Customer/1',
        iat: now,
        exp: now + 3600,
        nonce: state.nextNonce,
        ...state.idTokenOverrides,
      });
      return Response.json({
        access_token: `shcat_access_${state.tokenCounter}`,
        refresh_token: `shcrt_refresh_${state.tokenCounter}`,
        id_token: idToken,
        expires_in: state.expiresIn,
      });
    }
    if (url.pathname === '/customer/api/2026-10/graphql') {
      const status = state.graphqlStatusQueue.length ? state.graphqlStatusQueue.shift() : state.graphqlStatus;
      if (status === 429) return new Response('', { status: 429, headers: { 'Retry-After': '5' } });
      if (status !== 200) return new Response('', { status });
      return Response.json(state.graphqlBody);
    }
    return new Response('not found', { status: 404 });
  }

  return { state, fetchImpl, signIdToken, ISSUER };
}

export async function setup(envOverrides = {}, { clock } = {}) {
  const shopify = await createFakeShopify();
  const config = loadConfig({ ...ENV, ...envOverrides });
  const oidc = createOidcClient(config, shopify.fetchImpl);
  const silentLog = { error() {}, warn() {}, info() {} };
  const handle = createRouter({ config, oidc, now: clock || (() => Date.now()), log: silentLog });
  return { shopify, config, handle };
}

export function setCookies(response) {
  return response.headers.getSetCookie();
}

// Builds a Cookie request header from Set-Cookie response headers (drops cleared cookies).
export function cookieHeaderFrom(response, existing = '') {
  const jar = parseCookies(existing);
  for (const line of setCookies(response)) {
    const [pair] = line.split(';');
    const index = pair.indexOf('=');
    const name = pair.slice(0, index);
    const value = pair.slice(index + 1);
    if (/Max-Age=0\b/.test(line)) jar.delete(name);
    else jar.set(name, value);
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

// Runs login + callback and returns the session Cookie header.
export async function signIn(ctx, { returnTo = '/pages/dashboard' } = {}) {
  const login = await ctx.handle(new Request(`${AUTH}/auth/login?return_to=${encodeURIComponent(returnTo)}`));
  const authorize = new URL(login.headers.get('Location'));
  ctx.shopify.state.nextNonce = authorize.searchParams.get('nonce');
  const oauthCookie = cookieHeaderFrom(login);
  const callback = await ctx.handle(
    new Request(`${AUTH}/auth/callback?code=abc&state=${authorize.searchParams.get('state')}`, {
      headers: { Cookie: oauthCookie },
    })
  );
  return { login, authorize, callback, cookie: cookieHeaderFrom(callback, oauthCookie) };
}

export function apiRequest(path, { cookie, body, method = body ? 'POST' : 'GET', origin = STOREFRONT } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (origin) headers.Origin = origin;
  if (body) headers['Content-Type'] = 'application/json';
  return new Request(`${AUTH}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
