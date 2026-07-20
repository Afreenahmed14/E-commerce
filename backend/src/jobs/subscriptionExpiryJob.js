const cron = require('node-cron');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const Notification = require('../models/Notification');
const { isPaidTier } = require('../constants/plans');

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Notifies any Candidate/Company whose active Monthly/Yearly subscription
 * expires within the next 2 days and hasn't already been warned this cycle
 * (subscription.expiryNotifiedAt is cleared on every renewal — see
 * subscriptionController.verifySubscriptionPayment).
 */
async function notifyExpiringSubscriptions() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + TWO_DAYS_MS);

  for (const [Model, modelName] of [[Candidate, 'Candidate'], [Company, 'Company']]) {
    const expiringSoon = await Model.find({
      'subscription.status': 'active',
      'subscription.endDate': { $gte: now, $lte: windowEnd },
      'subscription.expiryNotifiedAt': null,
    }).select('_id name companyName subscription');

    for (const account of expiringSoon) {
      if (!isPaidTier(account.subscription.tier)) continue; // safety net

      const daysLeft = Math.max(1, Math.ceil((account.subscription.endDate - now) / (24 * 60 * 60 * 1000)));

      // eslint-disable-next-line no-await-in-loop
      await Notification.create({
        userId: account._id,
        userModel: modelName,
        title: 'Your subscription is expiring soon',
        message: `Your ${account.subscription.tier} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew or extend now to keep your current limits.`,
        type: 'warning',
      });

      account.subscription.expiryNotifiedAt = now;
      // eslint-disable-next-line no-await-in-loop
      await account.save();
    }
  }
}

/**
 * Starts the daily expiry-reminder job. Runs once immediately on startup
 * (so a reminder isn't missed just because the server restarted right
 * before the scheduled time) and then every day at 09:00 server time.
 */
function startSubscriptionExpiryJob() {
  notifyExpiringSubscriptions().catch((err) => console.error('[SubscriptionExpiryJob] initial run failed:', err));

  cron.schedule('0 9 * * *', () => {
    notifyExpiringSubscriptions().catch((err) => console.error('[SubscriptionExpiryJob] scheduled run failed:', err));
  });
}

module.exports = { startSubscriptionExpiryJob, notifyExpiringSubscriptions };
