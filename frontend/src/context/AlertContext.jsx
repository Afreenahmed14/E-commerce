import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';
import './AlertContext.css';

const AlertContext = createContext(null);

let idCounter = 0;

// Success/info popups still auto-dismiss after a bit so they don't pile up
// for routine confirmations; errors stay open until the person clicks OK,
// since those are the ones they most need to actually read.
const AUTO_DISMISS_MS = {
  error: null,
  success: 3500,
  info: 3500,
};

/**
 * Global popup/alert system. Every login failure and every save/update
 * failure (or success) across the app should route through this instead of
 * an inline banner, so the person always sees it the same way no matter
 * which form they're on.
 *
 * Renders as a centered modal dialog (not a corner toast) with an OK
 * button, so the message is impossible to miss — matches the app's other
 * modals (e.g. SubscriptionModal).
 *
 * Usage: const { showError, showSuccess } = useAlert();
 */
export function AlertProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setQueue((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((type, message) => {
    if (!message) return;
    const id = ++idCounter;
    setQueue((prev) => [...prev, { id, type, message }]);
    const duration = AUTO_DISMISS_MS[type];
    if (duration) {
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const showError = useCallback((message) => push('error', typeof message === 'string' ? message : 'Something went wrong. Please try again.'), [push]);
  const showSuccess = useCallback((message) => push('success', message), [push]);
  const showInfo = useCallback((message) => push('info', message), [push]);

  // Only the oldest pending alert is shown at a time, centered, so multiple
  // rapid-fire errors queue up one-at-a-time instead of stacking and
  // covering the screen.
  const current = queue[0];

  const ICONS = {
    error: <FiAlertCircle size={28} />,
    success: <FiCheckCircle size={28} />,
    info: <FiInfo size={28} />,
  };

  return (
    <AlertContext.Provider value={{ showError, showSuccess, showInfo }}>
      {children}
      {current && (
        <div className="alert-modal-overlay" role="presentation">
          <div
            className={`alert-modal alert-modal-${current.type} fade-in`}
            role="alertdialog"
            aria-modal="true"
            aria-live="assertive"
          >
            <div className={`alert-modal-icon alert-modal-icon-${current.type}`}>
              {ICONS[current.type]}
            </div>
            <p className="alert-modal-message">{current.message}</p>
            <button
              type="button"
              className="alert-modal-ok"
              onClick={() => dismiss(current.id)}
              autoFocus
            >
              OK
            </button>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within an AlertProvider');
  return ctx;
}
