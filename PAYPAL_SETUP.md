# PayPal Checkout setup

> ## ⚠️ READ THIS FIRST
>
> PayPal's [Acceptable Use Policy](https://www.paypal.com/us/legalhub/acceptableuse-full) explicitly prohibits selling research peptides ("drugs and drug paraphernalia / controlled substances and pharmaceuticals without proper authorization"). **PayPal will almost certainly freeze the account within weeks of going live.** When it happens:
>
> - All funds are held for 180 days during their review
> - Recent transactions are reversed via chargeback
> - You're permanently banned from the platform
>
> **Mitigations if you proceed:**
> 1. Open a PayPal Business account you do NOT depend on for cash flow
> 2. Withdraw payouts daily — don't let balance accumulate
> 3. Have Stripe or Authorize.net ready as a fallback the day PayPal freezes
> 4. Don't link a bank account you need access to (PayPal can lien it during disputes)
>
> This isn't speculation — search "PayPal peptides frozen funds" in any vendor community. You've been warned. Continuing with setup below.

---

## Setup (≈15 minutes once the warning is acknowledged)

### 1. Create PayPal Developer credentials

Go to <https://developer.paypal.com> → sign in with your PayPal Business account.

**Apps & Credentials → Live → Create App**:
- App name: `pepguide-website`
- App type: Merchant

You'll get two values:
- **Client ID** — `Ae…` (public-safe — goes in the SDK URL)
- **Secret** — `EL…` (server-only — never commit to git)

Switch to **Sandbox** in the same dashboard if you want to test first — it gives you a fake test PayPal account + fake buyer accounts to make practice purchases without moving real money.

### 2. Add credentials to Vercel

Vercel project → **Settings → Environment Variables** → add three:

| Name | Value | Notes |
|---|---|---|
| `PAYPAL_CLIENT_ID` | your `Ae…` Client ID | sent to the frontend via /api/paypal-config |
| `PAYPAL_CLIENT_SECRET` | your `EL…` Secret | server only — used to mint OAuth tokens |
| `PAYPAL_ENV` | `sandbox` while testing, `live` once ready | defaults to `sandbox` if unset |

Redeploy after adding (Vercel triggers this automatically).

### 3. Test the full flow

1. With `PAYPAL_ENV=sandbox`: add items to cart on the live site, open the drawer.
2. Click the PayPal button. A PayPal popup opens.
3. Sign in with one of your sandbox **personal** test accounts (created at developer.paypal.com → Sandbox → Accounts).
4. Approve the purchase. You'll redirect to `/success.html?order=…` and the cart will clear.
5. Verify the order in **developer.paypal.com → Sandbox → Activity** AND **business test account → Activity**.

When that works end-to-end, set `PAYPAL_ENV=live` and you're taking real payments.

### 4. Fulfillment

PayPal Business dashboard → **Activity** is your order book. Each captured payment shows:
- Buyer name + shipping address
- Items + subtotal
- Capture ID (the actual money movement)

Mark fulfilled in the PayPal dashboard after you ship.

## What's on the frontend right now

- `assets/js/cart.js` lazy-loads the PayPal SDK the first time the cart drawer is opened with items
- It hits `/api/paypal-config` to get your `PAYPAL_CLIENT_ID`
- Renders PayPal Smart Buttons (PayPal, Venmo, Pay Later) into `#paypal-button-container`
- `createOrder` calls `/api/paypal-create-order` with the cart items → server creates the PayPal order with server-side amounts
- `onApprove` calls `/api/paypal-capture-order` → server captures the payment
- On success: redirects to `/success.html?order=<paypal-order-id>` and clears the cart

If the env vars are missing, the cart shows a "PayPal is not configured yet" notice and doesn't render the buttons — no broken UX.

## When (not if) PayPal freezes the account

You'll get an email like *"We've decided to permanently limit your account"*. From that moment:
1. The PayPal buttons in the cart will fail with an error message
2. New customers can't check out
3. Existing pending funds are held for 180 days

**Immediate steps:**
1. Email any open-order customers a refund / shipping update
2. Switch to a different processor — the Stripe integration we built originally lives in git history (`git log --all --grep=Stripe`); cherry-picking those commits brings it back, then just set `STRIPE_SECRET_KEY` in Vercel
3. Or wire up Authorize.net / Coinbase Commerce — both are friendlier to this category

This is the expected lifecycle of PayPal in this category. Plan for it.
