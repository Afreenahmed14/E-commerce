import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  FiGrid, FiUser, FiBookmark, FiBell, FiUsers,
  FiBriefcase, FiShield, FiTag, FiStar, FiLogOut, FiMenu, FiX, FiAward, FiSettings, FiFileText,
  FiCheckCircle, FiMessageCircle, FiCpu, FiVideo, FiTrendingUp, FiClock,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import HourlyRatePrompt from '../candidate/HourlyRatePrompt';
import SubscriptionModal from '../common/SubscriptionModal';
import './DashboardLayout.css';
import logo from '../../assets/logo.png';


const NAV_CONFIG = {
  candidate: [
    { to: '/candidate/dashboard', label: 'Overview', icon: FiGrid, end: true },
    { to: '/candidate/dashboard/subscription', label: 'Subscription', icon: FiAward },
    { to: '/browse', label: 'Find Project Partners', icon: FiUsers },
    { to: '/jobs', label: 'Browse Jobs', icon: FiFileText },
    { to: '/candidate/dashboard/career-assistant', label: 'AI Career Assistant', icon: FiCpu },
    { to: '/candidate/dashboard/ats-checker', label: 'ATS Resume Checker', icon: FiTrendingUp },
  ],
  company: [
    { to: '/company/dashboard', label: 'Overview', icon: FiGrid, end: true },
    { to: '/browse', label: 'Browse Engineers', icon: FiUsers },
    { to: '/company/dashboard/jobs', label: 'My Jobs', icon: FiFileText },
    { to: '/company/dashboard/subscription', label: 'Subscription', icon: FiAward },
    { to: '/company/dashboard/bookmarks', label: 'Bookmarked', icon: FiBookmark },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Overview', icon: FiGrid, end: true },
    { to: '/admin/dashboard/users', label: 'Users', icon: FiUsers },
    { to: '/admin/dashboard/candidates', label: 'Candidates', icon: FiUser },
    { to: '/admin/dashboard/companies', label: 'Companies', icon: FiBriefcase },
    { to: '/admin/dashboard/verifications', label: 'Verification', icon: FiShield },
    { to: '/admin/dashboard/taxonomy', label: 'Categories & Skills', icon: FiTag },
    { to: '/admin/dashboard/reviews', label: 'Reviews', icon: FiStar },
    { to: '/admin/dashboard/insights', label: 'AI Insights', icon: FiTrendingUp },
    { to: '/admin/dashboard/pricing', label: 'Pricing', icon: FiSettings },
  ],
};

/**
 * Generic dashboard shell shared by all three roles. The nav items shown
 * are derived from the current user's role so one layout component
 * serves candidate, company, and admin dashboards alike.
 */
