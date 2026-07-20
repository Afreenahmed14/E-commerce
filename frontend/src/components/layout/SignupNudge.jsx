import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiX, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import './SignupNudge.css';

const SHOW_EVERY_MS = 60 * 1000;
const AUTO_HIDE_MS = 10 * 1000;
const DISMISS_KEY = 'hr_signup_nudge_dismissed';

/**
 * A small, dismissible reminder to sign up / log in, aimed at logged-out
 * visitors browsing the public site. Rather than nagging on every scroll
 * event, it only re-checks once every 60 seconds, and only shows itself if
 * the person has actually scrolled at least once since the last time it
 * appeared — so it never fires on a page someone opened and immediately
 * left alone. Permanently dismissible for the session via the close button.
 */
export default function SignupNudge() {
  const { isAuthenticated, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const hasScrolledRef = useRef(false);
  const dismissedRef = useRef(sessionStorage.getItem(DISMISS_KEY) === 'true');

  useEffect(() => {
    const onScroll = () => { hasScrolledRef.current = true; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (loading || isAuthenticated || dismissedRef.current) return undefined;

    const interval = setInterval(() => {
      if (dismissedRef.current || isAuthenticated) return;
      if (hasScrolledRef.current) {
        setVisible(true);
        hasScrolledRef.current = false;
      }
    }, SHOW_EVERY_MS);

    return () => clearInterval(interval);
  }, [loading, isAuthenticated]);

  useEffect(() => {
    if (!visible) return undefined;
    const timeout = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(timeout);
  }, [visible]);

  const dismissForSession = () => {
    dismissedRef.current = true;
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  };

  if (loading || isAuthenticated || !visible) return null;

  return (
    <div className="signup-nudge fade-in" role="dialog" aria-live="polite">
      <button className="signup-nudge-close" onClick={dismissForSession} aria-label="Dismiss">
        <FiX size={16} />
      </button>
      <div className="signup-nudge-icon"><FiUserPlus size={20} /></div>
      <div>
        <p className="signup-nudge-title">New here?</p>
        <p className="signup-nudge-text">Create a free account to browse, bookmark, and unlock engineers.</p>
      </div>
      <div className="signup-nudge-actions">
        <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setVisible(false)}>Sign up</Link>
        <Link to="/login" className="btn btn-outline btn-sm" onClick={() => setVisible(false)}>Log in</Link>
      </div>
    </div>
  );
}
