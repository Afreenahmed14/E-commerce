import { Link } from 'react-router-dom';
import { FiGithub, FiLinkedin, FiTwitter } from 'react-icons/fi';
import './Footer.css';
import logo from '../../assets/logo.png';


export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">
            <img src={logo} alt="HourlyRecruit" />
          </span>
          <p className="text-muted">Hire skilled engineers by the hour.</p>
        </div>

        <div className="footer-links">
          <div>
            <h4>Platform</h4>
            <Link to="/browse">Browse Engineers</Link>
            <Link to="/technologies">Technologies</Link>
          </div>
          <div>
            <h4>Account</h4>
            <Link to="/login">Login</Link>
            <Link to="/register">Get Started</Link>
          </div>
        </div>

        <div className="footer-social">
          <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub"><FiGithub /></a>
          <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><FiLinkedin /></a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter"><FiTwitter /></a>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="text-muted">© {year} HourlyRecruit. All rights reserved.</p>
        <Link to="/login/admin" className="footer-admin-link">Admin</Link>
      </div>
    </footer>
  );
}
