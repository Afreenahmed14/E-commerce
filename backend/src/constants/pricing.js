/**
 * Centralized pricing constants. The contact-unlock fee used to equal each
 * candidate's own hourlyRate, which meant every candidate had a different
 * unlock price and companies couldn't predict cost before browsing. It is
 * now a single fixed platform fee (in rupees) that applies to every unlock,
 * regardless of the engineer's hourly rate. Override via the
 * CONTACT_UNLOCK_FEE env var if the fee ever needs to change without a
 * code deploy.
 */
const pricing = {
  CONTACT_UNLOCK_FEE: Number(process.env.CONTACT_UNLOCK_FEE) || 199,
};

/**
 * Mutates `pricing.CONTACT_UNLOCK_FEE` in place (see plans.js's
 * applyPriceOverrides for why) so callers that read it live — like
 * paymentController — see the new fee immediately after an admin saves
 * it, without a restart.
 */
pricing.applyPriceOverride = ({ contactUnlockFee } = {}) => {
  if (contactUnlockFee !== undefined && contactUnlockFee !== null) {
    pricing.CONTACT_UNLOCK_FEE = contactUnlockFee;
  }
};

module.exports = pricing;
