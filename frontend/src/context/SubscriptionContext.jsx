import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from '../hooks/useAuth';

export const SubscriptionContext = createContext(null);

/**
 * Tracks the current candidate/company's subscription (plan/status/
 * verification) and exposes openSubscriptionModal(reason) so any component
 * — CandidateCard, CandidateDetails, EditProfile, the post-login prompt —
 * can trigger the same 3-tier upgrade popup without prop-drilling.
 *
 * Auto-opens the popup once per login session for free-plan (or lapsed)
 * candidate/company accounts, satisfying "after login the popup should
 * come" — but only once, so it doesn't nag on every navigation.
 */
export function SubscriptionProvider({ children }) {
  const { isAuthenticated, role, user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState('');
  const autoPromptedFor = useRef(null);

  const isGated = isAuthenticated && (role === 'candidate' || role === 'company');

  const refresh = useCallback(async () => {
    if (!isGated) {
      setSubscription(null);
      return null;
    }
    const res = await subscriptionService.getMine();
    setSubscription(res.data);
    return res.data;
  }, [isGated]);

  useEffect(() => {
    if (isGated) refresh();
    else setSubscription(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGated, user?._id]);

  // Auto-prompt once per login for a free/lapsed account.
  useEffect(() => {
    if (!isGated || !subscription || !user?._id) return;
    if (autoPromptedFor.current === user._id) return;
    if (!subscription.isActivePaidPlan) {
      autoPromptedFor.current = user._id;
      setModalReason('welcome');
      setModalOpen(true);
    } else {
      autoPromptedFor.current = user._id;
    }
  }, [isGated, subscription, user?._id]);

  const openSubscriptionModal = useCallback((reason = 'generic') => {
    setModalReason(reason);
    setModalOpen(true);
  }, []);

  const closeSubscriptionModal = useCallback(() => setModalOpen(false), []);

  const value = {
    subscription,
    isActivePaidPlan: !!subscription?.isActivePaidPlan,
    refreshSubscription: refresh,
    modalOpen,
    modalReason,
    openSubscriptionModal,
    closeSubscriptionModal,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
