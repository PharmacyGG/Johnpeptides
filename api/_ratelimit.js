/* =================================================================
   Per-IP token-bucket rate limiter (in-memory)
   ----------------------------------------------------------------
   Lightweight defense-in-depth against abuse on `/api/*` endpoints.
   No external store, no npm deps — uses a module-level Map keyed
   by IP. Each Vercel function instance maintains its own bucket
   set, so a horizontally-scaled attack could effectively multiply
   the limit by however many warm instances Vercel has spun up;
   that's acceptable for the current threat model (script-kid
   abuse, not state-actor).

   Usage:
     const { rateLimit } = require('./_ratelimit');
     if (rateLimit(req, res, { tokens: 5, windowSec: 60 })) return;

   Returns true if the request was rate-limited (and the response
   has already been written). Returns false if allowed.
   ================================================================= */

const BUCKETS = new Map();

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.toString().split(',')[0].trim();
  return (req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown').toString();
}

function rateLimit(req, res, { tokens = 5, windowSec = 60 } = {}) {
  const ip = getIp(req);
  const key = `${ip}:${tokens}:${windowSec}`;
  const now = Date.now() / 1000;
  const refillPerSec = tokens / windowSec;

  let bucket = BUCKETS.get(key);
  if (!bucket) {
    bucket = { tokens, last: now };
    BUCKETS.set(key, bucket);
  } else {
    const elapsed = now - bucket.last;
    bucket.tokens = Math.min(tokens, bucket.tokens + elapsed * refillPerSec);
    bucket.last = now;
  }

  // Opportunistic cleanup — kicks in when the Map gets big and randomly
  // 1% of the time. Keeps memory bounded without a setInterval (which
  // would prevent the function instance from being recycled).
  if (BUCKETS.size > 1000 && Math.random() < 0.01) {
    for (const [k, v] of BUCKETS) {
      if (now - v.last > 600) BUCKETS.delete(k);
    }
  }

  if (bucket.tokens < 1) {
    res.setHeader('Retry-After', Math.ceil(windowSec));
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
    return true;
  }
  bucket.tokens -= 1;
  return false;
}

module.exports = { rateLimit };
