// HTTP routes for the dashboard auth service.
//
//   GET  /auth/login     start the Customer Account API authorization code flow
//   GET  /auth/callback  validate state, exchange the code, verify the ID token, set the session
//   POST /auth/logout    clear the session and end the Shopify session (end_session_endpoint)
//   GET  /api/session    report whether a valid session exists (refreshing tokens if needed)
//   POST /api/graphql    run one allowlisted Customer Account API operation

import { pkceChallenge, randomToken, safeEqual } from './crypto.mjs';
import { parseCookies } from './cookies.mjs';
import { OPERATIONS, ValidationError } from './operations.mjs';
import { OAuthError } from './oidc.mjs';
import {
  OAUTH_TTL_SECONDS,
  clearOAuthHeader,
  clearSessionHeaders,
  createSession,
  hasSessionCookie,
  oauthCookieHeader,
  readOAuthTransaction,
  readSession,
  sessionCookieHeaders,
  updateSessionTokens,
} from './session.mjs';

const REFRESH_MARGIN_MS = 2 * 60 * 1000;
const MAX_BODY_BYTES = 16 * 1024;
const SILENT_LOGIN_ERRORS = new Set(['login_required', 'interaction_required', 'consent_required']);
const LOCALE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function makeHeaders(extra = {}, cookies = []) {
  const headers = new Headers({ ...BASE_HEADERS, ...extra });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return headers;
}

function redirect(location, cookies = []) {
  return new Response(null, { status: 302, headers: makeHeaders({ Location: location }, cookies) });
}

function json(status, body, { origin, cookies = [], headers = {} } = {}) {
  const extra = { 'Content-Type': 'application/json; charset=utf-8', ...headers };
  if (origin) Object.assign(extra, corsHeaders(origin));
  return new Response(JSON.stringify(body), { status, headers: makeHeaders(extra, cookies) });
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

// Only relative storefront paths are accepted, preventing open redirects.
export function sanitizeReturnTo(value, config) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return config.dashboardPath;
  }
  if (value.length > 512 || /[\u0000-\u001F\u007F]/.test(value)) return config.dashboardPath;
  try {
    const url = new URL(value, config.storefrontOrigin);
    if (url.origin !== config.storefrontOrigin) return config.dashboardPath;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return config.dashboardPath;
  }
}

