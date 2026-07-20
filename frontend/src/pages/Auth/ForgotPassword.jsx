import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import './Auth.css';

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async ({ email }) => {
    setSubmitting(true);
    try {
      await authService.forgotPassword(email);
    } finally {
      // Always show the same success state, regardless of whether the email
      // exists — this mirrors the backend's intentionally generic response.
      setSubmitted(true);
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1>Forgot your password?</h1>
        <p className="text-muted auth-subtitle">
          Enter your email and we'll send you a link to reset it.
        </p>

        {submitted ? (
          <div className="auth-success">
            If an account with that email exists, a reset link has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email"
              type="email"
              error={errors.email?.message}
              register={register('email', { required: 'Email is required' })}
            />
            <Button type="submit" fullWidth loading={submitting}>Send Reset Link</Button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </Card>
    </div>
  );
}
