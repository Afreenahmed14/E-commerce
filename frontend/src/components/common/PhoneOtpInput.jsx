import { useRef, useState } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { otpService } from '../../services/otpService';
import { useAlert } from '../../context/AlertContext';
import Input from './Input';
import Button from './Button';

/**
 * Phone number field that automatically sends an OTP as soon as the person
 * finishes entering a valid number (on blur), then lets them enter the code
 * inline to verify it — no separate "verification" screen needed.
 *
 * `value`/`onChange` behave like a normal controlled text input so this can
 * be dropped into any react-hook-form-driven form. `verified` marks the
 * number as already confirmed (e.g. loaded from the saved profile) and
 * `onVerified` fires once the code is confirmed with the backend.
 */
export default function PhoneOtpInput({ label = 'Phone', value, onChange, verified, onVerified, placeholder = '+91XXXXXXXXXX' }) {
  const { showError, showSuccess } = useAlert();
  const [stage, setStage] = useState('idle'); // idle | sending | sent
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const lastSentFor = useRef('');

  const isValidPhone = (phone) => (phone || '').replace(/\D/g, '').length >= 10;

  const sendOtp = async (phone) => {
    if (!isValidPhone(phone) || lastSentFor.current === phone) return;
    setStage('sending');
    try {
      const res = await otpService.sendPhoneOtp(phone);
      lastSentFor.current = phone;
      setStage('sent');
      setDevOtp(res.data?.devOtp || '');
      showSuccess('OTP sent to your phone.');
    } catch (err) {
      setStage('idle');
      showError(err.response?.data?.message || 'Could not send OTP');
    }
  };

  const handleBlur = () => {
    if (verified) return;
    if (value && value !== lastSentFor.current) sendOtp(value);
  };

  const verifyCode = async () => {
    if (!code) return showError('Enter the code you received');
    try {
      await otpService.verifyPhoneOtp(value, code);
      showSuccess('Phone number verified!');
      setStage('idle');
      setCode('');
      onVerified?.(value);
    } catch (err) {
      showError(err.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <div>
      <Input
        label={label}
        value={value || ''}
        onChange={(e) => { onChange?.(e.target.value); lastSentFor.current = ''; setStage('idle'); }}
        onBlur={handleBlur}
        placeholder={placeholder}
      />

      {verified ? (
        <p style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
          <FiCheckCircle /> Verified
        </p>
      ) : (
        <>
          {stage === 'sending' && <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Sending OTP…</p>}
          {stage === 'sent' && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
              <Button type="button" size="sm" onClick={verifyCode}>Verify</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => sendOtp(value)}>Resend</Button>
            </div>
          )}
          {devOtp && <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Dev mode OTP: {devOtp}</p>}
        </>
      )}
    </div>
  );
}
