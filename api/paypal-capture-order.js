/* POST /api/paypal-capture-order
   Body: { orderId: "<paypal-order-id>" }
   Returns: { status, captureId, payerEmail, amount } on success
   ---
   Called by the frontend after the buyer approves the payment.
   This is where money actually moves from buyer → merchant. */
const { paypalFetch } = require('./_paypal');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  try {
    const result = await paypalFetch(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      { method: 'POST', body: '{}' }
    );
    const cap = result.purchase_units?.[0]?.payments?.captures?.[0];
    return res.status(200).json({
      status: result.status,
      captureId: cap?.id,
      payerEmail: result.payer?.email_address,
      amount: cap?.amount,
    });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ error: err.message, details: err.details });
  }
};
