const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { createOrder, verifySignature } = require('../services/razorpayService');
const Notification = require('../models/Notification');
const {
  PRODUCTS, TIERS, QUOTA_KEYS, CATALOG, getPlan, isPaidTier,
} = require('../constants/plans');
const { checkQuota } = require('../utils/quota');
const { CANDIDATE, COMPANY } = require('../constants/roles');
const MESSAGES = require('../constants/messages');

// Which products a given account role is allowed to subscribe to.
const PRODUCTS_BY_ROLE = {
  [CANDIDATE]: [PRODUCTS.CANDIDATE_BASIC, PRODUCTS.CANDIDATE_PRO],
  [COMPANY]: [PRODUCTS.COMPANY],
};

// The product+tier an account falls back to once a paid cycle ends.
// CANDIDATE_PRO has no free tier, so a lapsed Pro subscriber lands on
// CANDIDATE_BASIC's Free tier rather than a nonexistent "Pro Free".
const freeFallback = (role) =>
  role === COMPANY
    ? { product: PRODUCTS.COMPANY, tier: TIERS.FREE }
    : { product: PRODUCTS.CANDIDATE_BASIC, tier: TIERS.FREE };

/**
 * If a paid subscription's endDate has passed, drop the account back to
 * its free fallback and reset usage counters. Called at the top of any
 * controller that relies on the account's current plan, so an expired
 * subscription never silently keeps granting paid access. Saves the user
 * doc if it changed.
 */
const ensureSubscriptionFresh = async (user) => {
  const sub = user.subscription || {};
  if (isPaidTier(sub.tier) && sub.endDate && new Date(sub.endDate) < new Date()) {
    const fallback = freeFallback(user.role);
    user.subscription.product = fallback.product;
    user.subscription.tier = fallback.tier;
    user.subscription.status = 'expired';
    user.subscription.endDate = null;
    // Phone/email verification is available on every plan, so it's kept
    // as-is here. Usage counters are left as-is too — the rolling-window
    // quota engine prunes stale entries on its own; there's no cliff-edge
    // reset needed.
    await user.save();
  }
  return user;
};

/** Shape returned to the frontend for "my current subscription". */
const toStatusPayload = (user) => {
  const sub = user.subscription || {};
  const plan = getPlan(sub.product, sub.tier);
  const usage = sub.usage || {};

  const quotas = {};
  if (plan && plan.quotas) {
    Object.entries(plan.quotas).forEach(([key, quota]) => {
      const result = checkQuota(usage[key] || [], quota);
      quotas[key] = {
        limit: quota.limit,
        windowDays: quota.windowDays,
        used: result.used,
        remaining: result.remaining,
        resetAt: result.resetAt,
      };
    });
  }

  return {
    product: sub.product,
    tier: sub.tier,
    name: plan ? plan.name : null,
    status: sub.status || 'active',
    startDate: sub.startDate || null,
    endDate: sub.endDate || null,
    isActive: sub.tier === TIERS.FREE || sub.status === 'active',
    profileEditLimit: plan ? plan.profileEditLimit : null,
    profileEditCount: sub.profileEditCount || 0,
    quotas,
    phoneVerified: user.phoneVerified || false,
    emailVerified: user.emailVerified || false,
  };
};

/**
 * GET /api/v1/subscription/plans
 * Public plan catalog — no auth required so the pricing/landing page can
 * render it too. Optional ?for=candidate|company narrows to the products
 * relevant to that account type; omit it to get the full catalog.
 */
const getPlans = asyncHandler(async (req, res) => {
  const { for: forRole } = req.query;
  const allowedProducts = PRODUCTS_BY_ROLE[forRole] || Object.values(PRODUCTS);

  const products = allowedProducts.map((productId) => CATALOG[productId]);
  return new ApiResponse(200, { products }, 'Plans fetched').send(res);
});

/**
 * GET /api/v1/subscription/status
 * req.user is the Candidate/Company document (see authMiddleware).
 */
const getStatus = asyncHandler(async (req, res) => {
  await ensureSubscriptionFresh(req.user);
  return new ApiResponse(200, { subscription: toStatusPayload(req.user) }, 'Subscription status fetched').send(res);
});

/**
 * POST /api/v1/subscription/order
 * Creates a Razorpay order for upgrading to a Monthly or Yearly tier of a
 * given product. The amount is always read server-side from
 * constants/plans.js — never trusted from the client — to prevent price
 * tampering. Body: { product, tier }.
 */
