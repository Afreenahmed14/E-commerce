const mongoose = require('mongoose');
const authFieldsPlugin = require('./plugins/authFields');

/**
 * Admin document — a small, separate collection from Candidate/Company.
 * There is no public registration endpoint for admins; the first admin
 * account is created via a seed script or directly in the database
 * (see docs/DEPLOYMENT.md, "Creating the first admin").
 */
const adminSchema = new mongoose.Schema({}, { timestamps: true });

adminSchema.plugin(authFieldsPlugin, { role: 'admin' });

module.exports = mongoose.model('Admin', adminSchema);
