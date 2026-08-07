const express = require('express');
const router = express.Router();

const { getAdminInsights } = require('../controllers/adminInsightsController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const aiRateLimit = require('../middleware/aiRateLimit');
const { ADMIN } = require('../constants/roles');

router.get('/', protect, authorize(ADMIN), aiRateLimit, getAdminInsights);

module.exports = router;
