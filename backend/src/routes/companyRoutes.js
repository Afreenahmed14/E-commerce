const express = require('express');
const router = express.Router();

const {
  getMyProfile, updateMyProfile, uploadLogo,
  bookmarkCandidate, removeBookmark, getBookmarks,
} = require('../controllers/companyController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { updateCompanyValidator } = require('../validators/companyValidator');
const { uploadImage } = require('../middleware/uploadMiddleware');
const { COMPANY } = require('../constants/roles');

router.use(protect, authorize(COMPANY));

router.get('/me/profile', getMyProfile);
router.put('/me/profile', updateCompanyValidator, validateRequest, updateMyProfile);
router.post('/me/logo', uploadImage.single('logo'), uploadLogo);

router.get('/me/bookmarks', getBookmarks);
router.post('/me/bookmarks/:candidateId', bookmarkCandidate);
router.delete('/me/bookmarks/:candidateId', removeBookmark);

module.exports = router;
