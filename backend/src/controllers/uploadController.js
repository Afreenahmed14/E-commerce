const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { uploadFile } = require('../helpers/uploadHelper');

/**
 * POST /api/v1/uploads/certificate
 * Uploads a single certificate file and appends it to the candidate's
 * `certificates[]` array. req.user IS the Candidate document.
 */
const uploadCertificate = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Certificate file is required');
  const { title, issuer, issueDate } = req.body;

  const fileUrl = await uploadFile(req.file, 'certificates');

  req.user.certificates.push({
    title: title || 'Certificate',
    issuer: issuer || '',
    issueDate: issueDate || null,
    fileUrl,
  });
  await req.user.save();

  return new ApiResponse(201, { certificates: req.user.certificates }, 'Certificate uploaded').send(res);
});

/**
 * DELETE /api/v1/uploads/certificate/:certId
 */
const deleteCertificate = asyncHandler(async (req, res) => {
  req.user.certificates = req.user.certificates.filter(
    (c) => c._id.toString() !== req.params.certId
  );
  await req.user.save();

  return new ApiResponse(200, { certificates: req.user.certificates }, 'Certificate removed').send(res);
});

/**
 * POST /api/v1/uploads/verification-document
 * Uploads a document (GST certificate, ID proof, etc.) used in the admin
 * verification workflow.
 */
const uploadVerificationDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Document file is required');
  const fileUrl = await uploadFile(req.file, 'verification-documents');
  return new ApiResponse(201, { fileUrl }, 'Document uploaded').send(res);
});

module.exports = { uploadCertificate, deleteCertificate, uploadVerificationDocument };
