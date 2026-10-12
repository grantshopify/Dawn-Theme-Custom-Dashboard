// Reads and validates environment configuration once per cold start.

export class ConfigError extends Error {}

const REQUIRED = [
  'SHOPIFY_CLIENT_ID',
  'SHOPIFY_CLIENT_SECRET',
  'SHOPIFY_SHOP_DOMAIN',
  'STOREFRONT_URL',
  'PUBLIC_BASE_URL',
  'SESSION_SECRET',
];

function httpsOrigin(name, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError(`${name} must be an absolute URL`);
  }
  if (url.protocol !== 'https:') throw new ConfigError(`${name} must use https`);
  return url.origin;
}

export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length) throw new ConfigError(`Missing environment variables: ${missing.join(', ')}`);

  if (env.SESSION_SECRET.length < 32) throw new ConfigError('SESSION_SECRET must be at least 32 characters');

  const shopDomain = env.SHOPIFY_SHOP_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!/^[a-z0-9.-]+$/i.test(shopDomain)) throw new ConfigError('SHOPIFY_SHOP_DOMAIN must be a bare hostname');

  const storefrontOrigin = httpsOrigin('STOREFRONT_URL', env.STOREFRONT_URL);
  const publicBaseUrl = httpsOrigin('PUBLIC_BASE_URL', env.PUBLIC_BASE_URL);

  const extraOrigins = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => httpsOrigin('ALLOWED_ORIGINS', value));

  const dashboardPath = env.DASHBOARD_PATH || '/pages/dashboard';
  if (!dashboardPath.startsWith('/') || dashboardPath.startsWith('//')) {
    throw new ConfigError('DASHBOARD_PATH must be a relative path');
  }

  const maxAgeDays = Number(env.SESSION_MAX_AGE_DAYS || 14);
  if (!Number.isFinite(maxAgeDays) || maxAgeDays <= 0 || maxAgeDays > 90) {
    throw new ConfigError('SESSION_MAX_AGE_DAYS must be between 1 and 90');
  }

  return Object.freeze({
    clientId: env.SHOPIFY_CLIENT_ID,
    clientSecret: env.SHOPIFY_CLIENT_SECRET,
    shopDomain,
    storefrontOrigin,
    publicBaseUrl,
    callbackUrl: `${publicBaseUrl}/auth/callback`,
    allowedOrigins: new Set([storefrontOrigin, ...extraOrigins]),
    dashboardPath,
    postLogoutRedirectUri: env.POST_LOGOUT_REDIRECT_URI || `${storefrontOrigin}/account/logout`,
    sessionSecrets: [env.SESSION_SECRET, env.SESSION_SECRET_PREVIOUS].filter(Boolean),
    sessionMaxAgeSeconds: Math.round(maxAgeDays * 86400),
    userAgent: 'dawn-customer-dashboard-auth/1.0',
  });
}
