const express = require('express');
const router = express.Router();

const {
  getMyProfile, updateMyProfile, deleteMyProfile,
  uploadResume, uploadProfileImage, searchCandidates, getCandidateById,
} = require('../controllers/candidateController');
const {
  hireCandidate, getHiredByForCandidate, getPartnerHiresForCandidate,
} = require('../controllers/hireController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { updateCandidateValidator, searchCandidateValidator } = require('../validators/candidateValidator');
const { uploadDocument, uploadImage } = require('../middleware/uploadMiddleware');
const { CANDIDATE, COMPANY } = require('../constants/roles');

// IMPORTANT: specific routes (e.g. /search, /me/profile) must be declared
// before the generic /:id route, or Express will match "me"/"search" as an :id.

// Public
router.get('/search', optionalAuth, searchCandidateValidator, validateRequest, searchCandidates);

// Candidate-only (self-service)
router.get('/me/profile', protect, authorize(CANDIDATE), getMyProfile);
router.put('/me/profile', protect, authorize(CANDIDATE), updateCandidateValidator, validateRequest, updateMyProfile);
router.delete('/me/profile', protect, authorize(CANDIDATE), deleteMyProfile);
router.post('/me/resume', protect, authorize(CANDIDATE), uploadDocument.single('resume'), uploadResume);
router.post('/me/image', protect, authorize(CANDIDATE), uploadImage.single('image'), uploadProfileImage);

// Who has hired me (as a company hire or a project-partner hire), and who
// I've hired as project partners — both two-segment paths, so (like /me/profile
// above) they're unambiguous against the single-segment /:id below regardless
// of declaration order, but are kept together with the other /me/* routes.
router.get('/me/hired-by', protect, authorize(CANDIDATE), getHiredByForCandidate);
router.get('/me/project-partners', protect, authorize(CANDIDATE), getPartnerHiresForCandidate);

// Hire Now (company hiring this candidate) / Get Project Partner (a fellow
// candidate hiring this candidate). Role-aware inside the controller.
router.post('/:id/hire', protect, authorize(CANDIDATE, COMPANY), hireCandidate);

// Requires login — must be declared last since :id matches any single path segment
router.get('/:id', protect, getCandidateById);

module.exports = router;
