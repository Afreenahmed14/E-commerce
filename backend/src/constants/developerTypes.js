/**
 * Default "Developer Type" options, used only to seed the DeveloperType
 * collection the first time it's queried (see
 * adminController.getDeveloperTypes / ensureDeveloperTypesSeeded). The
 * live, editable list lives in MongoDB from then on — admins add/remove
 * types from the dashboard and they show up everywhere this list is used
 * (candidate profile dropdown, admin candidate filter, Browse Freelancers
 * filter) without needing a code change.
 */
const DEFAULT_DEVELOPER_TYPES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Java Developer',
  'Mobile Developer',
];

module.exports = { DEFAULT_DEVELOPER_TYPES };
