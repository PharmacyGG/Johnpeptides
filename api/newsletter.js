/* POST /api/newsletter
   Body: { email: "researcher@lab.edu" }
   Returns: { ok: true }
   ----------------------------------------------------------------
   When someone subscribes, we email YOU (the owner) with their
   address — manual follow-up workflow, no third-party list provider.
   Uses Resend's free tier (3K emails/month). Env vars in Vercel:
     RESEND_API_KEY  — your Resend API key (re_…)
     OWNER_EMAIL     — where subscriber notifications get sent
     FROM_EMAIL      — verified sender (e.g. noreply@pepguidance.com)
*/

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const email = ((req.body || {}).email || '').toString().trim().toLowerCase();
  if (!email || !EMAIL_RX.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const owner  = process.env.OWNER_EMAIL;
  const from   = process.env.FROM_EMAIL || 'PepGuide <onboarding@resend.dev>';

  if (!apiKey || !owner) {
    // Soft-fail: don't block signup if env isn't configured.
    // Log to Vercel function logs so the owner can see attempts.
    console.warn('[newsletter] missing RESEND_API_KEY or OWNER_EMAIL — subscription not sent:', email);
    return res.status(200).json({ ok: true, queued: true });
  }

  const ts  = new Date().toISOString();
  const ip  = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  const ua  = (req.headers['user-agent'] || '').toString().slice(0, 200);

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [owner],
        reply_to: email,
        subject: `New PepGuide subscriber: ${email}`,
        text: [
          `A new researcher signed up for the PepGuide newsletter.`,
          ``,
          `Email:      ${email}`,
          `Timestamp:  ${ts}`,
          `IP:         ${ip || '(unknown)'}`,
          `User agent: ${ua || '(unknown)'}`,
          ``,
          `Reply directly to this email to reach them.`,
        ].join('\n'),
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[newsletter] Resend error:', resp.status, text);
      // Still return ok=true so the user-facing flow succeeds.
      return res.status(200).json({ ok: true, queued: true });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[newsletter] fetch error:', err);
    return res.status(200).json({ ok: true, queued: true });
  }
};
