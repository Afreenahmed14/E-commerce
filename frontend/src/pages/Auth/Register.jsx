import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import FirebaseAuthButtons from '../../components/auth/FirebaseAuthButtons';
import { ROLES } from '../../utils/constants';
import { isStrongPassword, PASSWORD_HINT } from '../../utils/validators';
import './Auth.css';

const DASHBOARD_PATH = {
  candidate: '/candidate/dashboard',
  company: '/company/dashboard',
};

export default function Register() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { role: ROLES.CANDIDATE },
  });
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { showError } = useAlert();
  const [submitting, setSubmitting] = useState(false);

  const selectedRole = watch('role');
  const phone = watch('phone');
  const hourlyRate = watch('hourlyRate');
  const companyName = watch('companyName');

  // Extra fields the backend needs only the first time this person signs in
  // via Firebase (account creation) — see firebaseAuthController.js. They
  // come straight from the same form fields shown above for this role, so
  // Google/Phone/Email-link sign-in reuses whatever the person already typed.
  const firebaseExtra =
    selectedRole === ROLES.CANDIDATE ? { phone, hourlyRate } : { companyName, phone };

  const handleFirebaseSuccess = (user) => {
    navigate(DASHBOARD_PATH[user.role] || '/', { replace: true });
  };

  const onSubmit = async (payload) => {
    setSubmitting(true);
    try {
      const user = await registerUser(selectedRole, payload);
      navigate(DASHBOARD_PATH[user.role] || '/', { replace: true });
    } catch (err) {
      showError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1>Create your account</h1>
        <p className="text-muted auth-subtitle">Join HourlyRecruit as an engineer or a company</p>

        <div className="role-toggle">
          <label className={`role-option ${selectedRole === ROLES.CANDIDATE ? 'role-option-active' : ''}`}>
            <input type="radio" value={ROLES.CANDIDATE} {...register('role')} />
            I'm an Engineer
          </label>
          <label className={`role-option ${selectedRole === ROLES.COMPANY ? 'role-option-active' : ''}`}>
            <input type="radio" value={ROLES.COMPANY} {...register('role')} />
            I'm a Company
          </label>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label={selectedRole === ROLES.COMPANY ? 'Contact Person Name' : 'Full Name'}
            error={errors.name?.message}
            register={register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })}
          />

          {selectedRole === ROLES.COMPANY && (
            <Input
              label="Company Name"
              error={errors.companyName?.message}
              register={register('companyName', { required: 'Company name is required' })}
            />
          )}

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
            hint={!errors.password && PASSWORD_HINT}
            register={register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
              validate: (v) => isStrongPassword(v) || PASSWORD_HINT,
            })}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 98765 43210"
            error={errors.phone?.message}
            register={register('phone', {
              minLength: { value: 7, message: 'Phone number looks too short' },
            })}
          />

          {selectedRole === ROLES.CANDIDATE && (
            // <Input
            //   label="your charges per hour(₹) — optional"
            //   type="number"
            //   min="0"
            //   placeholder="You can set this later from your dashboard"
            //   error={errors.hourlyRate?.message}
            //   register={register('hourlyRate', {
            //     min: { value: 0, message: 'Must be positive' },
            //   })}
            // />
            <></>
          )}

          <Button type="submit" fullWidth loading={submitting}>Create Account</Button>
        </form>

        <FirebaseAuthButtons
          role={selectedRole}
          extra={firebaseExtra}
          onSuccess={handleFirebaseSuccess}
          onError={showError}
        />

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
