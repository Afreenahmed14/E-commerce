import { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiArrowRight, FiXCircle, FiShield, FiCheck } from 'react-icons/fi';
import { FaCrown, FaBriefcase, FaPhoneAlt, FaUsers, FaCalendarAlt } from 'react-icons/fa';
import { subscriptionService } from '../../services/subscriptionService';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { TIERS, PRODUCTS, SUBSCRIPTION_CATALOG, buildLiveCatalog } from '../../utils/constants';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import SubscriptionModal from '../../components/common/SubscriptionModal';
import { formatDate } from '../../utils/formatters';
import './SubscriptionPage.css';

// Which product's plan cards to preview inline on this page. Candidates
// have two products (picked via tabs inside the modal); the plain
// Candidate product is the one shown here for a quick at-a-glance
// comparison — opening "Upgrade Plan" still surfaces both via tabs.
const PREVIEW_PRODUCT_BY_ROLE = {
  candidate: PRODUCTS.CANDIDATE_BASIC,
  company: PRODUCTS.COMPANY,
};

// Human-readable labels for each quota key returned by /subscription/status.
const QUOTA_LABELS = {
  jobApplications: 'Job applications',
  interviewCalls: 'Interview calls',
  projectPartnerRequests: 'Project partner requests',
  jobPosts: 'Job posts',
  hires: 'Hires',
};

// Icon + accent color for each quota key, used on the stat cards.
const QUOTA_META = {
  jobApplications: { icon: FaBriefcase, tone: 'blue' },
  interviewCalls: { icon: FaPhoneAlt, tone: 'orange' },
  projectPartnerRequests: { icon: FaUsers, tone: 'green' },
  jobPosts: { icon: FaBriefcase, tone: 'blue' },
  hires: { icon: FaUsers, tone: 'green' },
};

const TONES = ['blue', 'orange', 'green', 'purple'];

/**
 * Lets the account see its current product/tier + rolling-window quota
 * usage and open the picker to upgrade, or cancel back to Free. Shared by
 * both candidate and company dashboards — everything here reads from the
 * account's own subscription, no role-specific data needed.
 */
