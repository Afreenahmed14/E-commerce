/**
 * Centralized user-facing messages so copy stays consistent
 * across controllers and is easy to update or localize later.
 */
module.exports = {
  AUTH: {
    REGISTER_SUCCESS: 'Account created successfully',
    LOGIN_SUCCESS: 'Logged in successfully',
    LOGOUT_SUCCESS: 'Logged out successfully',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_IN_USE: 'An account with this email already exists',
    UNAUTHORIZED: 'You must be logged in to access this resource',
    FORBIDDEN: 'You do not have permission to perform this action',
    TOKEN_INVALID: 'Session expired or invalid, please log in again',
    ACCOUNT_SUSPENDED: 'This account has been suspended. Contact support.',
    FIREBASE_ACCOUNT_NOT_FOUND: 'No account found for this sign-in. Please register first.',
    FIREBASE_ADMIN_NOT_PROVISIONED: 'This Google/phone/email is not linked to an admin account.',
    FIREBASE_MISSING_HOURLY_RATE: 'Hourly rate is required to finish creating your engineer profile',
    FIREBASE_MISSING_COMPANY_NAME: 'Company name is required to finish creating your company profile',
    PHONE_IN_USE: 'An account with this phone number already exists',
  },
  GENERIC: {
    SERVER_ERROR: 'Something went wrong. Please try again later.',
    NOT_FOUND: 'Requested resource was not found',
    VALIDATION_FAILED: 'Validation failed',
  },
  SUBSCRIPTION: {
    ORDER_CREATED: 'Subscription order created',
    VERIFIED: 'Subscription activated',
    VERIFICATION_FAILED: 'Subscription payment verification failed',
    CANCELLED: 'Subscription cancelled — you have been moved to the Free plan',
    ALREADY_ON_PLAN: 'You are already on this plan',
    EDIT_LIMIT_REACHED: 'Free plan allows saving your profile up to 5 times. Upgrade to keep editing.',
    VIEW_LIMIT_REACHED: 'Free plan allows viewing up to 5 profiles. Upgrade to keep browsing full profiles.',
    CANNOT_DOWNGRADE_TO_FREE_DIRECTLY: 'Cancel your active subscription to move back to the Free plan',
    INVALID_PRODUCT_FOR_ROLE: 'This subscription product is not available for your account type',
    INVALID_TIER_FOR_PRODUCT: 'This plan is not available for the selected product',
    QUOTA_JOB_APPLICATIONS_REACHED: 'You have reached your job application limit for this plan. Upgrade to apply for more.',
    QUOTA_INTERVIEW_CALLS_REACHED: 'This plan has reached its interview call limit for the current period.',
    QUOTA_PROJECT_PARTNER_REACHED: 'You have reached your project partner request limit for this plan. Upgrade for more.',
    QUOTA_JOB_POSTS_REACHED: 'You have reached your job posting limit for this plan. Upgrade to post more jobs.',
    QUOTA_HIRES_REACHED: 'You have reached your hiring limit for this plan. Upgrade to hire more candidates.',
    SUBSCRIPTION_REQUIRED_TO_HIRE: 'A paid subscription is required to view full profiles and hire. Upgrade to continue.',
    SUBSCRIPTION_REQUIRED_TO_HIRE_PARTNER: 'A Candidate + Project Partner subscription is required to hire a project partner. Upgrade to continue.',
  },
  HIRE: {
    CANNOT_HIRE_SELF: 'You cannot hire yourself',
    ALREADY_HIRED: 'You have already hired this engineer',
    ALREADY_HIRED_PARTNER: 'You have already connected with this project partner',
    HIRED_SUCCESS: 'Candidate hired successfully',
    HIRED_PARTNER_SUCCESS: 'Project partner hired successfully',
  },
};
