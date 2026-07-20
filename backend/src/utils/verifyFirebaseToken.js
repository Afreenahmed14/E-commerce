const admin = require('../config/firebase');
const ApiError = require('./ApiError');

/**
 * Verifies a Firebase ID token (sent by the frontend after Google / Phone-OTP
 * / Email-link sign-in) and returns its decoded claims. Throws a 401 ApiError
 * on anything invalid/expired so callers can just await this and move on.
 */
const verifyFirebaseToken = async (idToken) => {
  if (!idToken) throw ApiError.badRequest('Firebase idToken is required');

  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    // The 401 the client sees is intentionally generic (don't leak verifier
    // internals), but the real cause — bad/missing service account creds,
    // project-id mismatch between frontend and backend, expired token,
    // clock skew, etc. — is almost always visible in `err.code`/`err.message`.
    // eslint-disable-next-line no-console
    console.error('[firebase] verifyIdToken failed:', err.code || err.name, '-', err.message);
    throw ApiError.unauthorized('Invalid or expired Firebase token');
  }
};

/**
 * Maps a Firebase decoded token's `firebase.sign_in_provider` to the
 * authProvider values stored on our own account documents.
 */
const mapSignInProvider = (decoded) => {
  const provider = decoded.firebase?.sign_in_provider;
  if (provider === 'google.com') return 'google';
  if (provider === 'phone') return 'phone';
  if (provider === 'emailLink' || provider === 'password') return 'firebase-email';
  return 'firebase-email';
};

module.exports = { verifyFirebaseToken, mapSignInProvider };