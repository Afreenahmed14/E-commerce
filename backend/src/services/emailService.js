const { getTransporter } = require('../config/nodemailer');

/**
 * Centralized email service (Feature 8). Every transactional email the
 * platform sends goes through here so the transport, sender identity, and
 * HTML/plain-text structure live in exactly one place. Uses the shared
 * Nodemailer transport from config/nodemailer.js; silently skips when SMTP
 * is not configured (dev/local), so the app never hard-fails on email.
 */

const FROM = process.env.EMAIL_FROM || 'HourlyRecruit <no-reply@hourlyrecruit.com>';
const APP_NAME = 'HourlyRecruit';

/** Builds a simple responsive HTML email shell from a title + body HTML. */
const shell = (title, bodyHtml) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="margin:0 0 16px;color:#1d4ed8;">${APP_NAME} — ${title}</h2>
    <div style="color:#334155;line-height:1.6;">${bodyHtml}</div>
    <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;">This is an automated message from ${APP_NAME}. Please do not reply.</p>
  </div>
`;

/**
 * Core send helper. Resolves recipient email, uses the shared transport,
 * and logs a warning instead of throwing when email is disabled.
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`[emailService] Email skipped (SMTP unconfigured): ${subject} -> ${to}`);
    return { skipped: true, subject, to };
  }
  const info = await transporter.sendMail({ from: FROM, to, subject, text, html });
  return { messageId: info.messageId, skipped: false };
};

/** Application submitted — candidate gets a confirmation. */
const sendApplicationSubmittedEmail = (to, { candidateName, jobTitle, companyName }) =>
  sendEmail({
    to,
    subject: `Application received — ${jobTitle} at ${companyName}`,
    text: `Hi ${candidateName}, your application for ${jobTitle} at ${companyName} was submitted successfully.`,
    html: shell('Application Received', `
      <p>Hi <strong>${candidateName}</strong>,</p>
      <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> was submitted successfully.</p>
      <p>The recruiter will review your profile and get back to you soon.</p>
    `),
  });

/** Interview scheduled / rescheduled confirmation. */
const sendInterviewEmail = (to, { userName, jobTitle, companyName, date, time, link, status }) =>
  sendEmail({
    to,
    subject: `Interview ${status} — ${jobTitle} at ${companyName}`,
    text: `Hi ${userName}, your interview for ${jobTitle} at ${companyName} is ${status}.`,
    html: shell(`Interview ${status}`, `
      <p>Hi <strong>${userName}</strong>,</p>
      <p>Your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been ${status}.</p>
      <p><strong>Date:</strong> ${date}<br/><strong>Time:</strong> ${time}</p>
      ${link ? `<p><strong>Meeting link:</strong> <a href="${link}">${link}</a></p>` : ''}
    `),
  });

/** Job posted confirmation sent to the recruiter. */
const sendJobPostedEmail = (to, { companyName, jobTitle }) =>
  sendEmail({
    to,
    subject: `Job posted — ${jobTitle}`,
    text: `Hi, your job "${jobTitle}" is now live.`,
    html: shell('Job Posted', `
      <p>Hi <strong>${companyName}</strong>,</p>
      <p>Your job <strong>${jobTitle}</strong> is now live and visible to candidates.</p>
    `),
  });

/** Password reset email. */
const sendPasswordResetEmail = (to, { userName, resetLink }) =>
  sendEmail({
    to,
    subject: 'Reset your password',
    text: `Hi ${userName}, reset your password here: ${resetLink}`,
    html: shell('Password Reset', `
      <p>Hi <strong>${userName}</strong>,</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `),
  });

/** Offer letter delivered to the candidate. */
const sendOfferLetterEmail = (to, { candidateName, jobTitle, companyName, offerLink }) =>
  sendEmail({
    to,
    subject: `Offer letter — ${jobTitle} at ${companyName}`,
    text: `Hi ${candidateName}, congratulations! Your offer letter is ready.`,
    html: shell('Offer Letter', `
      <p>Congratulations <strong>${candidateName}</strong>!</p>
      <p>You've been hired for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
      ${offerLink ? `<p>View your offer letter: <a href="${offerLink}">${offerLink}</a></p>` : ''}
    `),
  });

module.exports = {
  sendEmail,
  sendApplicationSubmittedEmail,
  sendInterviewEmail,
  sendJobPostedEmail,
  sendPasswordResetEmail,
  sendOfferLetterEmail,
};
