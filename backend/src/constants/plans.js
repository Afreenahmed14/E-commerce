/**
 * Subscription catalog.
 *
 * There are three separate PRODUCTS a candidate or company subscribes to
 * independently — each has its own tiers and its own quotas:
 *
 *   CANDIDATE_BASIC — free / monthly / yearly. Core job-search access:
 *     profile edits, job applications, and interview calls received.
 *   CANDIDATE_PRO   — monthly / yearly only (no free tier). Everything
 *     CANDIDATE_BASIC's paid tiers give, plus access to Project Partner
 *     matching (finding collaborators for a candidate's own projects).
 *   COMPANY         — free / monthly / yearly. Job posting + hiring caps.
 *
 * Every quota is expressed as a rolling window: { limit, windowDays }.
 * `limit: null` means unlimited. windowDays is the size of the sliding
 * window a limit resets over — e.g. { limit: 6, windowDays: 3 } means "at
 * most 6 uses in any trailing 3-day period", not a calendar-aligned reset.
 * See utils/quota.js for the engine that enforces these.
 *
 * Prices are in rupees (converted to paise for Razorpay) and can be
 * overridden per-product/tier via env vars or the admin Settings doc
 * without a code deploy — see applyPriceOverrides / loadPricingOverrides.js.
 */

const PRODUCTS = {
  CANDIDATE_BASIC: 'candidate_basic',
  CANDIDATE_PRO: 'candidate_pro',
  COMPANY: 'company',
};

