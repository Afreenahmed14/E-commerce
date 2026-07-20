import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import './Input.css';

/**
 * Controlled/uncontrolled text input designed to plug directly into
 * React Hook Form's `register()` spread, with built-in label + error display.
 *
 * For type="password" fields, this renders a show/hide eye toggle so the
 * person can check what they typed instead of the field silently masking
 * it. Pass `hint` to show helper text (e.g. password strength rules) below
 * the field.
 */
export default function Input({ label, error, id, type = 'text', register, hint, ...rest }) {
  const inputId = id || rest.name;
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  return (
    <div className="form-field">
      {label && <label htmlFor={inputId} className="form-label">{label}</label>}
      {isPassword ? (
        <div className="form-input-password-wrapper">
          <input
            id={inputId}
            type={visible ? 'text' : 'password'}
            className={`form-input ${error ? 'form-input-error' : ''}`}
            {...(register || {})}
            {...rest}
          />
          <button
            type="button"
            className="form-input-password-toggle"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
      ) : (
        <input
          id={inputId}
          type={type}
          className={`form-input ${error ? 'form-input-error' : ''}`}
          {...(register || {})}
          {...rest}
        />
      )}
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
