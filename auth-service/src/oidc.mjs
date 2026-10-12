// Customer Account API OAuth 2.0 / OpenID Connect client (confidential client).
// Endpoints come from Shopify's discovery documents rather than being hardcoded:
//   https://{shop}/.well-known/openid-configuration
//   https://{shop}/.well-known/customer-account-api

import { base64UrlDecode, safeEqual } from './crypto.mjs';

export const SCOPES = 'openid email customer-account-api:full';
const DISCOVERY_TTL_MS = 60 * 60 * 1000;
const CLOCK_SKEW_SECONDS = 120;

export class OAuthError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const ALGORITHMS = {
  RS256: {
    importParams: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    verifyParams: { name: 'RSASSA-PKCS1-v1_5' },
  },
  ES256: {
    importParams: { name: 'ECDSA', namedCurve: 'P-256' },
    verifyParams: { name: 'ECDSA', hash: 'SHA-256' },
  },
};

function decodeJson(segment) {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(segment)));
}

export function createOidcClient(config, fetchImpl = globalThis.fetch) {
  let discovery = null;
  let jwks = null;

  async function getJson(url) {
    const response = await fetchImpl(url, { headers: { Accept: 'application/json', 'User-Agent': config.userAgent } });
    if (!response.ok) throw new OAuthError(`Discovery request failed (${response.status})`, { status: response.status });
    return response.json();
  }

  async function getDiscovery() {
    if (discovery && discovery.fetchedAt > Date.now() - DISCOVERY_TTL_MS) return discovery;
    const base = `https://${config.shopDomain}`;
    const [openid, api] = await Promise.all([
      getJson(`${base}/.well-known/openid-configuration`),
      getJson(`${base}/.well-known/customer-account-api`),
    ]);
    for (const key of ['issuer', 'authorization_endpoint', 'token_endpoint', 'end_session_endpoint', 'jwks_uri']) {
      if (!openid[key]) throw new OAuthError(`Discovery document missing ${key}`);
    }
    if (!api.graphql_api) throw new OAuthError('Customer Account API discovery missing graphql_api');
    discovery = { ...openid, graphql_api: api.graphql_api, fetchedAt: Date.now() };
    return discovery;
  }

  async function getSigningKey(kid, forceRefresh = false) {
    const { jwks_uri: jwksUri } = await getDiscovery();
    if (!jwks || forceRefresh || jwks.fetchedAt < Date.now() - DISCOVERY_TTL_MS) {
      const body = await getJson(jwksUri);
      jwks = { keys: Array.isArray(body.keys) ? body.keys : [], fetchedAt: Date.now() };
    }
    return jwks.keys.find((key) => key.kid === kid) || null;
  }

  async function buildAuthorizeUrl({ state, nonce, codeChallenge, prompt, locale }) {
    const { authorization_endpoint: endpoint } = await getDiscovery();
    const url = new URL(endpoint);
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', config.callbackUrl);
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    if (prompt === 'none') url.searchParams.set('prompt', 'none');
    if (locale) url.searchParams.set('locale', locale);
    return url.toString();
  }

  async function tokenRequest(params) {
    const { token_endpoint: endpoint } = await getDiscovery();
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${credentials}`,
        'User-Agent': config.userAgent,
      },
      body: new URLSearchParams({ client_id: config.clientId, ...params }),
    });
    let body = {};
    try {
      body = await response.json();
    } catch {
      // Non-JSON error body; handled below.
    }
    if (!response.ok || !body.access_token) {
      throw new OAuthError(`Token request failed (${response.status})`, {
        status: response.status,
        code: body.error || 'token_error',
      });
    }
    return body;
  }

  function exchangeCode({ code, codeVerifier }) {
    return tokenRequest({
      grant_type: 'authorization_code',
      redirect_uri: config.callbackUrl,
      code,
      code_verifier: codeVerifier,
    });
  }

  function refresh(refreshToken) {
    return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  // Verifies the ID token signature against Shopify's JWKS and checks
  // issuer, audience, expiry and the nonce bound to this login attempt.
  async function verifyIdToken(idToken, expectedNonce, now = Date.now()) {
    if (typeof idToken !== 'string') throw new OAuthError('Missing id_token');
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new OAuthError('Malformed id_token');
    const header = decodeJson(parts[0]);
    const payload = decodeJson(parts[1]);
    const algorithm = ALGORITHMS[header.alg];
    if (!algorithm) throw new OAuthError(`Unsupported id_token alg ${header.alg}`);

    let jwk = await getSigningKey(header.kid);
    if (!jwk) jwk = await getSigningKey(header.kid, true);
    if (!jwk) throw new OAuthError('Unknown id_token signing key');

    const key = await globalThis.crypto.subtle.importKey('jwk', jwk, algorithm.importParams, false, ['verify']);
    const valid = await globalThis.crypto.subtle.verify(
      algorithm.verifyParams,
      key,
      base64UrlDecode(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    if (!valid) throw new OAuthError('Invalid id_token signature');

    const { issuer } = await getDiscovery();
    const nowSeconds = now / 1000;
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (payload.iss !== issuer) throw new OAuthError('id_token issuer mismatch');
    if (!audience.includes(config.clientId)) throw new OAuthError('id_token audience mismatch');
    if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SECONDS < nowSeconds) {
      throw new OAuthError('id_token expired');
    }
    if (!safeEqual(payload.nonce, expectedNonce)) throw new OAuthError('id_token nonce mismatch');
    return payload;
  }

  async function buildLogoutUrl(idToken) {
    const { end_session_endpoint: endpoint } = await getDiscovery();
    const url = new URL(endpoint);
    url.searchParams.set('id_token_hint', idToken);
    url.searchParams.set('post_logout_redirect_uri', config.postLogoutRedirectUri);
    return url.toString();
  }

  async function graphql(accessToken, query, variables) {
    const { graphql_api: endpoint } = await getDiscovery();
    return fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: accessToken,
        'User-Agent': config.userAgent,
      },
      body: JSON.stringify({ query, variables }),
    });
  }

  return { getDiscovery, buildAuthorizeUrl, exchangeCode, refresh, verifyIdToken, buildLogoutUrl, graphql };
}
