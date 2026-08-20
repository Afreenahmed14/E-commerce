const { sendBrevoEmail } = require('../config/brevo');

/**
 * Centralized email service (Feature 8). Every transactional email the
 * platform sends goes through here so the sender identity and HTML/
 * plain-text structure live in exactly one place. Sends via Brevo's
 * transactional email API (see config/brevo.js); silently skips (logged)
 * when BREVO_API_KEY / EMAIL_USER aren't configured, so the app never
 * hard-fails on email.
 */

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
 * Core send helper. Delegates to the Brevo API client; logs a warning
 * instead of throwing when email is disabled or the send fails, so a
 * broken/unconfigured email integration never breaks the request that
 * triggered it (e.g. an interview still gets scheduled even if the
 * confirmation email can't go out).
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const result = await sendBrevoEmail({ to, subject, text, html });
    if (result.skipped) {
      console.warn(`[emailService] Email skipped (Brevo unconfigured): ${subject} -> ${to}`);
      return { skipped: true, subject, to };
    }
    return { skipped: false, ...result };
  } catch (err) {
    console.error(`[emailService] Failed to send "${subject}" to ${to}:`, err.message);
    return { skipped: true, error: err.message, subject, to };
  }
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
