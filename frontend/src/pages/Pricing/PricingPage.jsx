import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { SUBSCRIPTION_CATALOG, buildLiveCatalog, PRODUCTS, TIERS } from '../../utils/constants';
import { subscriptionService } from '../../services/subscriptionService';
import Button from '../../components/common/Button';
import SubscriptionModal from '../../components/common/SubscriptionModal';
import '../../components/common/SubscriptionModal.css';
import './PricingPage.css';

/**
 * Public marketing pricing page — linked from the navbar. Anyone (logged
 * out, candidate, or company) can browse it. Shows all 3 products; picking
 * a paid tier:
 *  - Logged out → sent to register first (checkout needs an account).
 *  - Logged in as candidate/company → opens the same checkout modal used
 *    elsewhere in the app, so the flow is identical everywhere.
 *  - Admin → plans aren't relevant, so the CTA is just hidden.
 */
export default function PricingPage() {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  // Starts from the static catalog so the page renders instantly, then
  // swaps in live admin-configured prices once they arrive — this is what
  // makes an admin pricing change show up here without a redeploy.
  const [catalog, setCatalog] = useState(SUBSCRIPTION_CATALOG);

  useEffect(() => {
    subscriptionService.getPlans()
      .then((res) => setCatalog(buildLiveCatalog(res.data.products)))
      .catch(() => {}); // keep the static fallback already in state
  }, []);

  const isGatedRole = isAuthenticated && (role === 'candidate' || role === 'company');

  const handleChoose = (tierId) => {
    if (tierId === TIERS.FREE) {
      navigate(isAuthenticated ? '/' : '/register');
      return;
    }
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    if (isGatedRole) setModalOpen(true);
  };

  // Show every product to a visitor/company/candidate alike — the CTA on
  // a product that doesn't match the logged-in role's account simply sends
  // them to register (a company clicking a candidate plan, etc.) rather
  // than being hidden, since a logged-out visitor hasn't picked a role yet.
  const products = Object.values(PRODUCTS).map((id) => catalog[id]).filter(Boolean);

  return (
    <div className="container-section-pricing-page">
      <div className="pricing-header">
        <h1>Simple, transparent pricing</h1>
        <p className="text-muted">
          Fill your profile for free. Upgrade any time to apply for more jobs, get more interview
          calls, find project partners, or post and hire more as a company.
        </p>
      </div>

      {products.map((product) => (
        <div key={product.id} className="pricing-product-section">
          <div className="pricing-product-header">
            <h2>{product.label}</h2>
            {product.tagline && <p className="text-muted">{product.tagline}</p>}
          </div>

          <div className="sub-modal-grid pricing-grid">
            {product.tiers.map((tier) => (
              <div key={tier.id} className={`sub-plan-card ${tier.badge ? 'is-featured' : ''}`}>
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
                  onClick={() => handleChoose(tier.id)}
                >
                  {tier.id === TIERS.FREE ? 'Get Started Free' : `Get ${tier.name}`}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      

      {isGatedRole && (
        <SubscriptionModal open={modalOpen} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
