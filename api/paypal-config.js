/* GET /api/paypal-config
   Returns the PUBLIC PayPal Client ID + environment so the frontend
   can load the right SDK script. Keeps the secret on the server. */

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    env: (process.env.PAYPAL_ENV || 'sandbox').toLowerCase(),
    currency: 'USD',
  });
};
