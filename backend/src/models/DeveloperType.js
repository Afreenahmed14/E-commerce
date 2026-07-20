const mongoose = require('mongoose');

/**
 * Admin-managed list of "Developer Type" options. Replaces the old
 * hardcoded DEVELOPER_TYPES array in constants/developerTypes.js — that
 * file now only seeds this collection the first time it's read, so any
 * type an admin adds from the dashboard shows up everywhere the list is
 * used (candidate profile dropdown, admin candidate filter, Browse
 * Freelancers "Developer Type" filter) without a code change/deploy.
 */
const developerTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeveloperType', developerTypeSchema);
