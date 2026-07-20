const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const Skill = require('../models/Skill');
const Category = require('../models/Category');
const DeveloperType = require('../models/DeveloperType');
const { DEFAULT_DEVELOPER_TYPES } = require('../constants/developerTypes');

/**
 * GET /api/v1/taxonomy/skills
 * Public, read-only view of the admin-managed skill list — used to power
 * the Primary/Secondary skills dropdowns on the candidate profile form.
 * Only active skills are returned; inactive ones stay admin-only.
 */
const getPublicSkills = asyncHandler(async (req, res) => {
  const skills = await Skill.find({ isActive: true }).select('name category').sort('name');
  return new ApiResponse(200, { skills }, 'Skills fetched').send(res);
});

/**
 * GET /api/v1/taxonomy/categories
 * Public, read-only view of admin-managed categories.
 */
const getPublicCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().select('name').sort('name');
  return new ApiResponse(200, { categories }, 'Categories fetched').send(res);
});

/**
 * GET /api/v1/taxonomy/developer-types
 * Public, read-only view of the admin-managed "Developer Type" list —
 * powers the Developer Type dropdown on the candidate profile form, the
 * admin candidate filter, and the Browse Freelancers filter. Seeds the
 * collection with the original hardcoded defaults on first read.
 */
const getPublicDeveloperTypes = asyncHandler(async (req, res) => {
  const count = await DeveloperType.countDocuments();
  if (count === 0) {
    await DeveloperType.insertMany(
      DEFAULT_DEVELOPER_TYPES.map((name) => ({ name })),
      { ordered: false }
    ).catch(() => {});
  }
  const developerTypes = await DeveloperType.find({ isActive: true }).select('name').sort('name');
  return new ApiResponse(200, { developerTypes }, 'Developer types fetched').send(res);
});

module.exports = { getPublicSkills, getPublicCategories, getPublicDeveloperTypes };
