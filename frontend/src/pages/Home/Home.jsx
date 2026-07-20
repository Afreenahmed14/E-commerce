import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiEye, FiCreditCard, FiPhone, FiCheckCircle, FiArrowRight, FiLock, FiShield, FiStar } from 'react-icons/fi';
import { SiReact, SiNodedotjs, SiMongodb, SiPython, SiDocker, SiFigma } from 'react-icons/si';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import CountUpValue from '../../components/common/CountUpValue';
import { statsService } from '../../services/statsService';
import { gsap, prefersReducedMotion } from '../../utils/gsapSetup';
import { useScrollReveal } from '../../utils/gsapHooks';
import './Home.css';

const STEPS = [
  { icon: FiSearch, title: 'Search Engineers', desc: 'Filter by skill, rate, availability, location and more to find the right fit.' },
  { icon: FiEye, title: 'View Profile', desc: 'Review portfolios, experience, ratings, and verified credentials.' },
  { icon: FiCreditCard, title: 'Pay Platform', desc: 'A single, transparent unlock fee — no subscriptions, no hidden costs.' },
  { icon: FiPhone, title: 'Contact Directly', desc: 'Get verified contact details instantly and take the conversation outside the platform.' },
];

const BENEFITS = [
  'No project management overhead — you own the engagement',
  'Verified engineer profiles with ratings and reviews',
  'Pay only for the contacts you actually want to unlock',
  'Transparent, one-time pricing per unlock',
];

const TEASER_TECH = [SiReact, SiNodedotjs, SiMongodb, SiPython, SiDocker, SiFigma];

function StatCircle({ value, label, delayClass }) {
  return (
    <div className="stat-pill">
      <div className={`stat-circle ${delayClass || ''}`}>
        <div className="stat-circle-ring" />
        <div className="stat-circle-content">
          <div className="stat-pill-value"><CountUpValue value={value} />+</div>
          <div className="stat-pill-label">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const heroRef = useRef(null);
  const stepsRef = useScrollReveal('.step-card');
  const benefitsRef = useScrollReveal('li');
  const techTeaserRef = useScrollReveal('.tech-teaser-icon');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    statsService.getPlatformStats()
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    if (prefersReducedMotion() || !heroRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from(heroRef.current.querySelectorAll('.unlock-card-stack, .unlock-chip'), {
        opacity: 0,
        y: 30,
        scale: 0.85,
        duration: 0.7,
        stagger: 0.15,
      })
        .from(heroRef.current.querySelector('h1'), { opacity: 0, y: 24, duration: 0.6 }, '-=0.5')
        .from(heroRef.current.querySelectorAll('.hero-subtitle'), { opacity: 0, y: 20, duration: 0.6, stagger: 0.1 }, '-=0.35')
        .from(heroRef.current.querySelectorAll('.hero-actions .btn'), {
          opacity: 0,
          y: 16,
          duration: 0.5,
          stagger: 0.12,
        }, '-=0.3');
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="home">
      <section className="hero" ref={heroRef}>
        <div className="container hero-inner">
          <div className="hero-content">
            <h1>
              Hire Skilled Engineers{' '}
              <span className="hero-highlight-wrap">
                <span className="hero-highlight">On Hourly Basis</span>
                <svg className="hero-highlight-underline" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 11 C 70 3, 130 15, 180 8 S 260 3, 297 9" stroke="url(#heroUnderlineGrad)" />
                  {/* <defs>
                    <linearGradient id="heroUnderlineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-primary-dark)" />
                    </linearGradient>
                  </defs> */}
                </svg>
              </span>
            </h1>
            <p className="hero-subtitle">
              Search Verified Engineers, View Their Profiles and Unlock Contact Details Instantly.
            </p>
            <p className="hero-subtitle">
              No Middleman, No Project Management — Just Direct Access.
            </p>
            <div className="hero-actions">
              <Link to="/browse"><Button size="lg">Browse Engineers</Button></Link>
              <Link to="/register"><Button size="lg" variant="outline">Join as an Engineer</Button></Link>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="unlock-scene">
              <div className="unlock-glow" />

              <div className="unlock-chip unlock-chip-verified">
                <FiShield size={14} /> Verified
              </div>

              <div className="unlock-card-stack">
                <div className="unlock-card-back" />
                <div className="unlock-card">
                  <div className="unlock-card-top">
                    <div className="unlock-card-avatar">HR</div>
                    <div>
                      <div className="unlock-card-name" />
                      <div className="unlock-card-role">Engineer</div>
                    </div>
                  </div>
                  <div className="unlock-card-rating">
                    <FiStar size={13} /> 4.9 <span>· 6 yrs exp</span>
                  </div>
                  <div className="unlock-card-skills">
                    <span className="unlock-skill-tag">Node.js</span>
                    <span className="unlock-skill-tag">MongoDB</span>
                  </div>
                  <div className="unlock-card-row">
                    <FiLock size={15} />
                    <span className="unlock-digits">+91 98••• •••42</span>
                    <div className="unlock-ping" />
                  </div>
                </div>
              </div>

              <div className="unlock-chip unlock-chip-rate">
                <FiCreditCard size={14} /> <strong>PAY ₹</strong>/hr
              </div>
            </div>
          </div>
        </div>
      </section>

      {stats && (
        <section className="stats-bar">
          <div className="container stats-bar-inner">
            <StatCircle value={stats.totalCandidates} label="Verified Engineers" />
            <StatCircle value={stats.totalCompanies} label="Hiring Companies" delayClass="stat-circle-delay1" />
            <StatCircle value={stats.totalUnlocks} label="Contacts Unlocked" delayClass="stat-circle-delay2" />
          </div>
        </section>
      )}

      <section className="container_section">
        <div className="how_section">
          <h2 className="section-title text-center">How It Works</h2>
          <div className="steps-grid" ref={stepsRef}>
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <Card key={title} hoverable className="step-card">
                <div className="step-number">{i + 1}</div>
                <Icon size={28} className="step-icon" />
                <h3>{title}</h3>
                <p className="text-muted">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section tech-teaser-section">
        <div className="container tech-teaser-inner">
          <div className="tech-teaser-icons" ref={techTeaserRef}>
            {TEASER_TECH.map((Icon, i) => (
              <div className="tech-teaser-icon" key={i}><Icon size={26} /></div>
            ))}
          </div>
          <h2 className="section-title">Every Skill, Organized Like a Tree</h2>
          <p className="text-muted tech-teaser-copy">
            From React to Kubernetes — Explore Our Full Technology Tree and Find
            Engineers by Exactly the Stack you need.
          </p>
          <Link to="/technologies" className="tech-teaser-link">
            Explore Technologies <FiArrowRight />
          </Link>
        </div>
      </section>

      <section className="section benefits-section">
        <div className="container benefits-inner">
          <div>
            <h2 className="section-title">Why Companies Choose HourlyRecruit</h2>
            <ul className="benefits-list" ref={benefitsRef}>
              {BENEFITS.map((b) => (
                <li key={b}><FiCheckCircle className="benefit-icon" /> {b}</li>
              ))}
            </ul>
            <Link to="/browse"><Button>Start Browsing</Button></Link>
          </div>
          <Card className="cta-card">
            <h3>Are you an engineer?</h3>
            <p className="text-muted">
              Build your profile, showcase your work, and let companies come to you.
              You keep full control — HourlyRecruit never takes a cut of your rate.
            </p>
            <Link to="/register"><Button variant="secondary" fullWidth>Create Your Profile</Button></Link>
          </Card>
        </div>
      </section>
    </div>
  );
}