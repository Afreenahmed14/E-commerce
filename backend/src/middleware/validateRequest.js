const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const MESSAGES = require('../constants/messages');

/**
 * Runs after an express-validator chain; collects any accumulated errors
 * and throws a single formatted ApiError, keeping controllers free of
 * validation boilerplate.
 */
const validateRequest = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(ApiError.badRequest(MESSAGES.GENERIC.VALIDATION_FAILED, errors));
  }
  next();
};

module.exports = validateRequest;
