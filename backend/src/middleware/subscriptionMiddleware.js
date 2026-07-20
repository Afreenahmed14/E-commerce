const ApiError = require('../utils/ApiError');
const { isPaidTier } = require('../constants/plans');
const { ensureSubscriptionFresh } = require('../controllers/subscriptionController');

/**
 * Blocks free-tier (and lapsed) candidate/company accounts from
 * subscription-gated actions — currently just phone/email OTP
 * verification. Responds 402 with errors: ['SUBSCRIPTION_REQUIRED'] so the
 * frontend can open the upgrade popup instead of a generic error.
 *
 * Must run after `protect` (needs req.user). Refreshes the subscription
 * first so a just-lapsed plan is caught immediately rather than on the
 * next unrelated request.
 */
const requirePaidTier = async (req, res, next) => {
  try {
    if (!req.user) throw ApiError.unauthorized('You must be logged in to access this resource');
    await ensureSubscriptionFresh(req.user);
    const sub = req.user.subscription || {};
    if (!isPaidTier(sub.tier) || sub.status !== 'active') {
      throw new ApiError(
        402,
        'This action requires an active Monthly or Yearly subscription.',
        ['SUBSCRIPTION_REQUIRED']
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requirePaidTier };
