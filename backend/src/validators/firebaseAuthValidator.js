const { body } = require('express-validator');

// Extra fields (hourlyRate / companyName) are only required on first-time
// sign-in (account creation), which depends on whether a matching account
// already exists — that's data-dependent, so it's enforced in
// firebaseAuthController.js rather than here.
const firebaseAuthValidator = [
  body('idToken').notEmpty().withMessage('Firebase idToken is required'),
];

module.exports = { firebaseAuthValidator };
