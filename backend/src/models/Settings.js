const mongoose = require('mongoose');

/**
 * Singleton document (always looked up/upserted by `key: 'platform'`) that
 * lets an admin override pricing that would otherwise be fixed in
 * constants/plans.js. Shape mirrors the catalog: one price per
 * product/tier combination. Only paid tiers (monthly/yearly) are required
 * to have a price, but free tiers are included too since "you fix the
 * price" applies to Free plans as well (normally 0, but admin-editable).
 * Values here are applied on top of the env-var defaults at server
 * startup and again whenever an admin saves new pricing from the admin
 * dashboard (see adminController's updatePricingSettings), so a price
 * change takes effect immediately without a code deploy or restart.
 */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'platform' },
    // { [product]: { [tier]: price } } — see constants/plans.js PRODUCTS/TIERS.
    prices: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
