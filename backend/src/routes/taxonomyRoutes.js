const express = require('express');
const router = express.Router();

const { getPublicSkills, getPublicCategories, getPublicDeveloperTypes } = require('../controllers/taxonomyController');

// Fully public — read-only reference data used to populate dropdowns on
// the candidate/company profile forms. The admin-only write endpoints for
// managing this same data live under /api/v1/admin/skills, /categories,
// and /developer-types.
router.get('/skills', getPublicSkills);
router.get('/categories', getPublicCategories);
router.get('/developer-types', getPublicDeveloperTypes);

module.exports = router;
