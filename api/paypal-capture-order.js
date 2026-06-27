/* POST /api/paypal-capture-order
   Body: { orderId: "<paypal-order-id>" }
   Returns: { status, captureId, payerEmail, amount } on success
   ---
   Called by the frontend after the buyer approves the payment.
   This is where money actually moves from buyer → merchant.

   Side effects on a successful capture (best-effort, non-blocking):
     1. Send an internal alert to OWNER_EMAIL with full order detail
        — this is our ONLY persistence layer until we add a DB.
     2. Send a confirmation/receipt to the payer's email address.
*/
const { paypalFetch } = require('./_paypal');
const { rateLimit }   = require('./_ratelimit');
const { sendMail }    = require('./_mail');

// PayPal order IDs are upper-alphanumeric, typically 17 chars. We're
// liberal (8-26) to cover format changes. Anything outside this is an
// attempt to abuse our function as a proxy for arbitrary PayPal API calls.
const ORDER_ID_RX = /^[A-Z0-9]{8,26}$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // 10/min/IP is comfortably above any legitimate retry/double-click pattern
  // while blocking sustained abuse of our PayPal API quota.
  if (rateLimit(req, res, { tokens: 10, windowSec: 60 })) return;

  const orderId = ((req.body || {}).orderId || '').toString();
  if (!ORDER_ID_RX.test(orderId)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  let result;
  try {
    result = await paypalFetch(
      `/v2/checkout/orders/${orderId}/capture`,
      { method: 'POST', body: '{}' }
    );
  } catch (err) {
    // Don't leak PayPal internals (debug_id, error code names) to the client.
    // Log them server-side for our own debugging.
    console.error('[paypal-capture] error:', err.status, err.message, err.details);
    return res.status(err.status || 500).json({ error: err.message });
  }

  const cap        = result.purchase_units?.[0]?.payments?.captures?.[0];
  const items      = result.purchase_units?.[0]?.items || [];
  const amount     = cap?.amount;
  const payerEmail = result.payer?.email_address;
  const payerName  = [result.payer?.name?.given_name, result.payer?.name?.surname]
    .filter(Boolean).join(' ');

  // -------- best-effort post-capture emails --------
  // Run in parallel; don't await — we don't want a slow Resend response
  // to delay the user's "Order received" page. Errors get logged in _mail.
  Promise.all([
    sendOwnerAlert({ orderId, cap, items, amount, payerEmail, payerName }),
    payerEmail ? sendCustomerReceipt({ orderId, items, amount, payerEmail, payerName }) : null,
  ]).catch((err) => console.error('[paypal-capture] mail dispatch error:', err));

  return res.status(200).json({
    status: result.status,
    captureId: cap?.id,
    payerEmail,
    amount,
  });
};

function fmtItems(items) {
  if (!items.length) return '(no line items returned by PayPal)';
  return items.map((i) => {
    const qty   = i.quantity || '1';
    const price = i.unit_amount ? `${i.unit_amount.currency_code} ${i.unit_amount.value}` : '?';
    return `  - ${i.name} (${i.sku || 'no-sku'})  ×${qty}  @ ${price}`;
  }).join('\n');
}

function sendOwnerAlert({ orderId, cap, items, amount, payerEmail, payerName }) {
  const owner = process.env.OWNER_EMAIL;
  if (!owner) return null;
  const ts = new Date().toISOString();
  return sendMail({
    to: owner,
    replyTo: payerEmail,
    subject: `New PepGuide order: ${payerEmail || 'unknown'} (${amount?.currency_code || ''} ${amount?.value || '?'})`,
    text: [
      `A new PepGuide order has been captured by PayPal.`,
      ``,
      `Order ID:      ${orderId}`,
      `Capture ID:    ${cap?.id || '(unknown)'}`,
      `Capture state: ${cap?.status || '(unknown)'}`,
      `Timestamp:     ${ts}`,
      ``,
      `Payer:         ${payerName || '(unknown)'}`,
      `Payer email:   ${payerEmail || '(unknown)'}`,
      ``,
      `Total:         ${amount?.currency_code || ''} ${amount?.value || '?'}`,
      ``,
      `Line items:`,
      fmtItems(items),
      ``,
      `Reply directly to this email to reach the buyer.`,
    ].join('\n'),
  });
}

function sendCustomerReceipt({ orderId, items, amount, payerEmail, payerName }) {
  return sendMail({
    to: payerEmail,
    subject: `Your PepGuide order is confirmed — ${orderId}`,
    text: [
      `Hi${payerName ? ' ' + payerName.split(' ')[0] : ''},`,
      ``,
      `Thanks for your order. Your payment has been received and we'll`,
      `dispatch your compounds within 1 business day. You'll get a tracking`,
      `link once the package leaves our facility.`,
      ``,
      `Order:   ${orderId}`,
      `Total:   ${amount?.currency_code || ''} ${amount?.value || '?'}`,
      ``,
      `Items:`,
      fmtItems(items),
      ``,
      `Reminder: all compounds are sold for laboratory research use only.`,
      `Not for human or veterinary consumption.`,
      ``,
      `Questions? Reply to this email or contact support@pepguidance.com.`,
      ``,
      `— PepGuide`,
      `pepguidance.com`,
    ].join('\n'),
  });
}
