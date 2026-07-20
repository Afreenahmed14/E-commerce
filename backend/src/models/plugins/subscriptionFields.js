const { SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } = require('../../constants/status');

/**
 * Mongoose plugin adding the subscription + phone/email verification fields
 * shared by Candidate and Company (not Admin — admins never subscribe).
 *
 * Replaces the old pay-per-contact-unlock model: every candidate/company
 * account sits on exactly one of 3 tiers (free/monthly/yearly). Free-tier
 * accounts can fill their profile once and browse, but cannot view another
 * profile's full details or verify their phone/email. Monthly/yearly
 * subscribers get unlimited profile views + hiring, plus phone & email OTP
 * verification, for as long as `subscription.status` stays 'active'.
 *
 * `subscription.status` is lazily flipped from 'active' to 'expired' by
 * refreshSubscriptionState() (see utils/subscription.js), called on every
 * authenticated request — at that point phoneVerified/emailVerified are
 * also reset to false, i.e. "the user goes unverified" once a monthly/
 * yearly plan lapses.
 */
function subscriptionFieldsPlugin(schema) {
  schema.add({
    subscription: {
      plan: {
        type: String,
        enum: Object.values(SUBSCRIPTION_PLAN),
        default: SUBSCRIPTION_PLAN.FREE,
      },
      status: {
        type: String,
        enum: Object.values(SUBSCRIPTION_STATUS),
        default: SUBSCRIPTION_STATUS.ACTIVE,
      },
      startedAt: { type: Date, default: null },
      // null for the free plan (never expires). Set to now + 30/365 days
      // when a monthly/yearly plan is activated.
      expiresAt: { type: Date, default: null },
    },
    // Free-tier profiles can be filled in once; after that, updateMyProfile
    // is blocked until the account upgrades to a paid plan. Set to true the
    // first time a free-plan account successfully saves its profile.
    profileFilledOnce: { type: Boolean, default: false },
    // Phone/email OTP verification — only reachable while on an active
    // paid plan. Both reset to false when the plan expires.
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
  });
}

module.exports = subscriptionFieldsPlugin;
