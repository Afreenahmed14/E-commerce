const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * AI calls (chatbot, ATS scoring, MCQ generation) cost real money per
 * request, unlike most CRUD routes, so they get a tighter dedicated limit
 * on top of whatever global limiter server.js may already apply elsewhere.
 * Keyed by authenticated user id when available, falling back to IP.
 */
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? req.user.id.toString() : ipKeyGenerator(req)),
  message: {
    success: false,
    message: 'Too many AI requests. Please wait a few minutes and try again.',
    data: null,
    errors: [],
  },
});

module.exports = aiRateLimit;