const TIERS = {
  FREE: 'free',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

const TIER_DURATIONS_DAYS = {
  [TIERS.FREE]: null,
  [TIERS.MONTHLY]: 30,
  [TIERS.YEARLY]: 365,
};

// Quota keys used inside each product's `quotas` object. Not every product
// uses every key.
const QUOTA_KEYS = {
  JOB_APPLICATIONS: 'jobApplications', // candidate applying to jobs
  INTERVIEW_CALLS: 'interviewCalls', // interview calls a candidate may receive
  PROJECT_PARTNER_REQUESTS: 'projectPartnerRequests', // CANDIDATE_PRO only
  JOB_POSTS: 'jobPosts', // company posting jobs
  HIRES: 'hires', // company hiring candidates
};

const unlimited = () => ({ limit: null, windowDays: null });

const CATALOG = {
  [PRODUCTS.CANDIDATE_BASIC]: {
    id: PRODUCTS.CANDIDATE_BASIC,
    label: 'Candidate',
    tiers: {
      [TIERS.FREE]: {
        id: TIERS.FREE,
        name: 'Free',
        price: Number(process.env.CANDIDATE_BASIC_FREE_PRICE) || 0,
        durationDays: TIER_DURATIONS_DAYS[TIERS.FREE],
        quotas: {
          [QUOTA_KEYS.JOB_APPLICATIONS]: { limit: 1, windowDays: 7 },
          [QUOTA_KEYS.INTERVIEW_CALLS]: { limit: 1, windowDays: 14 },
        },
        profileEditLimit: 5,
        features: [
          'Update your profile',
          'Apply to 1 job per week',
          'Receive 1 interview call every 2 weeks',
        ],
      },
      [TIERS.MONTHLY]: {
        id: TIERS.MONTHLY,
        name: 'Monthly',
        price: Number(process.env.CANDIDATE_BASIC_MONTHLY_PRICE) || 499,
        durationDays: TIER_DURATIONS_DAYS[TIERS.MONTHLY],
        quotas: {
          [QUOTA_KEYS.JOB_APPLICATIONS]: { limit: 6, windowDays: 3 },
          [QUOTA_KEYS.INTERVIEW_CALLS]: { limit: 6, windowDays: 7 },
        },
        profileEditLimit: null,
        features: [
          'Unlimited profile edits',
          'Apply to 5–6 jobs every 3 days',
          'Receive 5–6 interview calls per week',
        ],
      },
      [TIERS.YEARLY]: {
        id: TIERS.YEARLY,
        name: 'Yearly',
        price: Number(process.env.CANDIDATE_BASIC_YEARLY_PRICE) || 4999,
        durationDays: TIER_DURATIONS_DAYS[TIERS.YEARLY],
        quotas: {
          [QUOTA_KEYS.JOB_APPLICATIONS]: unlimited(),
          [QUOTA_KEYS.INTERVIEW_CALLS]: { limit: 20, windowDays: 5 },
        },
        profileEditLimit: null,
        features: [
          'Unlimited profile edits',
          'Unlimited job applications',
          'Receive 15–20 interview calls every 5 days',
          'Priority support',
        ],
        badge: 'BEST VALUE',
      },
    },
  },

  [PRODUCTS.CANDIDATE_PRO]: {
    id: PRODUCTS.CANDIDATE_PRO,
    label: 'Candidate + Project Partners',
    // No free tier for this product.
    tiers: {
      [TIERS.MONTHLY]: {
        id: TIERS.MONTHLY,
        name: 'Monthly',
        price: Number(process.env.CANDIDATE_PRO_MONTHLY_PRICE) || 799,
        durationDays: TIER_DURATIONS_DAYS[TIERS.MONTHLY],
        quotas: {
          [QUOTA_KEYS.JOB_APPLICATIONS]: { limit: 6, windowDays: 3 },
          [QUOTA_KEYS.INTERVIEW_CALLS]: { limit: 6, windowDays: 7 },
          [QUOTA_KEYS.PROJECT_PARTNER_REQUESTS]: { limit: 3, windowDays: 7 },
        },
        profileEditLimit: null,
        features: [
          'Unlimited profile edits',
          'Apply to 5–6 jobs every 3 days',
          'Receive 5–6 interview calls per week',
          'Find up to 3 project partners per week',
        ],
      },
      [TIERS.YEARLY]: {
        id: TIERS.YEARLY,
        name: 'Yearly',
        price: Number(process.env.CANDIDATE_PRO_YEARLY_PRICE) || 7999,
        durationDays: TIER_DURATIONS_DAYS[TIERS.YEARLY],
        quotas: {
          [QUOTA_KEYS.JOB_APPLICATIONS]: unlimited(),
          [QUOTA_KEYS.INTERVIEW_CALLS]: { limit: 20, windowDays: 5 },
          [QUOTA_KEYS.PROJECT_PARTNER_REQUESTS]: unlimited(),
        },
        profileEditLimit: null,
        features: [
          'Unlimited profile edits',
          'Unlimited job applications',
          'Receive 15–20 interview calls every 5 days',
          'Unlimited project partner matching',
          'Priority support',
        ],
        badge: 'BEST VALUE',
      },
    },
  },

  [PRODUCTS.COMPANY]: {
    id: PRODUCTS.COMPANY,
    label: 'Company',
    tiers: {
      [TIERS.FREE]: {
        id: TIERS.FREE,
        name: 'Free',
        price: Number(process.env.COMPANY_FREE_PRICE) || 0,
        durationDays: TIER_DURATIONS_DAYS[TIERS.FREE],
        quotas: {
          [QUOTA_KEYS.JOB_POSTS]: { limit: 3, windowDays: 14 },
          [QUOTA_KEYS.HIRES]: { limit: 6, windowDays: 7 },
        },
        features: ['Post up to 3 jobs every 2 weeks', 'Hire up to 6 candidates per week'],
      },
      [TIERS.MONTHLY]: {
        id: TIERS.MONTHLY,
        name: 'Monthly',
        price: Number(process.env.COMPANY_MONTHLY_PRICE) || 1999,
        durationDays: TIER_DURATIONS_DAYS[TIERS.MONTHLY],
        quotas: {
          [QUOTA_KEYS.JOB_POSTS]: { limit: 10, windowDays: 7 },
          [QUOTA_KEYS.HIRES]: { limit: 20, windowDays: 7 },
        },
        features: ['Post up to 10 jobs per week', 'Hire up to 20 candidates per week'],
      },
      [TIERS.YEARLY]: {
        id: TIERS.YEARLY,
        name: 'Yearly',
        price: Number(process.env.COMPANY_YEARLY_PRICE) || 17999,
        durationDays: TIER_DURATIONS_DAYS[TIERS.YEARLY],
        quotas: {
          [QUOTA_KEYS.JOB_POSTS]: unlimited(),
          [QUOTA_KEYS.HIRES]: unlimited(),
        },
        features: ['Unlimited job posts', 'Unlimited hiring', 'Priority support'],
        badge: 'BEST VALUE',
      },
    },
  },
};

/**
 * @param {string} product - one of PRODUCTS
 * @param {string} tier - one of TIERS
 * @returns the tier definition, falling back to that product's Free tier
 *   (or its cheapest tier, for CANDIDATE_PRO which has none) if the
 *   requested tier doesn't exist on that product.
 */
const getPlan = (product, tier) => {
  const productDef = CATALOG[product];
  if (!productDef) return null;
  return (
    productDef.tiers[tier] ||
    productDef.tiers[TIERS.FREE] ||
    productDef.tiers[TIERS.MONTHLY] ||
    null
  );
};

const isPaidTier = (tier) => tier === TIERS.MONTHLY || tier === TIERS.YEARLY;

const getQuota = (product, tier, quotaKey) => {
  const plan = getPlan(product, tier);
  return (plan && plan.quotas && plan.quotas[quotaKey]) || null;
};

/**
 * Mutates the live CATALOG prices in place (same rationale as the old
 * single-tier applyPriceOverrides: every module that already destructured
 * `CATALOG`/`getPlan` keeps pointing at the same objects, so a price
 * change from the admin dashboard is visible immediately, no restart).
 *
 * `overrides` shape: { [product]: { [tier]: price } }
 */
const applyPriceOverrides = (overrides = {}) => {
  Object.entries(overrides).forEach(([product, tierPrices]) => {
    const productDef = CATALOG[product];
    if (!productDef || !tierPrices) return;
    Object.entries(tierPrices).forEach(([tier, price]) => {
      if (price === undefined || price === null) return;
      if (productDef.tiers[tier]) {
        productDef.tiers[tier].price = price;
      }
    });
  });
};

module.exports = {
  PRODUCTS,
  TIERS,
  QUOTA_KEYS,
  TIER_DURATIONS_DAYS,
  CATALOG,
  getPlan,
  getQuota,
  isPaidTier,
  applyPriceOverrides,
};
