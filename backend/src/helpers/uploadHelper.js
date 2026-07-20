const { uploadFile, deleteFile } = require('../services/cloudinaryService');

/**
 * Thin convenience wrapper so controllers don't import cloudinaryService
 * directly — keeps the storage provider swappable in one place.
 */
const replaceFile = async (file, folder, oldFileUrl) => {
  const newUrl = await uploadFile(file, folder);
  if (oldFileUrl) {
    await deleteFile(oldFileUrl); // best-effort cleanup, non-blocking on failure
  }
  return newUrl;
};

module.exports = { uploadFile, deleteFile, replaceFile };
