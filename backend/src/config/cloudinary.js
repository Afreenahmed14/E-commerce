const { v2: cloudinary } = require('cloudinary');

/**
 * Configures the Cloudinary SDK using credentials supplied via environment
 * variables. Used exclusively for media storage (resumes, images, logos,
 * certificates) in place of the previous Firebase Storage integration.
 */
let configured = false;

const getCloudinary = () => {
  if (configured) return cloudinary;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  configured = true;
  console.log('[Cloudinary] SDK configured');
  return cloudinary;
};

module.exports = { getCloudinary };
