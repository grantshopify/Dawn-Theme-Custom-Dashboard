// Netlify Functions (v2) entry point for the customer dashboard auth service.

import { loadConfig } from '../../src/config.mjs';
import { createOidcClient } from '../../src/oidc.mjs';
import { createRouter } from '../../src/router.mjs';

let router;

function getRouter() {
  if (!router) {
    const config = loadConfig(process.env);
    router = createRouter({ config, oidc: createOidcClient(config) });
  }
  return router;
}

export default async function handler(request) {
  let handle;
  try {
    handle = getRouter();
  } catch (err) {
    // Misconfiguration: log the variable names involved, never their values.
    console.error('Auth service configuration error:', err.message);
    return new Response(JSON.stringify({ error: 'service_unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  return handle(request);
}

export const config = {
  path: ['/auth/*', '/api/*'],
};
