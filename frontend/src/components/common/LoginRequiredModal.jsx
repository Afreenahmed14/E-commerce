import { useNavigate } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import Modal from './Modal';
import Button from './Button';

/**
 * Shown in place of page content when a logged-out visitor tries to view
 * something that requires an account (e.g. a candidate profile). Unlike a
 * hard redirect to /login, this keeps them on the page and explains why —
 * closing it sends them back to where they came from.
 */
export default function LoginRequiredModal({ open, onClose }) {
  const navigate = useNavigate();

  return (
    <Modal isOpen={open} onClose={onClose} title="Login required">
      <div style={{ textAlign: 'center', padding: 'var(--space-2) 0' }}>
        <FiLock size={32} style={{ marginBottom: 'var(--space-3)', opacity: 0.6 }} />
        <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
          You need to be logged in to view this profile.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <Button onClick={() => navigate('/login')}>Log In</Button>
          <Button variant="secondary" onClick={() => navigate('/register')}>Sign Up</Button>
        </div>
      </div>
    </Modal>
  );
}
