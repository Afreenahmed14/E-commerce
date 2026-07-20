import {
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

const EMAIL_LINK_STORAGE_KEY = 'hr_firebase_email_for_link';

/**
 * All three Firebase sign-in methods (Google popup, Phone OTP, Email
 * magic-link) funnel down to the same shape: get a Firebase ID token, hand
 * it to the backend at /auth/:role/firebase, which verifies it and returns
 * our own app JWT — see authService.js firebaseCandidate/firebaseCompany/
 * firebaseAdmin. Firebase itself is only ever used here, on the frontend;
 * the backend never talks to it except to verify tokens.
 */

// ---------- Google ----------
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return { idToken, firebaseUser: result.user };
};

// ---------- Phone OTP ----------
// `containerId` must be a DOM node id that's already mounted (an empty div
// is enough — reCAPTCHA renders invisibly by default).
export const setupRecaptcha = (containerId) => {
  return new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
};

// phoneNumber must be E.164, e.g. "+919876543210"
export const sendPhoneOtp = async (phoneNumber, recaptchaVerifier) => {
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  return confirmationResult; // hang onto this — confirmOtp needs it
};

export const confirmPhoneOtp = async (confirmationResult, code) => {
  const result = await confirmationResult.confirm(code);
  const idToken = await result.user.getIdToken();
  return { idToken, firebaseUser: result.user };
};

// ---------- Email magic link (passwordless) ----------
// This is deliberately a *different* flow from the existing local
// email/password login — it's Firebase-verified, passwordless sign-in.
// Step 1: request the link. `role`/`allowCreate`/`extra` are baked into the
// link's query string so FirebaseEmailLinkComplete.jsx (where the link
// lands) knows which role/account-creation-fields to use — the link may be
// opened later, in a different tab, with no app state available.
export const sendEmailSignInLink = async (email, { role, allowCreate = true, extra = {} } = {}) => {
  const params = new URLSearchParams({ role, allowCreate: String(allowCreate), ...extra });
  const actionCodeSettings = {
    url: `${window.location.origin}/auth/firebase/complete?${params.toString()}`,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  // Firebase needs the same email back when the link is opened, possibly on
  // another device/tab, so stash it locally.
  window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email);
};

// Step 2: called on the /auth/firebase/complete page once the person clicks
// the emailed link.
export const isEmailSignInLink = () => isSignInWithEmailLink(auth, window.location.href);

export const completeEmailSignIn = async (emailOverride) => {
  let email = emailOverride || window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY);
  if (!email) {
    throw new Error('Please re-enter the email address you used to request the sign-in link.');
  }
  const result = await signInWithEmailLink(auth, email, window.location.href);
  window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
  const idToken = await result.user.getIdToken();
  return { idToken, firebaseUser: result.user };
};

export const firebaseSignOutLocal = () => firebaseSignOut(auth);
