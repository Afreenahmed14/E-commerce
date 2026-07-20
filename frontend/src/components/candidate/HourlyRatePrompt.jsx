import { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { candidateService } from '../../services/candidateService';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';

/**
 * Shown once a candidate lands on their dashboard with no hourlyRate set —
 * which only happens after signing up via Google / Phone OTP / Email link,
 * since those flows create the account first and don't force this field up
 * front the way the classic register form does. Companies pay a fixed fee
 * to unlock a contact, then hourlyRate is what they pay per hour once they
 * actually hire the engineer, so this is the one field that genuinely
 * can't stay empty.
 */
export default function HourlyRatePrompt({ open, onClose }) {
  const { refreshUser } = useAuth();
  const { showError } = useAlert();
  const [hourlyRate, setHourlyRate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = Number(hourlyRate);
    if (!hourlyRate || Number.isNaN(parsed) || parsed < 0) {
      showError('Enter a valid your charges per hour (₹0 or more).');
      return;
    }
    setSubmitting(true);
    try {
      await candidateService.updateMyProfile({ hourlyRate: parsed });
      await refreshUser();
      onClose();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not save your your charges per hour. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Set your charges per hour">
      <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
        You signed up without setting an your charges per hour. This is the rate companies
        will pay you once they hire you on an hourly pass, so let's get it set
        before you show up in search.
      </p>
      <form onSubmit={handleSubmit}>
        <Input
          label="your charges per hour (₹)"
          type="number"
          min="0"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          autoFocus
        />
        <Button type="submit" fullWidth loading={submitting}>Save & Continue</Button>
      </form>
      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: 'var(--space-3)',
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          textDecoration: 'underline',
          cursor: 'pointer',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        I'll do this later
      </button>
    </Modal>
  );
}