export default function SubscriptionPage() {
  const { refreshUser, role } = useAuth();
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

  // Which product's tier cards to preview inline (see note above).
  const previewProductId = status?.product || PREVIEW_PRODUCT_BY_ROLE[role] || PRODUCTS.CANDIDATE_BASIC;
  const previewProduct = catalog[previewProductId] || SUBSCRIPTION_CATALOG[previewProductId];

  // Build the row of stat cards: profile edits (if capped) + each quota + renewal date.
  const statCards = [];
  if (status?.profileEditLimit !== null) {
    statCards.push({
      key: 'profileEdits',
      icon: FaBriefcase,
      label: 'Profile edits',
      value: status?.profileEditLimit === undefined || status?.profileEditLimit === null
        ? null
        : status?.profileEditCount || 0,
      total: status?.profileEditLimit,
      caption: status?.profileEditLimit === undefined || status?.profileEditLimit === null
        ? 'Unlimited edits'
        : 'edits used',
    });
  }
  quotaEntries.forEach(([key, q]) => {
    const meta = QUOTA_META[key] || { icon: FaBriefcase, tone: 'blue' };
    statCards.push({
      key,
      icon: meta.icon,
      label: QUOTA_LABELS[key] || key,
      value: q.used,
      total: q.limit,
      caption: q.limit === null
        ? 'Unlimited'
        : q.windowDays
          ? `Used per ${q.windowDays} days`
          : 'used',
    });
  });

  return (
    <div>
      <div className="dashboard-header sub-header">
        <h1>Subscription<span className="sub-title-accent"> Plans</span></h1>
        <p className="text-muted">Manage your subscription and unlock more opportunities on HourlyRecruit.</p>
      </div>

      <Card className="sub-hero-card">
        <div className="sub-hero-decor" aria-hidden="true" />
        <div className="sub-hero-left">
          <div className="sub-hero-icon">
            <FaCrown size={26} />
          </div>
          <div>
            {productLabel && <p className="sub-hero-product">{productLabel}</p>}
            <h2 className="sub-hero-name">{status?.name}</h2>
            <p className="text-muted sub-hero-caption">Your current subscription plan</p>
          </div>
        </div>

        {!isFree && (
          <div className="sub-hero-right">
            <div className="sub-hero-divider" />
            <span className={`sub-status-badge ${status?.isActive ? 'active' : 'inactive'}`}>
              {status?.isActive ? <FiCheckCircle /> : <FiAlertCircle />}
              {status?.isActive ? 'Active' : status?.status}
            </span>
          </div>
        )}

        <div className="sub-hero-visual" aria-hidden="true">
          <span className="sub-hero-doodle">Upgrade<br />Get More<br />Opportunities</span>
          <span className="sub-hero-avatar"><FaCrown size={32} /></span>
        </div>
      </Card>

      <div className="sub-stats-grid">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const tone = TONES[i % TONES.length];
          return (
            <Card key={stat.key} className={`sub-stat-card sub-stat-${tone}`}>
              <div className="sub-stat-icon">
                <Icon size={20} />
              </div>
              <p className="sub-stat-label">{stat.label}</p>
              <p className="sub-stat-value">
                {stat.value !== null && <span>{stat.value}</span>}
                {stat.total ? <span className="sub-stat-total"> / {stat.total}</span> : null}
              </p>
              <div className="sub-stat-rule" />
              <p className="sub-stat-caption">{stat.caption}</p>
            </Card>
          );
        })}

        {status?.endDate && (
          <Card className="sub-stat-card sub-stat-purple">
            <div className="sub-stat-icon">
              <FaCalendarAlt size={20} />
            </div>
            <p className="sub-stat-label">Renews / Expires</p>
            <p className="sub-stat-value sub-stat-date">{formatDate(status.endDate)}</p>
            <div className="sub-stat-rule" />
            <p className="sub-stat-caption">Your plan renewal date</p>
          </Card>
        )}
      </div>

      <Card className="sub-footer-card">
        <div className="sub-footer-decor" aria-hidden="true" />
        <div className="sub-footer-left">
          <div className="sub-footer-icon">
            <FiShield size={22} />
          </div>
          <div>
            <h3 className="sub-footer-title">{isFree ? 'Unlock more' : "You're all set!"}</h3>
            <p className="text-muted sub-footer-caption">
              {isFree
                ? 'Upgrade to a paid plan to get more out of HourlyRecruit.'
                : 'Enjoy all the premium features and keep growing your career.'}
            </p>
          </div>
        </div>

        <div className="sub-footer-actions">
          <Button onClick={() => setModalOpen(true)}>
            <FaCrown size={14} style={{ marginRight: 8 }} />
            {isFree ? 'Upgrade plan' : 'Change plan'}
            <FiArrowRight size={16} style={{ marginLeft: 8 }} />
          </Button>
          {!isFree && (
            <Button variant="outline" loading={cancelling} onClick={handleCancel} className="sub-cancel-btn">
              <FiXCircle size={14} style={{ marginRight: 8 }} />
              Cancel & Move to Free
            </Button>
          )}
        </div>
      </Card>

      {previewProduct?.tiers?.length > 0 && (
        <div className="sub-plans-preview-grid">
          {previewProduct.tiers.map((tier, i) => {
            const isCurrent = status?.product === previewProductId && tier.id === status?.tier;
            const tone = TONES[i % TONES.length];
            return (
              <Card key={tier.id} className={`sub-preview-card sub-preview-${tone} ${isCurrent ? 'is-current' : ''}`}>
                {tier.badge && <span className="sub-preview-badge">{tier.badge}</span>}
                {isCurrent && <span className="sub-preview-badge sub-preview-badge-current">Current Plan</span>}
                <div className="sub-preview-top">
                  <span className="sub-preview-icon"><FaCrown size={16} /></span>
                  <div>
                    <strong>{tier.name}</strong>
                    <p className="text-muted">{tier.tagline || (i === 0 ? 'Get started with basic access.' : i === previewProduct.tiers.length - 1 ? 'For professionals and teams.' : 'For active job seekers.')}</p>
                  </div>
                </div>
                <ul className="sub-preview-features">
                  {tier.features.map((f) => (
                    <li key={f}><FiCheck size={14} /> {f}</li>
                  ))}
                </ul>
                <Button
                  fullWidth
                  variant={isCurrent ? 'outline' : tier.badge ? 'primary' : 'secondary'}
                  disabled={isCurrent}
                  onClick={() => setModalOpen(true)}
                >
                  {isCurrent ? 'Current Plan' : tier.id === TIERS.FREE ? 'Continue with Free' : `Get ${tier.name}`}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <SubscriptionModal open={modalOpen} onClose={handleModalClose} />
    </div>
  );
}
