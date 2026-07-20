import { useRef, useState } from 'react';
import { FiChrome, FiPhone, FiMail } from 'react-icons/fi';
import Button from '../common/Button';
import Input from '../common/Input';
import { useAuth } from '../../hooks/useAuth';
import {
  signInWithGoogle,
  setupRecaptcha,
  sendPhoneOtp,
  confirmPhoneOtp,
  sendEmailSignInLink,
} from '../../services/firebaseAuthService';
import './FirebaseAuthButtons.css';

/**
 * Drop-in Google / Phone-OTP / Email-magic-link sign-in, shared by every
 * login/register page. Talks to Firebase directly for the credential, then
 * hands the resulting ID token to loginWithFirebase() (AuthContext), which
 * calls the matching backend /auth/:role/firebase endpoint.
 *
 * `extra` supplies the fields only needed the first time a person signs in
 * for `role` (account creation): { hourlyRate } for candidate,
 * { companyName } for company. Admins are never created here, so `extra`
 * is irrelevant for role="admin" — see firebaseAuthController.js.
 */
export default function FirebaseAuthButtons({ role, extra = {}, allowCreate = true, onSuccess, onError }) {
  const { loginWithFirebase } = useAuth();
  const [busy, setBusy] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // null | 'phone' | 'email'

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [otpSent, setOtpSent] = useState(false);

  const [emailForLink, setEmailForLink] = useState('');
  const [linkSent, setLinkSent] = useState(false);

  const recaptchaContainerId = `recaptcha-container-${role}`;
  const recaptchaVerifierRef = useRef(null);

  const finishWithToken = async (idToken) => {
    try {
      const payload = allowCreate ? extra : { ...extra, createIfMissing: false };
      const user = await loginWithFirebase(role, idToken, payload);
      onSuccess?.(user);
    } catch (err) {
      onError?.(err.response?.data?.message || 'Sign-in failed. Please try again.');
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    onError?.('');
    try {
      const { idToken } = await signInWithGoogle();
      await finishWithToken(idToken);
    } catch (err) {
      onError?.(err.message || 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setBusy(true);
    onError?.('');
    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = setupRecaptcha(recaptchaContainerId);
      }
      const result = await sendPhoneOtp(phone, recaptchaVerifierRef.current);
      setConfirmation(result);
      setOtpSent(true);
    } catch (err) {
      onError?.(err.message || 'Could not send OTP. Check the number and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setBusy(true);
    onError?.('');
    try {
      const { idToken } = await confirmPhoneOtp(confirmation, otp);
      await finishWithToken(idToken);
    } catch (err) {
      onError?.(err.message || 'Invalid code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendEmailLink = async (e) => {
    e.preventDefault();
    setBusy(true);
    onError?.('');
    try {
      await sendEmailSignInLink(emailForLink, { role, allowCreate, extra });
      setLinkSent(true);
    } catch (err) {
      onError?.(err.message || 'Could not send the sign-in link. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="firebase-auth">
      <div className="firebase-auth-divider">or continue with</div>

      <div className="firebase-auth-methods">
        <Button
          type="button"
          variant="secondary"
         
          loading={busy && activePanel === null}
          onClick={handleGoogle}
        >
          <FiChrome size={18} /> Google
        </Button>

        <div className="firebase-auth-toggle">
          <Button
            type="button"
            variant="secondary"
           
            onClick={() => setActivePanel(activePanel === 'phone' ? null : 'phone')}
          >
            <FiPhone size={16} /> Phone
          </Button>
          <Button
            type="button"
            variant="secondary"
           
            onClick={() => setActivePanel(activePanel === 'email' ? null : 'email')}
          >
            <FiMail size={16} /> Email link
          </Button>
        </div>

        {activePanel === 'phone' && (
          <div className="firebase-phone-flow">
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <Input
                  label="Phone number"
                  type="tel"
                  placeholder="+919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Button type="submit" variant="secondary" fullWidth loading={busy}>
                  Send OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <Input
                  label="Enter the 6-digit code"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                <Button type="submit" variant="secondary" fullWidth loading={busy}>
                  Verify & Continue
                </Button>
              </form>
            )}
          </div>
        )}

        {activePanel === 'email' && (
          <div className="firebase-email-flow">
            {!linkSent ? (
              <form onSubmit={handleSendEmailLink}>
                <Input
                  label="Email address"
                  type="email"
                  value={emailForLink}
                  onChange={(e) => setEmailForLink(e.target.value)}
                  required
                />
                <Button type="submit" variant="secondary" fullWidth loading={busy}>
                  Send sign-in link
                </Button>
              </form>
            ) : (
              <p className="firebase-auth-note">
                Check <strong>{emailForLink}</strong> for a sign-in link. Opening it on this
                device will finish signing you in automatically.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Invisible reCAPTCHA host required by Firebase Phone Auth */}
      <div id={recaptchaContainerId} />
    </div>
  );
}
