const express = require('express');
const router = express.Router();

const admin = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { ADMIN } = require('../constants/roles');

router.use(protect, authorize(ADMIN));

router.get('/dashboard', admin.getDashboardStats);

router.get('/users', admin.getAllUsers);
router.get('/users/:id', admin.getUserDetail);
router.patch('/users/:id/status', admin.updateUserStatus);
router.delete('/users/:id', admin.deleteUser);

router.get('/candidates', admin.getAllCandidates);
router.patch('/candidates/:id/developer-type', admin.updateCandidateDeveloperType);
router.get('/companies', admin.getAllCompanies);

router.get('/settings/pricing', admin.getPricingSettings);
router.patch('/settings/pricing', admin.updatePricingSettings);

router.get('/verifications', admin.getVerificationRequests);
router.patch('/verifications/:id', admin.reviewVerificationRequest);

router.get('/categories', admin.getCategories);
router.post('/categories', admin.createCategory);
router.delete('/categories/:id', admin.deleteCategory);

router.get('/skills', admin.getSkills);
router.post('/skills', admin.createSkill);
router.delete('/skills/:id', admin.deleteSkill);

router.get('/developer-types', admin.getDeveloperTypes);
router.post('/developer-types', admin.createDeveloperType);
router.delete('/developer-types/:id', admin.deleteDeveloperType);

router.get('/reviews', admin.getAllReviews);
router.delete('/reviews/:id', admin.deleteReviewAsAdmin);

module.exports = router;
