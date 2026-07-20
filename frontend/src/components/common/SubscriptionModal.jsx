import { useEffect, useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { subscriptionService } from '../../services/subscriptionService';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import { SUBSCRIPTION_CATALOG, buildLiveCatalog, PRODUCTS, TIERS } from '../../utils/constants';
import Button from './Button';
import './SubscriptionModal.css';

/** Lazily loads the Razorpay Checkout script once per page load. */
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// Which products a candidate/company account can pick from. Candidates
// see both CANDIDATE_BASIC and CANDIDATE_PRO as tabs; companies only ever
// have COMPANY, so no tabs are shown for them.
const PRODUCTS_BY_ROLE = {
  candidate: [PRODUCTS.CANDIDATE_BASIC, PRODUCTS.CANDIDATE_PRO],
  company: [PRODUCTS.COMPANY],
};

/**
 * The subscription picker. Shown once per login session for Free-tier
 * candidates/companies (see DashboardLayout), and reused standalone
 * anywhere a paywalled action needs to prompt an upgrade.
 *
 * Candidates choose between two PRODUCTS (Candidate / Candidate + Project
 * Partners) via tabs, each with its own tiers. Companies only have one
 * product, so the tabs are skipped for them.
 *
 * closeable=false hides the dismiss button/backdrop-click-to-close for the
 * mandatory first-login prompt; every other usage should leave it true.
 */
export default function SubscriptionModal({ open, onClose, closeable = true }) {
  const { user, role, refreshUser } = useAuth();
  const { showError, showSuccess } = useAlert();
  const [processingTier, setProcessingTier] = useState(null);
  // Starts from the static catalog (instant render), then swaps in live
  // admin-configured prices — same pattern as PricingPage.
  const [catalog, setCatalog] = useState(SUBSCRIPTION_CATALOG);

  useEffect(() => {
    if (!open) return;
    subscriptionService.getPlans(role)
      .then((res) => setCatalog(buildLiveCatalog(res.data.products)))
      .catch(() => {});
  }, [open, role]);

  const availableProducts = PRODUCTS_BY_ROLE[role] || [PRODUCTS.CANDIDATE_BASIC];
  const [activeProduct, setActiveProduct] = useState(
    user?.subscription?.product && availableProducts.includes(user.subscription.product)
      ? user.subscription.product
      : availableProducts[0]
  );

  if (!open) return null;

  const currentProduct = user?.subscription?.product;
  const currentTier = user?.subscription?.tier || TIERS.FREE;
  const productDef = catalog[activeProduct] || SUBSCRIPTION_CATALOG[activeProduct];

  const handleSelect = async (tierId) => {
    if (tierId === TIERS.FREE) {
      onClose();
      return;
    }

    if (activeProduct === currentProduct && tierId === currentTier) {
      onClose();
      return;
    }

    setProcessingTier(tierId);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Could not load payment gateway. Check your connection.');

      const orderRes = await subscriptionService.createOrder(activeProduct, tierId);
      const { orderId, amount, currency, keyId } = orderRes.data;
      const tierLabel = productDef.tiers.find((t) => t.id === tierId)?.name || tierId;

      const razorpay = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'HourlyRecruit',
        description: `${productDef.label} — ${tierLabel} subscription`,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#2563eb' },
        handler: async (response) => {
          try {
            await subscriptionService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              product: activeProduct,
              tier: tierId,
            });
            await refreshUser();
            showSuccess(`You're now on ${productDef.label} — ${tierLabel}.`);
            onClose();
          } catch {
            showError('Payment succeeded but activation failed. Contact support if this persists.');
          } finally {
            setProcessingTier(null);
          }
        },
        modal: { ondismiss: () => setProcessingTier(null) },
      });

      razorpay.on('payment.failed', () => {
        showError('Payment failed. Please try again.');
        setProcessingTier(null);
      });

      razorpay.open();
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Could not start payment');
      setProcessingTier(null);
    }
  };

  return (
    <div className="sub-modal-overlay" onClick={() => closeable && onClose()}>
      <div className="sub-modal-content fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="sub-modal-header">
          <div>
            <h2>Choose your plan</h2>
            <p className="text-muted">
              {role === 'candidate'
                ? 'Pick a plan to apply for more jobs and get more interview calls.'
                : 'Pick a plan to post more jobs and hire more candidates.'}
            </p>
          </div>
          {closeable && (
            <button type="button" className="sub-modal-close" onClick={onClose} aria-label="Close">
              <FiX size={20} />
            </button>
          )}
        </div>

        {availableProducts.length > 1 && (
          <div className="sub-modal-tabs">
            {availableProducts.map((productId) => (
              <button
                key={productId}
                type="button"
                className={`sub-modal-tab ${activeProduct === productId ? 'is-active' : ''}`}
                onClick={() => setActiveProduct(productId)}
              >
                {(catalog[productId] || SUBSCRIPTION_CATALOG[productId]).label}
              </button>
            ))}
          </div>
        )}
        {productDef.tagline && <p className="text-muted sub-modal-tagline">{productDef.tagline}</p>}

        <div className="sub-modal-grid">
          {productDef.tiers.map((tier) => {
            const isCurrent = activeProduct === currentProduct && tier.id === currentTier;
            return (
              <div key={tier.id} className={`sub-plan-card ${tier.badge ? 'is-featured' : ''} ${isCurrent ? 'is-current' : ''}`}>
                {tier.badge && <div className="sub-plan-badge">{tier.badge}</div>}
                <h3>{tier.name}</h3>
                <div className="sub-plan-price">
                  <span className="amount">₹{tier.price}</span>
                  {tier.period && <span className="period">/{tier.period}</span>}
                </div>
                <ul className="sub-plan-features">
                  {tier.features.map((f) => (
                    <li key={f}><FiCheck size={16} /> {f}</li>
                  ))}
                </ul>
                <Button
                  fullWidth
                  variant={tier.badge ? 'primary' : 'outline'}
                  loading={processingTier === tier.id}
                  disabled={isCurrent || processingTier !== null}
                  onClick={() => handleSelect(tier.id)}
                >
                  {isCurrent ? 'Current Plan' : tier.id === TIERS.FREE ? 'Continue with Free' : `Get ${tier.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
