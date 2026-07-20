const { body, query } = require('express-validator');

const updateCandidateValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('headline').optional().trim().isLength({ max: 150 }),
  body('about').optional().trim().isLength({ max: 2000 }),
  body('experience').optional().isFloat({ min: 0 }).withMessage('Experience must be a positive number'),
  body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  body('primarySkills').optional().isArray().withMessage('Primary skills must be an array'),
  body('secondarySkills').optional().isArray().withMessage('Secondary skills must be an array'),
  body('languages').optional().isArray().withMessage('Languages must be an array'),
  body('availability')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'not-available']),
  body('developerType')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invalid developer type'),
  body('github').optional().trim().isURL().withMessage('Github must be a valid URL'),
  body('linkedin').optional().trim().isURL().withMessage('LinkedIn must be a valid URL'),
];

const searchCandidateValidator = [
  query('minRate').optional().isFloat({ min: 0 }),
  query('maxRate').optional().isFloat({ min: 0 }),
  query('minExperience').optional().isFloat({ min: 0 }),
  query('maxExperience').optional().isFloat({ min: 0 }),
  query('name').optional().trim().isLength({ max: 100 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = { updateCandidateValidator, searchCandidateValidator };
