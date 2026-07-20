const admin = require('firebase-admin');

/**
 * Firebase Admin SDK, used server-side only to verify ID tokens minted by
 * the frontend Firebase SDK (Google / Phone-OTP / Email-link sign-in). We
 * never use the Admin SDK to manage users directly — Firebase remains the
 * identity provider, and our own Candidate/Company/Admin collections remain
 * the source of truth for app data, linked via `firebaseUid`.
 *
 * Provide credentials via three env vars (service account values), rather
 * than a JSON key file, so this works cleanly on Render/Vercel-style hosts:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (paste the key with literal \n escapes; we
 *                           unescape them below)
 */
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    // eslint-disable-next-line no-console
    console.warn(
      '[firebase] FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY are not fully set — ' +
        'Firebase-based login (Google/Phone/Email-link) will fail until they are configured.'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

module.exports = admin;
