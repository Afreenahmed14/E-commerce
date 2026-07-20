import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  FiGrid, FiUser, FiBookmark, FiBell, FiUsers,
  FiBriefcase, FiShield, FiTag, FiStar, FiLogOut, FiMenu, FiX, FiAward, FiSettings, FiFileText,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import HourlyRatePrompt from '../candidate/HourlyRatePrompt';
import SubscriptionModal from '../common/SubscriptionModal';
import './DashboardLayout.css';
import logo from '../../assets/logo.png';


const NAV_CONFIG = {
  candidate: [
    { to: '/candidate/dashboard', label: 'Overview', icon: FiGrid, end: true },
    { to: '/candidate/dashboard/profile', label: 'My Profile', icon: FiUser },
    { to: '/candidate/dashboard/subscription', label: 'Subscription', icon: FiAward },
    { to: '/browse', label: 'Find Project Partners', icon: FiUsers },
    { to: '/jobs', label: 'Browse Jobs', icon: FiFileText },
    { to: '/candidate/dashboard/applications', label: 'My Applications', icon: FiBriefcase },
    { to: '/candidate/dashboard/notifications', label: 'Notifications', icon: FiBell },
  ],
  company: [
    { to: '/company/dashboard', label: 'Overview', icon: FiGrid, end: true },
    { to: '/browse', label: 'Browse Engineers', icon: FiUsers },
    { to: '/company/dashboard/jobs', label: 'My Jobs', icon: FiFileText },
    { to: '/company/dashboard/profile', label: 'Company Profile', icon: FiBriefcase },
    { to: '/company/dashboard/subscription', label: 'Subscription', icon: FiAward },
    { to: '/company/dashboard/bookmarks', label: 'Bookmarked', icon: FiBookmark },
    { to: '/company/dashboard/notifications', label: 'Notifications', icon: FiBell },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Overview', icon: FiGrid, end: true },
    { to: '/admin/dashboard/users', label: 'Users', icon: FiUsers },
    { to: '/admin/dashboard/candidates', label: 'Candidates', icon: FiUser },
    { to: '/admin/dashboard/companies', label: 'Companies', icon: FiBriefcase },
    { to: '/admin/dashboard/verifications', label: 'Verification', icon: FiShield },
    { to: '/admin/dashboard/taxonomy', label: 'Categories & Skills', icon: FiTag },
    { to: '/admin/dashboard/reviews', label: 'Reviews', icon: FiStar },
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
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
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
        <img src={logo} alt="Logo" className="dashboard-topbar-logo" />
      </div>

      {sidebarOpen && <div className="dashboard-backdrop" onClick={() => setSidebarOpen(false)} />}

      <aside className={`dashboard-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="dashboard-brand">
          <img src={logo} alt="Logo" />
          <button
            type="button"
            className="dashboard-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <FiX size={20} />
          </button>
        </div>
        <div className="dashboard-user">
          <div className="dashboard-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <p className="dashboard-user-name">{user?.name}</p>
            <p className="dashboard-user-role text-muted">{role}</p>
          </div>
        </div>
        <nav className="dashboard-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="dashboard-nav-link" onClick={() => setSidebarOpen(false)}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
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
  );
}