export default function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = NAV_CONFIG[role] || [];

  const [showRatePrompt, setShowRatePrompt] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The sidebar only overlays the page on narrow screens (see the
  // max-width:900px rule in DashboardLayout.css); closing it on every
  // navigation means picking a nav link doesn't leave it sitting open
  // over the new page.
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Stop the page underneath from scrolling while the sidebar overlay is open.
  // useEffect(() => {
  //   document.body.style.overflow = sidebarOpen ? 'hidden' : '';
  //   return () => { document.body.style.overflow = ''; };
  // }, [sidebarOpen]);


  useEffect(() => {
  if (window.innerWidth <= 900) {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
  }

  return () => {
    document.body.style.overflow = '';
  };
}, [sidebarOpen]);

  useEffect(() => {
    if (role === 'candidate' && (user?.hourlyRate === null || user?.hourlyRate === undefined)) {
      setShowRatePrompt(true);
    } else {
      setShowRatePrompt(false);
    }
  }, [role, user?.hourlyRate]);

  // Shows the plan picker once per login session for Free-plan candidates
  // and companies (admins never see it). A sessionStorage flag — cleared on
  // logout in handleLogout below — prevents it reappearing on every
  // navigation within the same session, while still showing again next
  // time they log in.
  useEffect(() => {
    if (!user || (role !== 'candidate' && role !== 'company')) return;
    const plan = user?.subscription?.plan || 'free';
    const alreadyShown = sessionStorage.getItem('hr_subscription_prompt_shown');
    if (plan === 'free' && !alreadyShown) {
      setShowSubscriptionModal(true);
      sessionStorage.setItem('hr_subscription_prompt_shown', '1');
    }
  }, [user, role]);

  const handleLogout = async () => {
    sessionStorage.removeItem('hr_subscription_prompt_shown');
    await logout();
    navigate('/');
  };

  return (
    <div className="dashboard-shell">
      {role === 'candidate' && (
        <HourlyRatePrompt open={showRatePrompt} onClose={() => setShowRatePrompt(false)} />
      )}

      {(role === 'candidate' || role === 'company') && (
        <SubscriptionModal open={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)} />
      )}

      {/* Only visible below the 900px breakpoint — the sidebar itself
          becomes an off-canvas panel there, so this is the only way to
          open it (and everything under a dashboard route, including Edit
          Profile, renders through this same layout). */}
      <div className="dashboard-topbar">
        <button
          type="button"
          className="dashboard-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <FiMenu size={22} />
        </button>

        <img
          src={logo}
          alt="Logo"
          className="dashboard-topbar-logo"
        />
      </div>

      {/* Full-width desktop navbar — logo on the left, action icons +
          View Profile on the right. Sits above the sidebar/content row. */}
      <div className="dashboard-topbar-desktop">
        <div className="dashboard-navbar-clouds" aria-hidden="true">
          <span className="navbar-cloud navbar-cloud-1">☁️</span>
          <span className="navbar-cloud navbar-cloud-2">☁️</span>
          <span className="navbar-cloud navbar-cloud-3">☁️</span>
          <span className="navbar-cloud navbar-cloud-4">☁️</span>
        </div>

        <div className="dashboard-navbar-logo">
          <img src={logo} alt="Logo" />
        </div>

        <div className="dashboard-navbar-actions">
          {(role === 'candidate' || role === 'company') && (
            <>
              <button
                type="button"
                className="dashboard-topbar-icon-btn"
                onClick={() => navigate(`/${role}/dashboard/messages`)}
                aria-label="Messages"
              >
                <FiMessageCircle size={19} />
              </button>
              <button
                type="button"
                className="dashboard-topbar-icon-btn"
                onClick={() => navigate(`/${role}/dashboard/interviews`)}
                aria-label="Interviews"
              >
                <FiVideo size={19} />
              </button>
              <button
                type="button"
                className="dashboard-topbar-icon-btn"
                onClick={() => navigate(`/${role}/dashboard/history`)}
                aria-label="History"
              >
                <FiClock size={19} />
              </button>
            </>
          )}
          <button
            type="button"
            className="dashboard-topbar-icon-btn"
            onClick={() => navigate(`/${role}/dashboard/notifications`)}
            aria-label="Notifications"
          >
            <FiBell size={19} />
          </button>
          {(role === 'candidate' || role === 'company') && (
            <Link to={`/${role}/dashboard/profile`} className="dashboard-view-profile-btn">
              <FiUser size={16} />
              <span>View Profile</span>
            </Link>
          )}
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="dashboard-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar + page content */}
      <div className="dashboard-main">
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <div className="dashboard-brand">
            <button
              type="button"
              className="dashboard-sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <FiX size={20} />
            </button>
          </div>

          <nav className="dashboard-nav">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className="dashboard-nav-link"
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Decorative mascot — only on the AI Career Assistant page, to
              match its playful chat-companion branding. Every other
              dashboard page keeps the plain nav + Logout. */}
          {location.pathname.includes('career-assistant') && (
            <div className="dashboard-sidebar-mascot" aria-hidden="true">
              <span className="dashboard-sidebar-mascot-doodle">Your<br />AI Career<br />Companion</span>
              <span className="dashboard-sidebar-mascot-bot"><FiCpu size={28} /></span>
            </div>
          )}

          {/* Upsell card — only on the Subscription page, and only for
              accounts still on the Free plan (nothing to upsell once
              they've already upgraded). Scrolls to the existing Upgrade
              Plan button rather than duplicating its logic. */}
          {location.pathname.includes('/subscription') && (user?.subscription?.plan || 'free') === 'free' && (
            <button
              type="button"
              className="dashboard-sidebar-upsell"
              onClick={() => document.querySelector('.sub-footer-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            >
              <span className="dashboard-sidebar-upsell-icon"><FiAward size={22} /></span>
              <span>Upgrade to<br />Unlock More<br />Opportunities</span>
              <span className="dashboard-sidebar-upsell-arrow">→</span>
            </button>
          )}

          <button className="dashboard-logout" onClick={handleLogout}>
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </aside>

        <div className="dashboard-content">
          <div key={location.pathname} className="fade-in">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
