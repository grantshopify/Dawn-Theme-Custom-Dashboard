// Small Web Crypto helpers: random values, PKCE, and authenticated encryption
// for the stateless session cookie (AES-256-GCM with HKDF-derived keys).

const { subtle } = globalThis.crypto;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function base64UrlEncode(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

export function base64UrlDecode(value) {
  return new Uint8Array(Buffer.from(value, 'base64url'));
}

export function randomToken(byteLength = 32) {
  return base64UrlEncode(globalThis.crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function pkceChallenge(verifier) {
  const digest = await subtle.digest('SHA-256', encoder.encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

// Constant-time comparison for short secrets such as `state` and `nonce`.
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

const keyCache = new Map();

async function deriveKey(secret, purpose) {
  const cacheKey = `${purpose}\u0000${secret}`;
  if (!keyCache.has(cacheKey)) {
    const material = await subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey']);
    const key = subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('customer-dashboard/v1'), info: encoder.encode(purpose) },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    keyCache.set(cacheKey, key);
  }
  return keyCache.get(cacheKey);
}

// Encrypts a JSON value. `purpose` separates keys (session vs OAuth transaction)
// and is bound as additional authenticated data.
export async function seal(value, secrets, purpose) {
  const key = await deriveKey(secrets[0], purpose);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(purpose) },
    key,
    encoder.encode(JSON.stringify(value))
  );
  const out = new Uint8Array(iv.length + ciphertext.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ciphertext), iv.length);
  return base64UrlEncode(out);
}

// Returns the decrypted value, or null if it was tampered with or uses an unknown key.
export async function unseal(token, secrets, purpose) {
  if (typeof token !== 'string' || token.length < 24) return null;
  let bytes;
  try {
    bytes = base64UrlDecode(token);
  } catch {
    return null;
  }
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  for (const secret of secrets) {
    try {
      const key = await deriveKey(secret, purpose);
      const plaintext = await subtle.decrypt(
        { name: 'AES-GCM', iv, additionalData: encoder.encode(purpose) },
        key,
        ciphertext
      );
      return JSON.parse(decoder.decode(plaintext));
    } catch {
      // Try the next secret (key rotation).
    }
  }
  return null;
}
