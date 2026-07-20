export const ROLES = {
  ADMIN: 'admin',
  CANDIDATE: 'candidate',
  COMPANY: 'company',
};

// Flat, one-time fee (in ₹) to unlock any engineer's contact details.
// Superseded by the subscription system below — kept only for any legacy
// screens that still reference it.
export const CONTACT_UNLOCK_FEE = 199;

// Subscription catalog. Must stay in sync with backend/src/constants/plans.js
// (the backend is the source of truth for price/limits; this copy is used
// for instant UI rendering before /subscription/plans resolves).
export const PRODUCTS = {
  CANDIDATE_BASIC: 'candidate_basic',
  CANDIDATE_PRO: 'candidate_pro',
  COMPANY: 'company',
};

export const TIERS = {
  FREE: 'free',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

export const SUBSCRIPTION_CATALOG = {
  [PRODUCTS.CANDIDATE_BASIC]: {
    id: PRODUCTS.CANDIDATE_BASIC,
    label: 'Candidate',
    tagline: 'Apply to jobs and get discovered by companies.',
    tiers: [
      {
        id: TIERS.FREE,
        name: 'Free',
        price: 0,
        period: null,
        features: [
          'Update your profile',
          'Apply to 1 job per week',
          'Receive 1 interview call every 2 weeks',
        ],
      },
      {
        id: TIERS.MONTHLY,
        name: 'Monthly',
        price: 499,
        period: 'month',
        features: [
          'Unlimited profile edits',
          'Apply to 5–6 jobs every 3 days',
          'Receive 5–6 interview calls per week',
        ],
      },
      {
        id: TIERS.YEARLY,
        name: 'Yearly',
        price: 4999,
        period: 'year',
        badge: 'BEST VALUE',
        features: [
          'Unlimited profile edits',
          'Unlimited job applications',
          'Receive 15–20 interview calls every 5 days',
          'Priority support',
        ],
      },
    ],
  },
  [PRODUCTS.CANDIDATE_PRO]: {
    id: PRODUCTS.CANDIDATE_PRO,
    label: 'Candidate + Project Partners',
    tagline: 'Everything in Candidate, plus find partners for your own projects.',
    tiers: [
      {
        id: TIERS.MONTHLY,
        name: 'Monthly',
        price: 799,
        period: 'month',
        features: [
          'Unlimited profile edits',
          'Apply to 5–6 jobs every 3 days',
          'Receive 5–6 interview calls per week',
          'Find up to 3 project partners per week',
        ],
      },
      {
        id: TIERS.YEARLY,
        name: 'Yearly',
        price: 7999,
        period: 'year',
        badge: 'BEST VALUE',
        features: [
          'Unlimited profile edits',
          'Unlimited job applications',
          'Receive 15–20 interview calls every 5 days',
          'Unlimited project partner matching',
          'Priority support',
        ],
      },
    ],
  },
  [PRODUCTS.COMPANY]: {
    id: PRODUCTS.COMPANY,
    label: 'Company',
    tagline: 'Post jobs and hire candidates.',
    tiers: [
      {
        id: TIERS.FREE,
        name: 'Free',
        price: 0,
        period: null,
        features: ['Post up to 3 jobs every 2 weeks', 'Hire up to 6 candidates per week'],
      },
      {
        id: TIERS.MONTHLY,
        name: 'Monthly',
        price: 1999,
        period: 'month',
        features: ['Post up to 10 jobs per week', 'Hire up to 20 candidates per week'],
      },
      {
        id: TIERS.YEARLY,
        name: 'Yearly',
        price: 17999,
        period: 'year',
        badge: 'BEST VALUE',
        features: ['Unlimited job posts', 'Unlimited hiring', 'Priority support'],
      },
    ],
  },
};

// tier.id -> billing period label, since the backend's /subscription/plans
// tiers don't carry a `period` field (only the static catalog above does).
const TIER_PERIOD = { [TIERS.FREE]: null, [TIERS.MONTHLY]: 'month', [TIERS.YEARLY]: 'year' };
const TIER_ORDER = [TIERS.FREE, TIERS.MONTHLY, TIERS.YEARLY];

/**
 * Turns the live payload from GET /subscription/plans (backend tiers keyed
 * by id, e.g. { free: {...}, monthly: {...} }) into the same array-of-tiers
 * shape SUBSCRIPTION_CATALOG uses, so every screen that renders pricing can
 * point at whichever catalog (static fallback or live) without caring which
 * one it got. `tagline` isn't sent by the backend, so it's filled in from
 * the static catalog. This is what makes an admin price change show up on
 * the Pricing page, the upgrade modal, and the Subscription page — all three
 * call subscriptionService.getPlans() and pass the result through this
 * function instead of importing SUBSCRIPTION_CATALOG directly for prices.
 */
export function buildLiveCatalog(products) {
  const catalog = {};
  (products || []).forEach((product) => {
    const tiers = TIER_ORDER
      .filter((tierId) => product.tiers && product.tiers[tierId])
      .map((tierId) => {
        const tier = product.tiers[tierId];
        return { ...tier, period: TIER_PERIOD[tierId] };
      });
    catalog[product.id] = {
      id: product.id,
      label: product.label,
      tagline: SUBSCRIPTION_CATALOG[product.id]?.tagline,
      tiers,
    };
  });
  return catalog;
}

export const AVAILABILITY_OPTIONS = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'not-available', label: 'Not available' },
];

// Speaking languages offered as a fixed dropdown list rather than free text,
// so candidate profiles stay consistent and filterable.
export const LANGUAGE_OPTIONS = [
  'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu',
  'Gujarati', 'Kannada', 'Odia', 'Punjabi', 'Malayalam', 'Assamese',
  'Mandarin Chinese', 'Spanish', 'French', 'Arabic', 'Portuguese', 'Russian',
  'German', 'Japanese', 'Korean', 'Italian', 'Vietnamese', 'Turkish',
  'Thai', 'Indonesian', 'Dutch', 'Polish', 'Swedish',
];

export const INDUSTRY_OPTIONS = [
  'Information Technology', 'Software Product', 'Fintech', 'Healthcare',
  'E-commerce', 'EdTech', 'Manufacturing', 'Retail', 'Consulting',
  'Media & Entertainment', 'Telecom', 'Real Estate', 'Logistics & Supply Chain',
  'Banking & Finance', 'Insurance', 'Travel & Hospitality', 'Automotive',
  'Energy & Utilities', 'Agriculture', 'Non-profit', 'Government', 'Other',
];

// Kept in sync with the "Developer Type" filter groups on the Browse
// Freelancers page (see CATEGORY_GROUPS there) — a candidate picks one of
// these on their profile, and it's what that filter matches against.
export const DEVELOPER_TYPE_OPTIONS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Java Developer',
  'Mobile Developer',
];
