const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Generates a short-lived access token carrying the user's id and role.
 */
const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiry }
  );

/**
 * Generates a longer-lived refresh token used only to mint new access tokens.
 * Includes `role` so the refresh endpoint knows which collection
 * (Candidate/Company/Admin) to re-fetch the account from.
 */
const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0 },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiry }
  );

module.exports = { generateAccessToken, generateRefreshToken };
