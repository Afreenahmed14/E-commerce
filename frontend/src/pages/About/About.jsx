import Card from '../../components/common/Card';
import './About.css';

export default function About() {
  return (
    <div className="container section about-page">
      <h1>About HourlyRecruit</h1>
      <p className="text-muted about-intro">
        HourlyRecruit connects companies directly with skilled engineers. Unlike
        traditional freelance marketplaces, we don't manage your projects, contracts,
        or communication — we simply help you find the right person and get their
        verified contact details, fast.
      </p>

      <div className="about-grid stagger-children">
        <Card className="about-card">
          <h3>Our Mission</h3>
          <p className="text-muted">
            To remove the friction between companies looking for talent and the
            engineers who can deliver — without taking a cut of every hour worked.
          </p>
        </Card>
        <Card className="about-card">
          <h3>How We're Different</h3>
          <p className="text-muted">
            No in-app messaging, no project tracking, no percentage fees on your
            contracts. You pay once to unlock a contact, then work together however
            you choose.
          </p>
        </Card>
        <Card className="about-card">
          <h3>Trust & Verification</h3>
          <p className="text-muted">
            Engineers and companies can be verified by our admin team, and every
            engagement can be rated — so quality and reliability are visible before
            you ever unlock a contact.
          </p>
        </Card>
      </div>
    </div>
  );
}
