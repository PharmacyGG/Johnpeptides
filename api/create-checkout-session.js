/* =================================================================
   POST /api/create-checkout-session   (Vercel Node serverless function)
   Body: { items: [{ id, name, priceCents, stripePriceId, qty }] }
   Returns: { url: "https://checkout.stripe.com/..." }
   ----------------------------------------------------------------
   ENV vars (set in Vercel project settings):
     STRIPE_SECRET_KEY   — your `sk_live_…` or `sk_test_…` key
     STRIPE_SUCCESS_URL  — optional; defaults to {origin}/success.html?session_id={CHECKOUT_SESSION_ID}
     STRIPE_CANCEL_URL   — optional; defaults to {origin}/cancel.html

   Item rules:
     - If `stripePriceId` is set on every item, we pass the IDs directly
       (best — uses Products + Prices managed in the Stripe dashboard).
     - If any item is missing a Price ID, we build `price_data` inline
       from `name` + `priceCents` instead (works without dashboard setup).
   ================================================================= */
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    return res.status(500).json({
      error: 'STRIPE_SECRET_KEY is not set on the server. Add it to your Vercel project env vars.',
    });
  }

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  const stripe = new Stripe(sk, { apiVersion: '2024-06-20' });

  const origin =
    req.headers.origin ||
    (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-host']
      ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}`
      : '');

  const successUrl =
    process.env.STRIPE_SUCCESS_URL ||
    `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    process.env.STRIPE_CANCEL_URL ||
    `${origin}/cancel.html`;

  // Build line items: prefer dashboard-managed Prices when available
  const lineItems = items.map((it) => {
    if (it.stripePriceId) {
      return { price: it.stripePriceId, quantity: it.qty };
    }
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: it.name,
          description: 'Research compound — not for human consumption',
        },
        unit_amount: it.priceCents,
      },
      quantity: it.qty,
    };
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      shipping_address_collection: { allowed_countries: ['US'] },
      // Add shipping rates in Stripe dashboard, then list their IDs here:
      // shipping_options: [{ shipping_rate: 'shr_…' }],
      // Mandatory research-use acknowledgement at checkout:
      custom_text: {
        submit: {
          message:
            'By placing this order I confirm I am a qualified researcher and these compounds will be used exclusively for laboratory research, NOT for human or veterinary consumption.',
        },
      },
      automatic_tax: { enabled: false },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message || 'Stripe error' });
  }
}
