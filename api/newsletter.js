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

const { rateLimit } = require('./_ratelimit');
const { sendMail }  = require('./_mail');

// Tight email regex — rejects RFC-5322 group syntax, commas, semicolons,
// and angle brackets that could enable header injection if the value
// were ever spliced into a header field. Belt and suspenders alongside
// the CR/LF strip in _mail.js.
const EMAIL_RX = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
const FORBIDDEN_CHARS = /[<>,;"\r\n\t]/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // 5 signups per IP per minute is plenty for legitimate browsing; blocks
  // mass-signup spam that would burn the Resend free tier.
  if (rateLimit(req, res, { tokens: 5, windowSec: 60 })) return;

  const email = ((req.body || {}).email || '').toString().trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RX.test(email) || FORBIDDEN_CHARS.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const owner = process.env.OWNER_EMAIL;
  if (!process.env.RESEND_API_KEY || !owner) {
    // Soft-fail: don't block signup if env isn't configured.
    console.warn('[newsletter] missing RESEND_API_KEY or OWNER_EMAIL — subscription not sent:', email);
    return res.status(200).json({ ok: true, queued: true });
  }

  const ts = new Date().toISOString();
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  const ua = (req.headers['user-agent'] || '').toString().slice(0, 200);

  const result = await sendMail({
    to: owner,
    replyTo: email,
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
  });

  // Even on Resend failure we tell the user they're subscribed — beats
  // them retrying repeatedly and getting flagged as a duplicate later.
  return res.status(200).json({ ok: true, queued: !result.ok });
};
