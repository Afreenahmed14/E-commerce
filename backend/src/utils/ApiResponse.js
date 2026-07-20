/**
 * Standard success response envelope used by every controller.
 * Guarantees a consistent { success, message, data, errors } shape.
 */
class ApiResponse {
  constructor(statusCode, data = null, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.errors = [];
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
      errors: this.errors,
    });
  }
}

module.exports = ApiResponse;
