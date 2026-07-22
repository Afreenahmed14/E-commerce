import { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { subscriptionService } from '../../services/subscriptionService';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { TIERS, SUBSCRIPTION_CATALOG, buildLiveCatalog } from '../../utils/constants';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import SubscriptionModal from '../../components/common/SubscriptionModal';
import { formatDate } from '../../utils/formatters';
import './SubscriptionPage.css';

// Human-readable labels for each quota key returned by /subscription/status.
const QUOTA_LABELS = {
  jobApplications: 'Job applications',
  interviewCalls: 'Interview calls',
  projectPartnerRequests: 'Project partner requests',
  jobPosts: 'Job posts',
  hires: 'Hires',
};

/**
 * Lets the account see its current product/tier + rolling-window quota
 * usage and open the picker to upgrade, or cancel back to Free. Shared by
 * both candidate and company dashboards — everything here reads from the
 * account's own subscription, no role-specific data needed.
 */
export default function SubscriptionPage() {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [catalog, setCatalog] = useState(SUBSCRIPTION_CATALOG);
  const { showError, showSuccess } = useAlert();

  const load = () => {
    setLoading(true);
    subscriptionService.getStatus()
      .then((res) => setStatus(res.data.subscription))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    subscriptionService.getPlans()
      .then((res) => setCatalog(buildLiveCatalog(res.data.products)))
      .catch(() => {});
  }, []);

  const handleModalClose = () => {
    setModalOpen(false);
    load();
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await subscriptionService.cancel();
      await refreshUser();
      load();
      showSuccess('Subscription cancelled. You are now on the Free plan.');
    } catch (err) {
      showError(err.response?.data?.message || 'Could not cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Loader label="Loading subscription…" />;

  const isFree = status?.tier === TIERS.FREE;
  const productLabel = status?.product ? (catalog[status.product] || SUBSCRIPTION_CATALOG[status.product])?.label : null;
  const quotaEntries = Object.entries(status?.quotas || {});

  return (
    <div>
      <div className="dashboard-header"><h1>Subscription</h1></div>

      <Card className="sub-status-card">
        <div className="sub-status-top">
          <div>
            <p className="text-muted" style={{ marginBottom: 4 }}>
              {productLabel}
            </p>
            <h2 style={{ textTransform: 'capitalize' }}>{status?.name}</h2>
          </div>
          {!isFree && (
            <span className={`sub-status-badge ${status?.isActive ? 'active' : 'inactive'}`}>
              {status?.isActive ? <FiCheckCircle /> : <FiAlertCircle />}
              {status?.isActive ? 'Active' : status?.status}
            </span>
          )}
        </div>

        <div className="sub-status-grid">
          {status?.profileEditLimit !== null && (
            <div>
              <p className="text-muted">Profile edits</p>
              <p>
                {status?.profileEditLimit === undefined || status?.profileEditLimit === null
                  ? 'Unlimited'
                  : `${status?.profileEditCount || 0} / ${status?.profileEditLimit} used`}
              </p>
            </div>
          )}

          {quotaEntries.map(([key, q]) => (
            <div key={key}>
              <p className="text-muted">{QUOTA_LABELS[key] || key}</p>
              <p>
                {q.limit === null
                  ? `${q.used} used · Unlimited`
                  : `${q.used} / ${q.limit} used${q.windowDays ? ` (per ${q.windowDays} days)` : ''}`}
              </p>
            </div>
          ))}

          {status?.endDate && (
            <div>
              <p className="text-muted">Renews / expires</p>
              <p>{formatDate(status.endDate)}</p>
            </div>
          )}
        </div>

        <div className="sub-status-actions">
          <Button onClick={() => setModalOpen(true)}>
            {isFree ? 'Upgrade plan' : 'Change plan'}
          </Button>
          {!isFree && (
            <Button variant="outline" loading={cancelling} onClick={handleCancel}>
              Cancel & move to Free
            </Button>
          )}
        </div>
      </Card>

      <SubscriptionModal open={modalOpen} onClose={handleModalClose} />
    </div>
  );
}
