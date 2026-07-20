const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');

const {
  createJob, updateJob, deleteJob, getMyJobs, searchJobs, getJobById,
} = require('../controllers/jobController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { COMPANY } = require('../constants/roles');

const jobValidator = [
  body('title').trim().isLength({ min: 2, max: 150 }),
  body('description').trim().isLength({ min: 10, max: 5000 }),
  body('jobType').optional().isIn(['full-time', 'part-time', 'contract', 'internship']),
  body('skills').optional().isArray(),
  body('experienceMin').optional().isFloat({ min: 0 }),
  body('experienceMax').optional({ nullable: true }).isFloat({ min: 0 }),
  body('payType').optional().isIn(['yearly', 'monthly', 'weekly', 'hourly']),
  body('salaryMin').optional({ nullable: true }).isFloat({ min: 0 }),
  body('salaryMax').optional({ nullable: true }).isFloat({ min: 0 }),
  body('openings').optional().isInt({ min: 1 }),
];

// Public / candidate-visible
router.get('/search', optionalAuth, query('page').optional().isInt({ min: 1 }), validateRequest, searchJobs);

// Company-only — declared before /:id so "me" doesn't match as an id
router.get('/me', protect, authorize(COMPANY), getMyJobs);
router.post('/', protect, authorize(COMPANY), jobValidator, validateRequest, createJob);
router.put('/:id', protect, authorize(COMPANY), jobValidator, validateRequest, updateJob);
router.delete('/:id', protect, authorize(COMPANY), deleteJob);

router.get('/:id', optionalAuth, getJobById);

module.exports = router;
