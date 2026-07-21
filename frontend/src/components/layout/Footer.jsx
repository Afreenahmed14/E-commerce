import { Link } from 'react-router-dom';
import { FiGithub, FiLinkedin, FiTwitter } from 'react-icons/fi';
import './Footer.css';
import logo from '../../assets/logo.png';

const PLATFORM_LINKS = [
  { label: 'Browse Engineers', to: '/browse' },
  { label: 'Technologies', to: '/technologies' },
];

const ACCOUNT_LINKS = [
  { label: 'Login', to: '/login' },
  { label: 'Get Started', to: '/register' },
];

const SOCIAL_LINKS = [
  { icon: FiGithub, href: 'https://github.com', label: 'GitHub' },
  { icon: FiLinkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: FiTwitter, href: 'https://twitter.com', label: 'Twitter' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              {/* <span className="footer-logo-mark"> */}
                <img src={logo} alt="HourlyRecruit" />
              {/* </span> */}
              {/* <span className="footer-logo-text">
                HourlyRecruit
                <span className="footer-logo-sub">Tech Labs</span>
              </span> */}
            </Link>
            <p className="footer-tagline">Hire skilled engineers by the hour.</p>
            <div className="footer-socials">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="footer-social-icon"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Platform</h4>
            <ul className="footer-col-list">
              {PLATFORM_LINKS.map(({ label, to }) => (
                <li key={label}><Link to={to}>{label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Account</h4>
            <ul className="footer-col-list">
              {ACCOUNT_LINKS.map(({ label, to }) => (
                <li key={label}><Link to={to}>{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} HourlyRecruit. All rights reserved.</span>
          {/* <Link to="/login/admin" className="footer-admin-link">Admin</Link> */}
        </div>
      </div>
    </footer>
  );
}