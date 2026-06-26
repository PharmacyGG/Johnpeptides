/* Shared PayPal REST helpers — used by paypal-create-order and
   paypal-capture-order. Avoids the @paypal/* npm SDK so we have zero
   dependencies; the REST API is small enough to talk to directly. */

const ENV = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
const BASE =
  ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

let _tokenCache = { value: '', expiresAt: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (_tokenCache.value && _tokenCache.expiresAt > now + 30_000) {
    return _tokenCache.value;
  }
  const id  = process.env.PAYPAL_CLIENT_ID;
  const sec = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !sec) {
    throw new Error(
      'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set in env. ' +
        'Add them in Vercel project settings.'
    );
  }
  const auth = Buffer.from(`${id}:${sec}`).toString('base64');
  const resp = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`PayPal auth failed: ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  _tokenCache = {
    value: data.access_token,
    expiresAt: now + (data.expires_in || 0) * 1000,
  };
  return data.access_token;
}

async function paypalFetch(path, init = {}) {
  const token = await getAccessToken();
  const resp = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await resp.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; }
  catch { body = { raw: text }; }
  if (!resp.ok) {
    const err = new Error(body?.message || `PayPal ${resp.status}`);
    err.status = resp.status;
    err.details = body;
    throw err;
  }
  return body;
}

module.exports = { BASE, ENV, getAccessToken, paypalFetch };
