/**
 * Centralized JWT configuration so token settings are defined once
 * and imported wherever tokens are signed or verified.
 */
module.exports = {
  accessSecret: process.env.JWT_ACCESS_SECRET,
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  },
};
