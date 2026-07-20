import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import './Pricing.css';

// Friendly copy for the raw product/tier keys the backend catalog uses
// (see backend/src/constants/plans.js) — kept in sync manually since the
// catalog itself lives server-side.
const PRODUCT_META = {
  candidate_basic: {
    label: 'Candidate',
    description: 'Core job-search access — profile, applications, interview calls.',
  },
  candidate_pro: {
    label: 'Candidate + Project Partners',
    description: 'Everything in Candidate, plus Project Partner matching.',
  },
  company: {
    label: 'Company',
    description: 'Job posting and hiring caps for recruiting teams.',
  },
};

const TIER_META = {
  free: { label: 'Free', hint: 'Usually 0 — kept editable in case a promo needs a different free-tier cap.' },
  monthly: { label: 'Monthly', hint: null },
  yearly: { label: 'Yearly', hint: null },
};

const TIER_ORDER = ['free', 'monthly', 'yearly'];

export default function AdminPricing() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  // { [product]: { [tier]: '499' } } — kept as strings while editing so an
  // input can be blank mid-edit without fighting a Number() coercion.
  const [prices, setPrices] = useState({});

  useEffect(() => {
    adminService.getPricingSettings().then((res) => {
      const raw = res.data.prices || {};
      const asStrings = {};
      Object.entries(raw).forEach(([product, tiers]) => {
        asStrings[product] = {};
        Object.entries(tiers).forEach(([tier, price]) => {
          asStrings[product][tier] = String(price);
        });
      });
      setPrices(asStrings);
    }).finally(() => setLoading(false));
  }, []);

  const handleChange = (product, tier) => (e) => {
    setSaved(false);
    setPrices((p) => ({
      ...p,
      [product]: { ...p[product], [tier]: e.target.value },
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const payload = {};
      Object.entries(prices).forEach(([product, tiers]) => {
        payload[product] = {};
        Object.entries(tiers).forEach(([tier, value]) => {
          payload[product][tier] = Number(value);
        });
      });
      const res = await adminService.updatePricingSettings({ prices: payload });
      const raw = res.data.prices || {};
      const asStrings = {};
      Object.entries(raw).forEach(([product, tiers]) => {
        asStrings[product] = {};
        Object.entries(tiers).forEach(([tier, price]) => {
          asStrings[product][tier] = String(price);
        });
      });
      setPrices(asStrings);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save pricing.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading pricing…" />;

  const products = Object.keys(prices);

  return (
    <div className="admin-pricing-page">
      <div className="admin-pricing-hero">
        <h1>Pricing</h1>
        <p className="text-muted">
          Each category below is priced independently — changing one plan's price doesn't touch the others.
          Changes apply immediately across the site, no deploy or restart needed.
        </p>
      </div>

      <form onSubmit={save} className="admin-pricing-form">
        <div className="admin-pricing-grid">
          {products.map((product) => {
            const meta = PRODUCT_META[product] || { label: product, description: '' };
            const tiers = TIER_ORDER.filter((t) => t in prices[product]);
            return (
              <Card key={product} className="admin-pricing-category">
                <div className="admin-pricing-category-header">
                  <h2>{meta.label}</h2>
                  <p className="text-muted">{meta.description}</p>
                </div>

                <div className="admin-pricing-tiers">
                  {tiers.map((tier) => (
                    <div className="form-field admin-pricing-tier" key={tier}>
                      <label className="form-label">{TIER_META[tier]?.label || tier} price (₹)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="1"
                        value={prices[product][tier]}
                        onChange={handleChange(product, tier)}
                        required
                      />
                      {TIER_META[tier]?.hint && <span className="admin-pricing-tier-hint">{TIER_META[tier].hint}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="admin-pricing-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save all pricing'}
          </button>
          {saved && <span className="admin-pricing-saved">Saved</span>}
          {error && <span className="admin-pricing-error">{error}</span>}
        </div>
      </form>
    </div>
  );
}
