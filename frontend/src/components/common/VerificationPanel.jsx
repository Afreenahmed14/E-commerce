import { useState } from 'react';
import { FiCheckCircle, FiPhone, FiMail } from 'react-icons/fi';
import { otpService } from '../../services/otpService';
import { useAlert } from '../../context/AlertContext';
import Button from './Button';
import Input from './Input';
import Card from './Card';

/**
 * Phone + Email OTP verification, available to every plan including Free
 * (see otpRoutes.js). Shown inside SubscriptionPage whenever the account
 * is active.
 *
 * `phoneVerified`/`emailVerified` come from the subscription status
 * payload; `onVerified` is called after a successful verify so the parent
 * can refresh its copy.
 */
export default function VerificationPanel({ phoneVerified, emailVerified, onVerified }) {
  const { showError, showSuccess } = useAlert();
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneStage, setPhoneStage] = useState('idle'); // idle | sent
  const [phoneDevOtp, setPhoneDevOtp] = useState('');

  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStage, setEmailStage] = useState('idle');
  const [emailDevOtp, setEmailDevOtp] = useState('');

  const sendPhoneOtp = async () => {
    if (!phone) return showError('Enter a phone number first');
    try {
      const res = await otpService.sendPhoneOtp(phone);
      setPhoneStage('sent');
      setPhoneDevOtp(res.data?.devOtp || '');
      showSuccess('OTP sent to your phone.');
    } catch (err) {
      showError(err.response?.data?.message || 'Could not send OTP');
    }
  };

  const verifyPhone = async () => {
    if (!phoneCode) return showError('Enter the code you received');
    try {
      await otpService.verifyPhoneOtp(phone, phoneCode);
      showSuccess('Phone number verified!');
      setPhoneStage('idle');
      onVerified?.();
    } catch (err) {
      showError(err.response?.data?.message || 'Verification failed');
    }
  };

  const sendEmailOtpFn = async () => {
    if (!email) return showError('Enter an email first');
    try {
      const res = await otpService.sendEmailOtp(email);
      setEmailStage('sent');
      setEmailDevOtp(res.data?.devOtp || '');
      showSuccess('OTP sent to your email.');
    } catch (err) {
      showError(err.response?.data?.message || 'Could not send OTP');
    }
  };

  const verifyEmail = async () => {
    if (!emailCode) return showError('Enter the code you received');
    try {
      await otpService.verifyEmailOtp(email, emailCode);
      showSuccess('Email verified!');
      setEmailStage('idle');
      onVerified?.();
    } catch (err) {
      showError(err.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <Card style={{ padding: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
      <h3 style={{ marginBottom: 'var(--space-4)' }}>Verification</h3>
      <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
        Verify your phone and email to get a Verified badge on your profile.
      </p>

      <div className="form-grid">
        <div>
          <label className="form-label"><FiPhone /> Phone number</label>
          {phoneVerified ? (
            <p style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <FiCheckCircle /> Verified
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
                <Button type="button" size="sm" onClick={sendPhoneOtp}>{phoneStage === 'sent' ? 'Resend' : 'Send OTP'}</Button>
              </div>
              {phoneStage === 'sent' && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Input value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
                  <Button type="button" size="sm" onClick={verifyPhone}>Verify</Button>
                </div>
              )}
              {phoneDevOtp && <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Dev mode OTP: {phoneDevOtp}</p>}
            </>
          )}
        </div>

        <div>
          <label className="form-label"><FiMail /> Email</label>
          {emailVerified ? (
            <p style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <FiCheckCircle /> Verified
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                <Button type="button" size="sm" onClick={sendEmailOtpFn}>{emailStage === 'sent' ? 'Resend' : 'Send OTP'}</Button>
              </div>
              {emailStage === 'sent' && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Input value={emailCode} onChange={(e) => setEmailCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
                  <Button type="button" size="sm" onClick={verifyEmail}>Verify</Button>
                </div>
              )}
              {emailDevOtp && <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Dev mode OTP: {emailDevOtp}</p>}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
