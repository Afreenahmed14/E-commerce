const express = require('express');
const router = express.Router();

const {
  uploadCertificate, deleteCertificate, uploadVerificationDocument,
} = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const { uploadDocument } = require('../middleware/uploadMiddleware');

router.post('/certificate', protect, uploadDocument.single('certificate'), uploadCertificate);
router.delete('/certificate/:certId', protect, deleteCertificate);
router.post('/verification-document', protect, uploadDocument.single('document'), uploadVerificationDocument);

module.exports = router;
