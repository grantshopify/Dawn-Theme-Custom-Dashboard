// Stateless, encrypted session storage. Nothing is persisted server-side: the
// Shopify tokens live only inside an HttpOnly cookie that browser JavaScript
// cannot read, encrypted with SESSION_SECRET.

import { seal, unseal } from './crypto.mjs';
import { clearChunked, clearCookie, hasChunked, readChunked, serializeCookie, writeChunked } from './cookies.mjs';

export const SESSION_COOKIE = '__Host-cd_session';
export const OAUTH_COOKIE = '__Host-cd_oauth';
const SESSION_PURPOSE = 'session';
const OAUTH_PURPOSE = 'oauth-transaction';
export const OAUTH_TTL_SECONDS = 600;

// Session cookie is SameSite=Strict: the storefront and auth subdomain are the
// same site, so the dashboard's fetches still carry it, but other sites cannot.
const SESSION_SAMESITE = 'Strict';
// The OAuth transaction cookie must survive the top-level redirect back from Shopify.
const OAUTH_SAMESITE = 'Lax';

export function createSession(tokens, claims, now = Date.now()) {
  return {
    v: 1,
    at: tokens.access_token,
    atExp: now + Number(tokens.expires_in || 0) * 1000,
    rt: tokens.refresh_token || null,
    idt: tokens.id_token,
    sub: claims?.sub || null,
    iat: now,
  };
}

export function updateSessionTokens(session, tokens, now = Date.now()) {
  return {
    ...session,
    at: tokens.access_token,
    atExp: now + Number(tokens.expires_in || 0) * 1000,
    rt: tokens.refresh_token || session.rt,
    idt: tokens.id_token || session.idt,
  };
}

export async function readSession(cookies, config, now = Date.now()) {
  const raw = readChunked(cookies, SESSION_COOKIE);
  if (!raw) return null;
  const session = await unseal(raw, config.sessionSecrets, SESSION_PURPOSE);
  if (!session || session.v !== 1 || typeof session.at !== 'string') return null;
  if (now - session.iat > config.sessionMaxAgeSeconds * 1000) return null;
  return session;
}

export async function sessionCookieHeaders(session, config, now = Date.now()) {
  const remaining = config.sessionMaxAgeSeconds - (now - session.iat) / 1000;
  const sealed = await seal(session, config.sessionSecrets, SESSION_PURPOSE);
  return writeChunked(SESSION_COOKIE, sealed, { maxAge: remaining, sameSite: SESSION_SAMESITE });
}

export function clearSessionHeaders() {
  return clearChunked(SESSION_COOKIE, SESSION_SAMESITE);
}

export function hasSessionCookie(cookies) {
  return hasChunked(cookies, SESSION_COOKIE);
}

export async function oauthCookieHeader(transaction, config) {
  const sealed = await seal(transaction, config.sessionSecrets, OAUTH_PURPOSE);
  return serializeCookie(OAUTH_COOKIE, sealed, { maxAge: OAUTH_TTL_SECONDS, sameSite: OAUTH_SAMESITE });
}

export async function readOAuthTransaction(cookies, config, now = Date.now()) {
  const transaction = await unseal(cookies.get(OAUTH_COOKIE), config.sessionSecrets, OAUTH_PURPOSE);
  if (!transaction || typeof transaction.exp !== 'number' || transaction.exp < now) return null;
  return transaction;
}

export function clearOAuthHeader() {
  return clearCookie(OAUTH_COOKIE, OAUTH_SAMESITE);
}
