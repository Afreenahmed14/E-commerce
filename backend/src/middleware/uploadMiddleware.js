const multer = require('multer');
const ApiError = require('../utils/ApiError');

/**
 * Multer memory storage — files are held as buffers and streamed straight
 * to Cloudinary in the controller, never written to local disk.
 */
const storage = multer.memoryStorage();

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_TYPES = ['application/pdf'];

const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
};

const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter(IMAGE_TYPES),
});

const uploadDocument = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter([...IMAGE_TYPES, ...DOCUMENT_TYPES]),
});

module.exports = { uploadImage, uploadDocument };
