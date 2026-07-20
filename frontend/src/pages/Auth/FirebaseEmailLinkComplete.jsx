import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { isEmailSignInLink, completeEmailSignIn } from '../../services/firebaseAuthService';
import './Auth.css';

const DASHBOARD_PATH = {
  candidate: '/candidate/dashboard',
  company: '/company/dashboard',
  admin: '/admin/dashboard',
};

// The page Firebase's email sign-in link points at (see
// firebaseAuthService.js sendEmailSignInLink's actionCodeSettings.url).
// `role` and, for first-time candidate/company sign-ins, the extra field
// (hourlyRate/companyName) travel here as query params set by whoever
// requested the link (Login pages omit them and pass allowCreate=false
// upstream; Register passes them through).
export default function FirebaseEmailLinkComplete() {
  const [searchParams] = useSearchParams();
  const { loginWithFirebase } = useAuth();
  const navigate = useNavigate();
  const { showError } = useAlert();

  const role = searchParams.get('role') || 'candidate';
  const allowCreate = searchParams.get('allowCreate') !== 'false';
  const hourlyRate = searchParams.get('hourlyRate');
  const companyName = searchParams.get('companyName');

  const [needsEmail, setNeedsEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = async (emailOverride) => {
    setBusy(true);
    try {
      if (!isEmailSignInLink()) {
        throw new Error('This link is invalid or has expired.');
      }
      const { idToken } = await completeEmailSignIn(emailOverride);
      const extra = role === 'candidate' ? { hourlyRate } : { companyName };
      const payload = allowCreate ? extra : { ...extra, createIfMissing: false };
      const user = await loginWithFirebase(role, idToken, payload);
      navigate(DASHBOARD_PATH[user.role] || '/', { replace: true });
    } catch (err) {
      if (err.message?.includes('re-enter')) {
        setNeedsEmail(true);
      } else {
        showError(err.response?.data?.message || err.message || 'Sign-in failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    finish(emailInput);
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1>Finishing sign-in…</h1>

        {needsEmail ? (
          <form onSubmit={handleManualSubmit}>
            <p className="text-muted auth-subtitle">
              Confirm the email address you used to request this link.
            </p>
            <Input
              label="Email address"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
            <Button type="submit" fullWidth loading={busy}>Continue</Button>
          </form>
        ) : (
          <Loader label="Verifying your sign-in link…" />
        )}
      </Card>
    </div>
  );
}
