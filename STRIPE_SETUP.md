# Stripe Checkout setup

The store frontend is built — cart works, drawer slides, items persist in
localStorage. The only thing missing to start taking real card payments is
your Stripe account + one env var on Vercel. Walk through this once and
you're live.

## 1. Create a Stripe account

Go to <https://stripe.com> → Sign up.

When asked about your business, describe it accurately:
> "E-commerce store selling laboratory research compounds (peptides) to
> qualified researchers and institutional buyers. All products are
> explicitly labeled 'Research Use Only — Not for human or veterinary
> consumption.'"

This matters. Vague descriptions risk Stripe pausing payouts later when
they figure out the category. Approval typically takes 1–3 business days
for research chemicals.

## 2. Grab your API keys

Stripe dashboard → **Developers → API keys**

Copy two values:
- **Publishable key** — `pk_live_…` (or `pk_test_…` while testing)
- **Secret key** — `sk_live_…` (or `sk_test_…`)

Use **test keys first** while wiring everything up — they let you place
real-looking orders using card `4242 4242 4242 4242` without moving real
money. Swap to live keys when you're ready to launch.

## 3. Add the secret key to Vercel

In the Vercel dashboard for this project → **Settings → Environment
Variables** → Add:

| Name | Value | Environment |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` or `sk_live_…` | All |

Redeploy after adding (Vercel does this automatically).

That's the only required env var. The frontend doesn't need the publishable
key for Stripe Checkout (it redirects to a Stripe-hosted page).

## 4. (Optional but recommended) Create Products + Prices in Stripe

Right now the checkout sends product names + prices inline from
`assets/js/products.js`. This works but Stripe won't have records of your
catalog — every sale will show up as a one-off charge.

The better setup: create each compound as a Product in Stripe, attach a
Price, and paste the `price_…` ID into `assets/js/products.js`.

In Stripe dashboard → **Products → + Add product**, for each item:

| Field | Example for GHK-Cu |
|---|---|
| Name | `GHK-Cu 100mg` |
| Description | `Copper peptide, research use only` |
| Price | `$70.00` USD, one-time |

After creating, grab the Price ID (looks like `price_1AbcXyz…`) and paste
it into `products.js` next to `stripePriceId: ''`.

## 5. Configure shipping rates

Stripe dashboard → **Shipping → Add rate** (e.g. `$10 flat US shipping`).
Copy the resulting `shr_…` ID into `api/create-checkout-session.js` where
the comment says `// shipping_options: [{ shipping_rate: 'shr_…' }]` —
uncomment and paste.

## 6. (Optional) Set up tax

Stripe Tax handles US sales tax automatically. Dashboard → **Tax → Settings**
→ enable. Then in `api/create-checkout-session.js` change
`automatic_tax: { enabled: false }` → `enabled: true`.

## 7. Test the full flow

1. With test keys: add items to cart on the live site, click Checkout
2. On Stripe's hosted page, use card `4242 4242 4242 4242`, any future
   expiry, any CVC, any ZIP
3. You'll redirect back to `/success.html` and the cart will clear
4. Verify the test order in **Stripe Dashboard → Payments**

When that works, swap `STRIPE_SECRET_KEY` for the live key and you're live.

## Fulfillment

The Stripe dashboard is your order book. Every paid checkout sends you:
- An email receipt
- A row under **Payments**
- The customer's shipping address (under that row's details)

Mark fulfilled in the Stripe dashboard after you ship — that triggers a
shipping notification email to the customer.

## Future: webhook for inventory / external systems

When you outgrow "read the dashboard", add a Stripe webhook at
`/api/stripe-webhook` to push orders into Airtable / a Google Sheet /
your fulfillment system. Not needed for v1.
