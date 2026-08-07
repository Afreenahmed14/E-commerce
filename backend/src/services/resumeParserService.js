const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const ApiError = require('../utils/ApiError');

const MAX_EXTRACTED_CHARS = 15000; // keeps AI prompt payloads bounded

/**
 * Extracts plain text from an uploaded resume buffer. Supports PDF and
 * DOCX (the two formats requested across Feature 1 and Feature 2). Image
 * resumes are handled separately by the caller (sent to the AI as a vision
 * input) since OCR-vs-vision is a caller-level decision, not a parsing one.
 */
const extractTextFromBuffer = async (buffer, mimetype, originalName = '') => {
  const lowerName = originalName.toLowerCase();

  if (mimetype === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const result = await pdfParse(buffer);
    return truncate(result.text);
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return truncate(result.value);
  }

  throw ApiError.badRequest('Unsupported resume format. Please upload a PDF or DOCX file.');
};

const truncate = (text) => {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  return clean.length > MAX_EXTRACTED_CHARS ? clean.slice(0, MAX_EXTRACTED_CHARS) : clean;
};

module.exports = { extractTextFromBuffer };
