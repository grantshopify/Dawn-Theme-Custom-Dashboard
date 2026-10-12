// Cookie parsing/serialisation with chunking for values larger than one cookie.
// All cookies use the `__Host-` prefix: Secure, Path=/, no Domain, so they are
// bound to the auth subdomain only and never sent to the storefront itself.

const CHUNK_SIZE = 3800;
export const MAX_CHUNKS = 4;

export function parseCookies(header) {
  const cookies = new Map();
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name && !cookies.has(name)) cookies.set(name, value);
  }
  return cookies;
}

export function serializeCookie(name, value, { maxAge, sameSite = 'Strict' } = {}) {
  const parts = [`${name}=${value}`, 'Path=/', 'Secure', 'HttpOnly', `SameSite=${sameSite}`];
  if (maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return parts.join('; ');
}

export function clearCookie(name, sameSite = 'Strict') {
  return serializeCookie(name, '', { maxAge: 0, sameSite });
}

export function readChunked(cookies, baseName) {
  let value = '';
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const chunk = cookies.get(`${baseName}.${i}`);
    if (chunk === undefined) break;
    value += chunk;
  }
  return value || null;
}

export function writeChunked(baseName, value, options) {
  const chunks = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE));
  if (chunks.length > MAX_CHUNKS) throw new Error('Session cookie too large');
  const headers = chunks.map((chunk, i) => serializeCookie(`${baseName}.${i}`, chunk, options));
  for (let i = chunks.length; i < MAX_CHUNKS; i++) headers.push(clearCookie(`${baseName}.${i}`, options?.sameSite));
  return headers;
}

export function clearChunked(baseName, sameSite) {
  return Array.from({ length: MAX_CHUNKS }, (_, i) => clearCookie(`${baseName}.${i}`, sameSite));
}

export function hasChunked(cookies, baseName) {
  return cookies.has(`${baseName}.0`);
}
