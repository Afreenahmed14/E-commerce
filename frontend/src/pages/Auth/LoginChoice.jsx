import { Link } from 'react-router-dom';
import { FiUser, FiBriefcase } from 'react-icons/fi';
import Card from '../../components/common/Card';
import './Auth.css';

/**
 * /login — lets the person choose which login experience they need.
 * Candidates and companies have distinct login pages/branding (see
 * LoginCandidate.jsx / LoginCompany.jsx) since they're different account
 * types with different backend endpoints. Admin login is intentionally
 * not linked from here — it's a separate, unadvertised route.
 */
export default function LoginChoice() {
  return (
    <div className="auth-page">
      <div className="role-choice-wrap">
        <h1 className="role-choice-title">How would you like to log in?</h1>
        <p className="text-muted role-choice-subtitle">Choose the account type that's yours.</p>

        <div className="role-choice-grid">
          <Link to="/login/candidate" className="role-choice-link">
            <Card hoverable className="role-choice-card role-choice-candidate">
              <FiUser size={32} />
              <h3>I'm an Engineer</h3>
              <p className="text-muted">Log in to manage your profile and track unlocks.</p>
            </Card>
          </Link>

          <Link to="/login/company" className="role-choice-link">
            <Card hoverable className="role-choice-card role-choice-company">
              <FiBriefcase size={32} />
              <h3>I'm a Company</h3>
              <p className="text-muted">Log in to search engineers and manage payments.</p>
            </Card>
          </Link>
        </div>

        <p className="auth-switch">
          New to HourlyRecruit? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
