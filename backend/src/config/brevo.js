const https = require('https');

/**
 * Sends one transactional email through Brevo's HTTP API
 * (POST /v3/smtp/email). Used in place of the old Nodemailer/SMTP
 * transport — no SMTP credentials or app passwords needed, just a
 * Brevo API key and a verified sender address.
 *
 * Kept as a plain HTTPS call (rather than the @getbrevo/brevo SDK) so
 * the rest of the codebase's CommonJS `require()` style doesn't need to
 * change, and there's one fewer dependency to install/maintain.
 *
 * Resolves with Brevo's parsed JSON response on success. Rejects with an
 * Error on any non-2xx response or network failure — callers (see
 * services/emailService.js) are expected to catch and log rather than
 * let an email failure take down the request that triggered it.
 */
function sendBrevoEmail({ to, subject, html, text }) {
  return new Promise((resolve, reject) => {
    const senderEmail = process.env.EMAIL_USER;
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey || !senderEmail) {
      console.warn('[Brevo] BREVO_API_KEY / EMAIL_USER not configured — email skipped.');
      resolve({ skipped: true });
      return;
    }

    const payload = JSON.stringify({
      sender: { name: process.env.EMAIL_FROM_NAME || 'HourlyRecruit', email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      // Brevo falls back to a stripped version of htmlContent for
      // plain-text clients if textContent is omitted, but pass it
      // through when the caller supplied one for a cleaner result.
      ...(text ? { textContent: text } : {}),
    });

    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'));
        } else {
          reject(new Error(`Brevo error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { sendBrevoEmail };
