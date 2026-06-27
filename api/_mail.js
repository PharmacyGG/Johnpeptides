/* =================================================================
   Shared Resend transactional-email helper
   ----------------------------------------------------------------
   Used by /api/newsletter (owner notification) and
   /api/paypal-capture-order (owner order alert + customer receipt).

   Env vars (set in Vercel project Settings → Environment Variables):
     RESEND_API_KEY  — Resend API key (re_...)
     FROM_EMAIL      — verified sender, e.g. "PepGuide <orders@pepguidance.com>"

   Returns { ok: true } on success, or { ok: false, reason } on
   failure. Callers should NOT block the user-facing flow on a
   mail failure — log and continue.
   ================================================================= */

// Headers that, if present in subject or body, could enable email-header
// injection by a hostile sender if those fields are user-controlled. We
// never inject these directly into headers (Resend handles that), but we
// still strip CR/LF defensively as a belt-and-suspenders.
const stripCRLF = (s) => (s == null ? '' : String(s).replace(/[\r\n]+/g, ' '));

async function sendMail({ to, subject, text, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.FROM_EMAIL || 'PepGuide <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn('[mail] RESEND_API_KEY not set — skipping send to', to);
    return { ok: false, reason: 'unconfigured' };
  }

  const body = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject: stripCRLF(subject),
    text,
  };
  if (replyTo) body.reply_to = stripCRLF(replyTo);

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[mail] Resend error:', resp.status, errText);
      return { ok: false, reason: `resend_${resp.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[mail] fetch error:', err);
    return { ok: false, reason: 'fetch_error' };
  }
}

module.exports = { sendMail };
