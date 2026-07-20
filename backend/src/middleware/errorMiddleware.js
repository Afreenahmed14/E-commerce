const ApiError = require('../utils/ApiError');
const MESSAGES = require('../constants/messages');

/**
 * 404 handler for unmatched routes — placed after all route mounts.
 */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.originalUrl}`));
};

/**
 * Centralized error handler. Normalizes Mongoose/JWT/Multer errors into
 * ApiError shape and always responds with the standard API envelope.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || MESSAGES.GENERIC.SERVER_ERROR;
    const errors = [];

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = MESSAGES.GENERIC.VALIDATION_FAILED;
      Object.values(error.errors).forEach((e) => errors.push(e.message));
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyValue || {})[0];
      message = `${field ? `${field} ` : ''}already exists`;
    }

    // Invalid ObjectId cast
    if (error.name === 'CastError') {
      statusCode = 400;
      message = `Invalid value for ${error.path}`;
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = MESSAGES.AUTH.TOKEN_INVALID;
    }

    error = new ApiError(statusCode, message, errors, error.stack);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(error.stack);
  }

  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
    data: null,
    errors: error.errors || [],
  });
};

module.exports = { notFound, errorHandler };
