const ApiError = require('./ApiError');
const { SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } = require('../constants/status');
const { SUBSCRIPTION_PLANS } = require('../constants/pricing');

/**
 * True only for a Candidate/Company document currently on an active,
 * non-expired monthly/yearly plan. Free-tier accounts (and lapsed paid
 * accounts, before refreshSubscriptionState has run) return false.
 */
function hasActivePaidPlan(user) {
  if (!user || !user.subscription) return false;
  const { plan, status, expiresAt } = user.subscription;
  if (plan === SUBSCRIPTION_PLAN.FREE) return false;
  if (status !== SUBSCRIPTION_STATUS.ACTIVE) return false;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return false;
  return true;
}

/**
 * Lazily downgrades a monthly/yearly subscription once its expiresAt has
 * passed: flips status to 'expired' and resets phone/email verification —
 * "after the month the user goes unverified". Called on every authenticated
 * request (see authMiddleware.protect) so no cron job is required; the
 * downgrade takes effect the moment the user is next seen after expiry.
 * Saves and returns true only if something actually changed.
 */
async function refreshSubscriptionState(user) {
  if (!user || !user.subscription) return false;
  const { plan, status, expiresAt } = user.subscription;
  if (plan === SUBSCRIPTION_PLAN.FREE) return false;
  if (status !== SUBSCRIPTION_STATUS.ACTIVE) return false;
  if (!expiresAt || new Date(expiresAt).getTime() >= Date.now()) return false;

  user.subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
  user.phoneVerified = false;
  user.emailVerified = false;
  await user.save();
  return true;
}

/**
 * Throws if a free-plan account has already used its one-time profile fill.
 * Paid (active) plans can always edit. Free-plan accounts filling in their
 * profile for the very first time are allowed through — the caller is
 * responsible for setting profileFilledOnce = true after a successful save.
 */
function enforceProfileEditAllowed(user) {
  // Active monthly/yearly subscribers can always edit. Everyone else
  // (free-tier accounts, and lapsed monthly/yearly accounts once their
  // plan has expired) is limited to a single profile fill.
  if (hasActivePaidPlan(user)) return;
  if (!user.profileFilledOnce) return;
  throw ApiError.forbidden(
    'Your current plan only allows filling your profile once. Upgrade to Monthly or Yearly to update it again.'
  );
}

/** Plan durations, sourced from the single pricing constants file. */
function planDurationDays(plan) {
  return SUBSCRIPTION_PLANS[plan]?.durationDays ?? null;
}

module.exports = {
  hasActivePaidPlan,
  refreshSubscriptionState,
  enforceProfileEditAllowed,
  planDurationDays,
};
