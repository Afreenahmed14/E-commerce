const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getCloudinary } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

/**
 * Uploads a Multer memory-storage file buffer to Cloudinary under the
 * given folder (e.g. 'resumes', 'profile-images', 'certificates', 'logos')
 * and returns a permanent secure download URL to be stored on the Mongo doc.
 *
 * @param {Express.Multer.File} file
 * @param {string} folder
 * @returns {Promise<string>} secure delivery URL
 */
const uploadFile = async (file, folder) => {
  if (!file) throw ApiError.badRequest('No file provided');

  const cloudinary = getCloudinary();
  const isImage = file.mimetype.startsWith('image/');
  const resourceType = isImage ? 'image' : 'raw';

  const ext = path.extname(file.originalname);
  const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '_');
  const uniqueName = `${uuidv4()}-${baseName}`;
  // Images: Cloudinary appends the format itself, so keep the public_id
  // extension-free. Raw files (e.g. PDFs) use the public_id verbatim as the
  // served filename, so the extension must be included there.
  const publicId = isImage ? `${folder}/${uniqueName}` : `${folder}/${uniqueName}${ext}`;

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: resourceType, overwrite: false },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(file.buffer);
  });

  return uploadResult.secure_url;
};

/**
 * Deletes a previously uploaded file given its secure delivery URL.
 * Silently no-ops if the URL doesn't map to a Cloudinary asset
 * (e.g. empty string / default placeholder), so callers can call this
 * unconditionally when replacing a profile image, resume, etc.
 */
const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  const match = fileUrl.match(/\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return;

  const [, resourceType, rest] = match;
  // Images are delivered with a format extension that isn't part of the
  // public_id; raw assets use the full path (incl. extension) as-is.
  const publicId = resourceType === 'image' ? rest.replace(/\.[^/.]+$/, '') : rest;

  try {
    const cloudinary = getCloudinary();
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    // Non-fatal: file may already be gone. Log for observability only.
    console.warn(`[cloudinaryService] Could not delete file ${publicId}: ${err.message}`);
  }
};

module.exports = { uploadFile, deleteFile };
