/* POST /api/paypal-create-order
   Body: { items: [{ id, qty }] }     ← priceCents is IGNORED
   Returns: { id: "<paypal-order-id>" }
   ----------------------------------------------------------------
   Server-side price authority: all prices are looked up from
   api/_catalog.js by product ID. Any priceCents the client sends
   is discarded — prevents a buyer from tampering with the cart in
   DevTools and checking out for $0.01.
*/
const { paypalFetch } = require('./_paypal');
const { rateLimit }   = require('./_ratelimit');
const CATALOG = require('./_catalog');

const MAX_ITEMS = 20;     // refuse comically large carts
const MAX_QTY   = 99;     // per-line cap

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // 20/min/IP — generous for legitimate cart adjustments + retries, but
  // closes the abuse vector of spamming PayPal order-creation calls.
  if (rateLimit(req, res, { tokens: 20, windowSec: 60 })) return;

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items in cart' });
  }
  if (items.length > MAX_ITEMS) {
    return res.status(400).json({ error: 'Too many items in cart' });
  }

  // Resolve every line item against the SERVER catalog. Unknown SKU = reject.
  const resolved = [];
  for (const raw of items) {
    if (!raw || typeof raw.id !== 'string') {
      return res.status(400).json({ error: 'Invalid item payload' });
    }
    const product = CATALOG[raw.id];
    if (!product) {
      return res.status(400).json({ error: `Unknown product: ${raw.id}` });
    }
    const qty = Math.max(1, Math.min(MAX_QTY, parseInt(raw.qty, 10) || 0));
    if (qty < 1) return res.status(400).json({ error: 'Invalid quantity' });
    resolved.push({ id: raw.id, name: product.name, priceCents: product.priceCents, qty });
  }

  const lineItems = resolved.map((i) => ({
    name: i.name.slice(0, 127),
    sku: i.id.slice(0, 127),
    quantity: String(i.qty),
    unit_amount: {
      currency_code: 'USD',
      value: (i.priceCents / 100).toFixed(2),
    },
    category: 'PHYSICAL_GOODS',
  }));
  const itemTotal = resolved
    .reduce((sum, i) => sum + (i.priceCents * i.qty) / 100, 0)
    .toFixed(2);

  try {
    const order = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: 'PepGuide research compounds (Research Use Only)',
            amount: {
              currency_code: 'USD',
              value: itemTotal,
              breakdown: {
                item_total: { currency_code: 'USD', value: itemTotal },
              },
            },
            items: lineItems,
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              shipping_preference: 'GET_FROM_FILE',
              user_action: 'PAY_NOW',
              brand_name: 'PepGuide',
            },
          },
        },
      }),
    });
    return res.status(200).json({ id: order.id });
  } catch (err) {
    // Don't leak PayPal internals (debug_id, error code names) to the client.
    console.error('[paypal-create] error:', err.status, err.message, err.details);
    return res.status(err.status || 500).json({ error: err.message });
  }
};
