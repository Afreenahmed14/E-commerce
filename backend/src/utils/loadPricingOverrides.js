const Settings = require('../models/Settings');
const { applyPriceOverrides } = require('../constants/plans');

/**
 * Reads the singleton Settings doc (if an admin has ever saved custom
 * pricing) and applies it over the env-var defaults in plans.js. Safe to
 * call even if no Settings doc exists yet (fresh install) or if the DB is
 * briefly unreachable — either way we just keep the defaults.
 */
const loadPricingOverrides = async () => {
  try {
    const settings = await Settings.findOne({ key: 'platform' }).lean();
    if (!settings || !settings.prices) return;

    applyPriceOverrides(settings.prices);

    console.log('[Settings] Applied saved admin pricing overrides');
  } catch (err) {
    console.error('[Settings] Failed to load pricing overrides, using defaults:', err.message);
  }
};

module.exports = { loadPricingOverrides };
