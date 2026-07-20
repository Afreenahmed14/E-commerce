/**
 * Wraps an async Express route/controller so thrown errors (or rejected
 * promises) are automatically forwarded to errorMiddleware via next(err),
 * removing the need for try/catch boilerplate in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
