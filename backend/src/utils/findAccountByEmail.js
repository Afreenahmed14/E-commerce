const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const Admin = require('../models/Admin');

const MODELS_BY_ROLE = { candidate: Candidate, company: Company, admin: Admin };

/**
 * Since Candidate, Company, and Admin are separate collections (see
 * models/Candidate.js for why), email uniqueness across the whole platform
 * has to be enforced at the application level by checking all three.
 * Returns the matching document (with its role attached) or null.
 */
const findAccountByEmail = async (email, { withPassword = false } = {}) => {
  if (!email) return null;
  const projection = withPassword ? '+password' : undefined;

  const [candidate, company, admin] = await Promise.all([
    Candidate.findOne({ email }).select(projection),
    Company.findOne({ email }).select(projection),
    Admin.findOne({ email }).select(projection),
  ]);

  return candidate || company || admin || null;
};

/**
 * Same cross-collection lookup as findAccountByEmail, but scoped to a single
 * role's collection — used by the Firebase auth flow, where the caller
 * already knows which collection (candidate/company/admin) it's working
 * against and shouldn't accidentally match a different role's document.
 */
const findAccountByFirebaseUid = (role, firebaseUid) => {
  const Model = MODELS_BY_ROLE[role];
  if (!Model || !firebaseUid) return null;
  return Model.findOne({ firebaseUid });
};

const findAccountByPhone = (role, phone) => {
  const Model = MODELS_BY_ROLE[role];
  if (!Model || !phone) return null;
  return Model.findOne({ phone });
};

const findAccountByEmailForRole = (role, email) => {
  const Model = MODELS_BY_ROLE[role];
  if (!Model || !email) return null;
  return Model.findOne({ email });
};

const getModelForRole = (role) => MODELS_BY_ROLE[role];

module.exports = {
  findAccountByEmail,
  findAccountByFirebaseUid,
  findAccountByPhone,
  findAccountByEmailForRole,
  getModelForRole,
  MODELS_BY_ROLE,
};
