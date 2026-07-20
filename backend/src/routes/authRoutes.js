const express = require('express');
const router = express.Router();

const {
  registerCandidate, registerCompany,
  loginCandidate, loginCompany, loginAdmin,
  logout, refresh, getMe, forgotPassword, resetPassword,
} = require('../controllers/authController');
const {
  firebaseAuthCandidate, firebaseAuthCompany, firebaseAuthAdmin,
} = require('../controllers/firebaseAuthController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  registerCandidateValidator, registerCompanyValidator, loginValidator,
  forgotPasswordValidator, resetPasswordValidator,
} = require('../validators/authValidator');
const { firebaseAuthValidator } = require('../validators/firebaseAuthValidator');

// Candidates and companies are separate collections (see models/Candidate.js),
// so each gets its own register/login endpoint rather than one generic
// "role in the body" endpoint — this also lets each role's login page hit
// a URL that matches its own flow.
router.post('/candidate/register', registerCandidateValidator, validateRequest, registerCandidate);
router.post('/candidate/login', loginValidator, validateRequest, loginCandidate);

router.post('/company/register', registerCompanyValidator, validateRequest, registerCompany);
router.post('/company/login', loginValidator, validateRequest, loginCompany);

// No public admin registration — admins are provisioned directly in the DB
// or via a seed script (see docs/DEPLOYMENT.md).
router.post('/admin/login', loginValidator, validateRequest, loginAdmin);

// Firebase-verified sign-in (Google / Phone-OTP / Email-link), one endpoint
// per role. Candidate/company: creates the account on first sign-in if none
// matches; admin: only links/logs in an already-provisioned account, never
// creates one.
router.post('/candidate/firebase', firebaseAuthValidator, validateRequest, firebaseAuthCandidate);
router.post('/company/firebase', firebaseAuthValidator, validateRequest, firebaseAuthCompany);
router.post('/admin/firebase', firebaseAuthValidator, validateRequest, firebaseAuthAdmin);

// Shared across all roles — role is derived from the authenticated token.
router.post('/logout', protect, logout);
router.post('/refresh', refresh);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPasswordValidator, validateRequest, forgotPassword);
router.post('/reset-password', resetPasswordValidator, validateRequest, resetPassword);

module.exports = router;
