import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiBell, FiUser, FiShield } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import Button from '../common/Button';
import './Navbar.css';
import logo from '../../assets/logo.png'


const DASHBOARD_PATH = {
  admin: '/admin/dashboard',
  candidate: '/candidate/dashboard',
  company: '/company/dashboard',
};

export default function Navbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const { unreadCount } = useNotifications() || {};
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo">
          <img src={logo} alt="Logo" />
        </Link>

        <nav className={`navbar-links ${menuOpen ? 'navbar-links-open' : ''}`}>
          <NavLink to="/browse" onClick={() => setMenuOpen(false)}>Browse Engineers</NavLink>
          {role !== 'company' && (
            <NavLink to="/jobs" onClick={() => setMenuOpen(false)}>Browse Jobs</NavLink>
          )}
          <NavLink to="/technologies" onClick={() => setMenuOpen(false)}>Technologies</NavLink>
          <NavLink to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</NavLink>
          {/* <NavLink to="/about" onClick={() => setMenuOpen(false)}>About</NavLink> */}
          {/* <NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink> */}

          {isAuthenticated ? (
            <>
              <NavLink to={DASHBOARD_PATH[role] || '/'} onClick={() => setMenuOpen(false)}>
                Dashboard
              </NavLink>
              <button className="navbar-icon-btn" onClick={() => navigate(`${DASHBOARD_PATH[role]}/notifications`)}>
                <FiBell size={18} />
                {unreadCount > 0 && <span className="navbar-badge">{unreadCount}</span>}
              </button>
              <div className="navbar-user">
                <FiUser size={16} />
                <span>{user?.name?.split(' ')[0]}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <div className="navbar-auth-actions">
              <Link to="/login" className="navbar-login-link">Login</Link>
              <Button size="sm" onClick={() => navigate('/register')}>Sign up</Button>
            </div>
          )}
        </nav>

        <div className="navbar-corner">
          <Link to="/login/admin" className="navbar-admin-btn" title="Admin login" aria-label="Admin login">
            <FiShield size={17} />
          </Link>

          <button className="navbar-toggle" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
}
