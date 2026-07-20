import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import FirebaseAuthButtons from '../../components/auth/FirebaseAuthButtons';
import logo from '../../assets/logo.png';
import './LoginAdmin.css';

/**
 * Admin login — deliberately not linked from the public navbar, footer, or
 * the candidate/company login pages. Reached only by knowing the URL.
 * Calls POST /auth/admin/login against the separate Admin collection.
 *
 * Styled as its own "access console" theme (see LoginAdmin.css) rather than
 * reusing the shared Auth.css card — this page is a restricted door, not
 * another item in the candidate/company login family.
 */
export default function LoginAdmin() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showError } = useAlert();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (payload) => {
    setSubmitting(true);
    try {
      await login('admin', payload);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      showError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-console">
      <div className="admin-console-frame">
        <div className="admin-console-badge">
          <FiLock /> Restricted access &middot; administrators only
        </div>

        <div className="admin-console-card">
          <div className="admin-console-logo">
            <span className="admin-console-logo-chip">
              <img src={logo} alt="HourlyRecruit" />
            </span>
          </div>

          <h1>Admin console</h1>
          <p className="admin-console-subtitle">Sign in with an administrator account to continue.</p>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              error={errors.email?.message}
              register={register('email', { required: 'Email is required' })}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              register={register('password', { required: 'Password is required' })}
            />
            <Button type="submit" fullWidth loading={submitting}>Log in</Button>
          </form>

          <FirebaseAuthButtons
            role="admin"
            allowCreate={false}
            onSuccess={() => navigate('/admin/dashboard', { replace: true })}
            onError={showError}
          />

          <div className="admin-console-status">
            <span className="admin-console-status-dot" aria-hidden="true" />
            Session encrypted &middot; sign-in attempts are logged
          </div>
        </div>

        <span className="admin-console-back">
          Not an admin? <Link to="/login">Go back</Link>
        </span>
      </div>
    </div>
  );
}
