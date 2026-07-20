const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

/**
 * Issues a fresh access + refresh token pair for a user, e.g. on login,
 * register, or refresh-token rotation.
 */
const issueTokenPair = (user) => ({
  accessToken: generateAccessToken(user),
  refreshToken: generateRefreshToken(user),
});

const verifyAccessToken = (token) => jwt.verify(token, jwtConfig.accessSecret);

const verifyRefreshToken = (token) => jwt.verify(token, jwtConfig.refreshSecret);

module.exports = { issueTokenPair, verifyAccessToken, verifyRefreshToken };
