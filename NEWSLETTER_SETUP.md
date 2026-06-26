# Newsletter setup (Resend, ~5 min)

The newsletter signup form is wired — when someone subscribes,
`/api/newsletter` emails you their address so you can follow up
manually. Uses Resend's free tier (3K emails/month free).

## 1. Sign up for Resend

Go to <https://resend.com> → sign up (free).

## 2. Get an API key

Resend dashboard → **API Keys** → **Create API Key**
- Name: `pepguide-site`
- Permission: Full access (or just "Sending" if you want to be strict)

Copy the `re_…` key.

## 3. (Optional but recommended) Verify your domain

Resend dashboard → **Domains** → **Add Domain** → `pepguidance.com`

Follow the DNS instructions (add 3 records — SPF, DKIM, MX). Wait
1-10 minutes for verification.

**If you skip this**: the `From` address falls back to
`onboarding@resend.dev` which works but looks unprofessional and
may land in spam. Domain verification is worth the 5 minutes.

Once verified, use a sender like `noreply@pepguidance.com` or
`hello@pepguidance.com`.

## 4. Add env vars in Vercel

Vercel project → **Settings → Environment Variables**:

| Name | Value | Notes |
|---|---|---|
| `RESEND_API_KEY` | `re_…` (your key from step 2) | Server only |
| `OWNER_EMAIL` | your real inbox (e.g. `devanwright1@gmail.com`) | Where signup notifications go |
| `FROM_EMAIL` | `PepGuide <noreply@pepguidance.com>` | Or `PepGuide <onboarding@resend.dev>` while testing |

Redeploy after adding (Vercel does this automatically).

## 5. Test

Visit the live site, scroll to "Stay current with peptide research"
at the bottom of the homepage, enter your email, hit Subscribe.

You should:
- See "Thanks! We'll be in touch." replace the form on the page
- Receive an email in your `OWNER_EMAIL` inbox with the subscriber's
  address — **replying to that email writes directly to the
  subscriber** (we set `reply_to: <their_email>`)

If you DON'T receive it:
- Check Vercel function logs (Vercel dashboard → Functions → newsletter)
- Look for `[newsletter]` log lines — they'll show the error
- Check spam folder

If the env vars aren't set, the form will still appear to succeed
on the user side (so users don't see broken UX), but Vercel will
log `[newsletter] missing RESEND_API_KEY or OWNER_EMAIL` and you
won't actually receive anything.
