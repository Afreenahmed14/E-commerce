import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FiUser } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import FirebaseAuthButtons from '../../components/auth/FirebaseAuthButtons';
import './Auth.css';

/**
 * Freelancer-branded login page — separate from the company login both in
 * copy/visual identity and in which backend endpoint it calls
 * (POST /auth/candidate/login), since candidates and companies are
 * separate collections.
 */
export default function LoginCandidate() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showError } = useAlert();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (payload) => {
    setSubmitting(true);
    try {
      await login('candidate', payload);
      navigate('/candidate/dashboard', { replace: true });
    } catch (err) {
      showError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page auth-page-candidate">
      <Card className="auth-card auth-card-accent-candidate">
        <div className="auth-role-icon auth-role-icon-candidate"><FiUser size={22} /></div>
        <h1>Engineer Login</h1>
        <p className="text-muted auth-subtitle">Manage your profile, resume, and unlock notifications.</p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            register={register('email', { required: 'Email is required' })}
          />
          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            register={register('password', { required: 'Password is required' })}
          />
          <div className="auth-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <Button type="submit" fullWidth loading={submitting}>Log In as Engineer</Button>
        </form>

        <FirebaseAuthButtons
          role="candidate"
          allowCreate={false}
          onSuccess={() => navigate('/candidate/dashboard', { replace: true })}
          onError={showError}
        />

        <p className="auth-switch">
          New engineer? <Link to="/register">Create an account</Link>
        </p>
        <p className="auth-switch">
          Not an engineer? <Link to="/login/company">Log in as a company</Link>
        </p>
      </Card>
    </div>
  );
}
