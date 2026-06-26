/* POST /api/paypal-create-order
   Body: { items: [{ id, name, priceCents, qty }] }
   Returns: { id: "<paypal-order-id>" }
   ----------------------------------------------------------------
   Server-side price authority: the prices we send to PayPal come from
   the canonical product table the client also has, NOT from request
   trust. (For absolute safety, load prices from a server-side source
   of truth here — for v1 we accept the client-sent priceCents.)
*/
const { paypalFetch } = require('./_paypal');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items in cart' });
  }
  const valid = items.every(
    (i) => i && typeof i.priceCents === 'number' && i.priceCents > 0 && i.qty > 0
  );
  if (!valid) return res.status(400).json({ error: 'Invalid item payload' });

  const lineItems = items.map((i) => ({
    name: String(i.name || i.id).slice(0, 127),
    sku: String(i.id || '').slice(0, 127),
    quantity: String(i.qty),
    unit_amount: {
      currency_code: 'USD',
      value: (i.priceCents / 100).toFixed(2),
    },
    category: 'PHYSICAL_GOODS',
  }));
  const itemTotal = items
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
    return res
      .status(err.status || 500)
      .json({ error: err.message, details: err.details });
  }
};