function storefrontUrl(config, path, params = {}) {
  const url = new URL(path, config.storefrontOrigin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function allowedOrigin(request, config) {
  const origin = request.headers.get('Origin');
  return origin && config.allowedOrigins.has(origin) ? origin : null;
}

export function createRouter({ config, oidc, now = () => Date.now(), log = console }) {
  async function login(request) {
    const url = new URL(request.url);
    const returnTo = sanitizeReturnTo(url.searchParams.get('return_to'), config);
    const prompt = url.searchParams.get('prompt') === 'none' ? 'none' : undefined;
    const localeParam = url.searchParams.get('locale');
    const locale = localeParam && LOCALE.test(localeParam) ? localeParam : undefined;

    const state = randomToken(32);
    const nonce = randomToken(32);
    const codeVerifier = randomToken(48);
    const transaction = {
      state,
      nonce,
      codeVerifier,
      returnTo,
      prompt: prompt || null,
      locale: locale || null,
      exp: now() + OAUTH_TTL_SECONDS * 1000,
    };

    const authorizeUrl = await oidc.buildAuthorizeUrl({
      state,
      nonce,
      codeChallenge: await pkceChallenge(codeVerifier),
      prompt,
      locale,
    });
    return redirect(authorizeUrl, [await oauthCookieHeader(transaction, config)]);
  }

  async function callback(request, cookies) {
    const url = new URL(request.url);
    const transaction = await readOAuthTransaction(cookies, config, now());
    const clear = [clearOAuthHeader()];
    const fail = (reason) => redirect(storefrontUrl(config, config.dashboardPath, { cd_auth_error: reason }), clear);

    if (!transaction) return fail('expired');
    if (!safeEqual(url.searchParams.get('state'), transaction.state)) return fail('state');

    const error = url.searchParams.get('error');
    if (error) {
      // Silent sign-in found no Shopify session: start an interactive sign-in.
      if (transaction.prompt === 'none' && SILENT_LOGIN_ERRORS.has(error)) {
        const retry = new URL('/auth/login', config.publicBaseUrl);
        retry.searchParams.set('return_to', transaction.returnTo);
        if (transaction.locale) retry.searchParams.set('locale', transaction.locale);
        return redirect(retry.toString(), clear);
      }
      return fail(error === 'access_denied' ? 'denied' : 'failed');
    }

    const code = url.searchParams.get('code');
    if (!code) return fail('failed');

    try {
      const tokens = await oidc.exchangeCode({ code, codeVerifier: transaction.codeVerifier });
      const claims = await oidc.verifyIdToken(tokens.id_token, transaction.nonce, now());
      const session = createSession(tokens, claims, now());
      const cookieHeaders = [...clear, ...(await sessionCookieHeaders(session, config, now()))];
      return redirect(storefrontUrl(config, transaction.returnTo), cookieHeaders);
    } catch (err) {
      log.error('OAuth callback failed', { message: err.message, code: err.code, status: err.status });
      return fail('failed');
    }
  }

  async function logout(request, cookies) {
    // CSRF: the logout form posts from the storefront, so require its Origin.
    if (!allowedOrigin(request, config)) {
      return json(403, { error: 'forbidden' });
    }
    const session = await readSession(cookies, config, Number.NEGATIVE_INFINITY);
    const cookieHeaders = [...clearSessionHeaders(), clearOAuthHeader()];
    if (!session?.idt) return redirect(config.postLogoutRedirectUri, cookieHeaders);
    try {
      return redirect(await oidc.buildLogoutUrl(session.idt), cookieHeaders);
    } catch (err) {
      log.error('Logout URL failed', { message: err.message });
      return redirect(config.postLogoutRedirectUri, cookieHeaders);
    }
  }

  // Returns a session with a usable access token, refreshing when it is about
  // to expire. `cookies` collects Set-Cookie headers for the response.
  async function activeSession(cookies, setCookies, { forceRefresh = false } = {}) {
    let session = await readSession(cookies, config, now());
    if (!session) {
      if (hasSessionCookie(cookies)) setCookies.push(...clearSessionHeaders());
      return null;
    }
    if (forceRefresh || session.atExp - now() < REFRESH_MARGIN_MS) {
      if (!session.rt) {
        setCookies.push(...clearSessionHeaders());
        return null;
      }
      try {
        const tokens = await oidc.refresh(session.rt);
        session = updateSessionTokens(session, tokens, now());
        setCookies.push(...(await sessionCookieHeaders(session, config, now())));
      } catch (err) {
        log.warn('Token refresh failed', { message: err.message, code: err.code, status: err.status });
        setCookies.push(...clearSessionHeaders());
        return null;
      }
    }
    return session;
  }

  async function sessionStatus(request, cookies, origin) {
    const setCookies = [];
    const session = await activeSession(cookies, setCookies);
    if (!session) return json(401, { authenticated: false }, { origin, cookies: setCookies });
    return json(200, { authenticated: true }, { origin, cookies: setCookies });
  }

  async function readJsonBody(request) {
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.toLowerCase().startsWith('application/json')) throw new ValidationError('Expected JSON');
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) throw new ValidationError('Request too large');
    try {
      return JSON.parse(raw);
    } catch {
      throw new ValidationError('Invalid JSON');
    }
  }

  async function graphql(request, cookies, origin) {
    let operation;
    let variables;
    try {
      const body = await readJsonBody(request);
      operation = OPERATIONS[body?.operation];
      if (!operation || !Object.hasOwn(OPERATIONS, body.operation)) throw new ValidationError('Unknown operation');
      variables = operation.variables(body.variables);
    } catch (err) {
      if (err instanceof ValidationError) return json(400, { error: 'invalid_request', message: err.message }, { origin });
      throw err;
    }

    const setCookies = [];
    let session = await activeSession(cookies, setCookies);
    if (!session) return json(401, { error: 'unauthenticated' }, { origin, cookies: setCookies });

    let response = await oidc.graphql(session.at, operation.query, variables);
    if (response.status === 401) {
      // Token revoked or expired early: refresh once and retry.
      session = await activeSession(cookies, setCookies, { forceRefresh: true });
      if (!session) return json(401, { error: 'unauthenticated' }, { origin, cookies: setCookies });
      response = await oidc.graphql(session.at, operation.query, variables);
      if (response.status === 401) {
        setCookies.push(...clearSessionHeaders());
        return json(401, { error: 'unauthenticated' }, { origin, cookies: setCookies });
      }
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '2';
      return json(429, { error: 'rate_limited', retryAfter: Number(retryAfter) || 2 }, {
        origin,
        cookies: setCookies,
        headers: { 'Retry-After': retryAfter },
      });
    }
    if (!response.ok) {
      log.error('Customer Account API error', { status: response.status });
      return json(502, { error: 'upstream_error' }, { origin, cookies: setCookies });
    }

    const result = await response.json();
    const errors = Array.isArray(result.errors) ? result.errors : [];
    if (errors.some((error) => error?.extensions?.code === 'THROTTLED')) {
      return json(429, { error: 'rate_limited', retryAfter: 2 }, { origin, cookies: setCookies, headers: { 'Retry-After': '2' } });
    }
    return json(
      200,
      {
        data: result.data ?? null,
        errors: errors.map((error) => ({ message: String(error?.message || 'Error'), path: error?.path || null })),
      },
      { origin, cookies: setCookies }
    );
  }

  return async function handle(request) {
    const url = new URL(request.url);
    const cookies = parseCookies(request.headers.get('Cookie'));
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/auth/login' && request.method === 'GET') return await login(request);
      if (path === '/auth/callback' && request.method === 'GET') return await callback(request, cookies);
      if (path === '/auth/logout' && request.method === 'POST') return await logout(request, cookies);

      if (path === '/api/session' || path === '/api/graphql') {
        const origin = allowedOrigin(request, config);
        if (!origin) return json(403, { error: 'forbidden' });
        if (request.method === 'OPTIONS') {
          return new Response(null, {
            status: 204,
            headers: makeHeaders({
              ...corsHeaders(origin),
              'Access-Control-Allow-Methods': 'GET, POST',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Max-Age': '600',
            }),
          });
        }
        if (path === '/api/session' && request.method === 'GET') return await sessionStatus(request, cookies, origin);
        if (path === '/api/graphql' && request.method === 'POST') return await graphql(request, cookies, origin);
        return json(405, { error: 'method_not_allowed' }, { origin });
      }

      return json(404, { error: 'not_found' });
    } catch (err) {
      log.error('Unhandled error', { message: err.message, status: err.status });
      if (path.startsWith('/auth/')) {
        return redirect(storefrontUrl(config, config.dashboardPath, { cd_auth_error: 'failed' }));
      }
      const origin = allowedOrigin(request, config);
      const status = err instanceof OAuthError ? 502 : 500;
      return json(status, { error: 'server_error' }, { origin });
    }
  };
}
