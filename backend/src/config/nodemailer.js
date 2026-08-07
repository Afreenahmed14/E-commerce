const nodemailer = require('nodemailer');

/**
 * Shared Nodemailer transport, mirroring the lazy-init pattern used by
 * config/cloudinary.js. Reads SMTP credentials from the environment so no
 * secrets are ever hardcoded. If SMTP is not configured, email sending
 * silently no-ops (logged) so the rest of the app still works in dev.
 */
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[Nodemailer] SMTP not configured — email notifications will be skipped.');
    transporter = false; // cache the "disabled" state so we don't warn repeatedly
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: (process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user, pass },
  });

  console.log('[Nodemailer] SMTP transport configured');
  return transporter;
};

module.exports = { getTransporter };