const createSubscriptionOrder = asyncHandler(async (req, res) => {
  const { product, tier } = req.body;

  const allowedProducts = PRODUCTS_BY_ROLE[req.user.role] || [];
  if (!allowedProducts.includes(product)) {
    throw ApiError.badRequest(MESSAGES.SUBSCRIPTION.INVALID_PRODUCT_FOR_ROLE);
  }
  if (!isPaidTier(tier)) {
    throw ApiError.badRequest('tier must be "monthly" or "yearly"');
  }

  const plan = getPlan(product, tier);
  if (!plan) {
    throw ApiError.badRequest(MESSAGES.SUBSCRIPTION.INVALID_TIER_FOR_PRODUCT);
  }

  const amount = Math.round(plan.price * 100); // rupees -> paise
  const currency = process.env.CURRENCY || 'INR';
  const receipt = `sub_${uuidv4().slice(0, 16)}`;

  const order = await createOrder({ amount, currency, receipt });

  return new ApiResponse(201, {
    orderId: order.id,
    amount,
    currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    product,
    tier: plan.id,
  }, MESSAGES.SUBSCRIPTION.ORDER_CREATED).send(res);
});

/**
 * POST /api/v1/subscription/verify
 * Verifies the Razorpay signature, then activates the product+tier on
 * req.user's own account directly. Usage counters are reset so the new
 * cycle starts with a clean slate.
 */
const verifySubscriptionPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id, razorpay_payment_id, razorpay_signature, product, tier,
  } = req.body;

  const allowedProducts = PRODUCTS_BY_ROLE[req.user.role] || [];
  if (!allowedProducts.includes(product)) {
    throw ApiError.badRequest(MESSAGES.SUBSCRIPTION.INVALID_PRODUCT_FOR_ROLE);
  }
  if (!isPaidTier(tier)) {
    throw ApiError.badRequest('tier must be "monthly" or "yearly"');
  }

  const plan = getPlan(product, tier);
  if (!plan) {
    throw ApiError.badRequest(MESSAGES.SUBSCRIPTION.INVALID_TIER_FOR_PRODUCT);
  }

  const isValid = verifySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!isValid) {
    throw ApiError.badRequest(MESSAGES.SUBSCRIPTION.VERIFICATION_FAILED);
  }

  const now = new Date();
  const endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  req.user.subscription.product = product;
  req.user.subscription.tier = plan.id;
  req.user.subscription.status = 'active';
  req.user.subscription.startDate = now;
  req.user.subscription.endDate = endDate;
  req.user.subscription.razorpayOrderId = razorpay_order_id;
  req.user.subscription.razorpayPaymentId = razorpay_payment_id;
  req.user.subscription.expiryNotifiedAt = null;
  // Fresh cycle, fresh quotas.
  req.user.subscription.usage = {
    jobApplications: [],
    interviewCalls: [],
    projectPartnerRequests: [],
    jobPosts: [],
    hires: [],
  };
  await req.user.save();

  return new ApiResponse(200, { subscription: toStatusPayload(req.user) }, MESSAGES.SUBSCRIPTION.VERIFIED).send(res);
});

/**
 * POST /api/v1/subscription/cancel
 * Immediately moves the account back to its free fallback rather than
 * waiting out the current cycle — simplest behavior for v1. (Swap for an
 * "active until endDate, then Free" flow later if needed.)
 */
const cancelSubscription = asyncHandler(async (req, res) => {
  const fallback = freeFallback(req.user.role);
  req.user.subscription.product = fallback.product;
  req.user.subscription.tier = fallback.tier;
  req.user.subscription.status = 'cancelled';
  req.user.subscription.endDate = null;
  req.user.subscription.expiryNotifiedAt = null;
  // Verification (a paid perk) no longer applies once back on Free.
  req.user.phoneVerified = false;
  req.user.emailVerified = false;
  await req.user.save();

  await Notification.create({
    userId: req.user._id,
    userModel: req.user.role === 'candidate' ? 'Candidate' : 'Company',
    title: 'Subscription cancelled',
    message: "You're back on the Free plan. Some actions will now be limited until you subscribe again.",
    type: 'warning',
  });

  return new ApiResponse(200, { subscription: toStatusPayload(req.user) }, MESSAGES.SUBSCRIPTION.CANCELLED).send(res);
});

module.exports = {
  PRODUCTS_BY_ROLE,
  freeFallback,
  ensureSubscriptionFresh,
  toStatusPayload,
  getPlans,
  getStatus,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  cancelSubscription,
};
