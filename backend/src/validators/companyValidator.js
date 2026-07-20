const { body } = require('express-validator');

const updateCompanyValidator = [
  body('companyName').optional().trim().isLength({ min: 2, max: 150 }),
  body('website').optional().trim().isURL().withMessage('Website must be a valid URL'),
  body('industry').optional().trim().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('gstNumber').optional().trim().isLength({ max: 20 }),
];

module.exports = { updateCompanyValidator };
