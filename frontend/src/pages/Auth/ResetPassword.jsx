import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAlert } from '../../context/AlertContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { isStrongPassword, PASSWORD_HINT } from '../../utils/validators';
import './Auth.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const { showError } = useAlert();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) showError('This reset link is missing its token. Please request a new one.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async ({ password }) => {
    setSubmitting(true);
    try {
      await authService.resetPassword({ token, password });
      navigate('/login', { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      showError(err.response?.data?.message || 'Could not reset password. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1>Reset your password</h1>
        <p className="text-muted auth-subtitle">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="New Password"
            type="password"
            error={errors.password?.message}
            hint={!errors.password && PASSWORD_HINT}
            register={register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
              validate: (v) => isStrongPassword(v) || PASSWORD_HINT,
            })}
          />
          <Button type="submit" fullWidth loading={submitting} disabled={!token}>Reset Password</Button>
        </form>

        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </Card>
    </div>
  );
}
