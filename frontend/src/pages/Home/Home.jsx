import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiEye, FiCreditCard, FiPhone, FiCheckCircle, FiArrowRight,
  FiLock, FiShield, FiStar, FiUsers, FiBriefcase, FiGlobe, FiZap,
  FiCloud, FiCpu, FiClock, FiChevronRight,
} from 'react-icons/fi';
import {
  SiReact, SiNodedotjs, SiMongodb, SiPython, SiDocker,
  SiAngular, SiVuedotjs, SiHtml5, SiTailwindcss, SiJavascript, SiTypescript,
  SiNextdotjs, SiExpress, SiGooglecloud, SiKubernetes,
  SiDjango, SiPhp, SiDotnet, SiFastapi,
} from 'react-icons/si';
import { FaAws, FaMicrosoft } from 'react-icons/fa';
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

/* Seven "core stack" icons orbiting the center hub in the Skill Universe
   diagram, paired with a brand color + label so each renders as a real
   per-tech "logo" instead of a plain uniform icon. */
const TEASER_TECH = [
  { Icon: SiNodedotjs, label: 'Node.js', color: '#3c873a' },
  { Icon: SiMongodb, label: 'MongoDB', color: '#10b981' },
  { Icon: SiTypescript, label: 'TypeScript', color: '#3178c6' },
  { Icon: SiReact, label: 'React', color: '#61dafb' },
  { Icon: SiKubernetes, label: 'Kubernetes', color: '#326ce5' },
  { Icon: SiDocker, label: 'Docker', color: '#2496ed' },
  { Icon: SiPython, label: 'Python', color: '#3b82f6' },
];

/* Left-hand stat cards in the Skill Universe panel. */
const SKILL_STATS = [
  { icon: FiUsers, value: '5000+', label: 'Skilled Engineers', tone: 'blue' },
  { icon: FiBriefcase, value: '300+', label: 'Hiring Companies', tone: 'pink' },
  { icon: FiGlobe, value: '150+', label: 'Technologies Covered', tone: 'green' },
];

/* Right-hand "Popular Skills" list in the Skill Universe panel. */
const POPULAR_SKILLS = [
  { Icon: SiReact, label: 'React', count: '500+ Engineers', color: '#61dafb', bg: '#e0f2fe' },
  { Icon: SiNodedotjs, label: 'Node.js', count: '450+ Engineers', color: '#3c873a', bg: '#dcfce7' },
  { Icon: SiPython, label: 'Python', count: '400+ Engineers', color: '#3b82f6', bg: '#dbeafe' },
  { Icon: FaAws, label: 'AWS', count: '350+ Engineers', color: '#f59e0b', bg: '#fef3c7' },
  { Icon: SiDocker, label: 'Docker', count: '300+ Engineers', color: '#2496ed', bg: '#dbeafe' },
  { Icon: SiKubernetes, label: 'Kubernetes', count: '280+ Engineers', color: '#326ce5', bg: '#e0e7ff' },
];

/* Two floating callout cards beneath the Skill Universe panel. */
const SKILL_FOOTER_CARDS = [
  {
    emoji: '💡',
    title: 'Discover In-Demand Skills',
    desc: 'Explore trending technologies and emerging opportunities.',
  },
  {
    emoji: '📊',
    title: 'Build Smarter Teams',
    desc: 'Find the right talent for your next big idea.',
  },
];

/* Purely decorative — does not touch STEPS / BENEFITS / TEASER_TECH or any
   API-driven data. Safe local constants for the new marquee + trust strip. */
const TECH_MARQUEE_ROW_1 = [
  { name: 'Angular', Icon: SiAngular }, { name: 'Vue.js', Icon: SiVuedotjs },
  { name: 'HTML/CSS', Icon: SiHtml5 }, { name: 'Tailwind CSS', Icon: SiTailwindcss },
  { name: 'JavaScript', Icon: SiJavascript }, { name: 'TypeScript', Icon: SiTypescript },
  { name: 'Next.js', Icon: SiNextdotjs }, { name: 'Node.js', Icon: SiNodedotjs },
  { name: 'Python', Icon: SiPython }, { name: 'React.js', Icon: SiReact },
];

const TECH_MARQUEE_ROW_2 = [
  { name: '.NET', Icon: SiDotnet }, { name: 'Django', Icon: SiDjango },
  { name: 'FastAPI', Icon: SiFastapi }, { name: 'Express.js', Icon: SiExpress },
  { name: 'AWS', Icon: FaAws }, { name: 'Azure', Icon: FaMicrosoft },
  { name: 'GCP', Icon: SiGooglecloud }, { name: 'Docker', Icon: SiDocker },
  { name: 'Kubernetes', Icon: SiKubernetes }, { name: 'PHP', Icon: SiPhp },
];

const TECH_MARQUEE_ROW_3 = [
  { name: 'TypeScript', Icon: SiTypescript }, { name: 'Next.js', Icon: SiNextdotjs },
  { name: 'Node.js', Icon: SiNodedotjs }, { name: 'Python', Icon: SiPython },
  { name: 'Django', Icon: SiDjango }, { name: 'PHP', Icon: SiPhp },
  { name: '.NET', Icon: SiDotnet }, { name: 'FastAPI', Icon: SiFastapi },
  { name: 'React.js', Icon: SiReact }, { name: 'Docker', Icon: SiDocker },
];

/* Brand-ish accent colors so every pill/icon in the marquee is distinct
   instead of the plain black-and-white look. Purely decorative — the
   underlying TECH_MARQUEE_ROW_* name/Icon data is untouched. */
const TECH_COLORS = {
  'Angular': '#dd0031', 'Vue.js': '#42b883', 'HTML/CSS': '#e34f26',
  'Tailwind CSS': '#38bdf8', 'JavaScript': '#f7df1e', 'TypeScript': '#3178c6',
  'Next.js': '#6366f1', 'Node.js': '#3c873a', 'Python': '#3b82f6', 'React.js': '#61dafb',
  '.NET': '#512bd4', 'Django': '#0c4b33', 'FastAPI': '#009688', 'Express.js': '#f59e0b',
  'AWS': '#ff9900', 'Azure': '#0078d4', 'GCP': '#4285f4', 'Docker': '#2496ed',
  'Kubernetes': '#326ce5', 'PHP': '#8892be',
};


const TRUST_ITEMS = [
  { label: 'Verified Talent', sub: 'Quality Assured', icon: FiShield, tone: 'blue' },
  { label: 'Enterprise Ready', sub: 'Scale with Confidence', icon: FiBriefcase, tone: 'purple' },
  { label: 'Cloud Native Stacks', sub: 'Modern Infrastructure', icon: FiCloud, tone: 'cyan' },
  { label: 'Fortune-Grade Security', sub: 'Your Data, Our Priority', icon: FiLock, tone: 'indigo' },
  { label: 'Global Payment Rails', sub: 'Hire Across Borders', icon: FiGlobe, tone: 'green' },
  { label: 'Modern Engineering Teams', sub: 'Build Without Limits', icon: FiUsers, tone: 'orange' },
  { label: '24/7 Verified Talent', sub: 'Always Available', icon: FiClock, tone: 'blue' },
];

function StatCard({ icon: Icon, value, suffix, label, tone, emoji, isCountUp = true }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card-emoji" aria-hidden="true">{emoji}</span>
      <div className="stat-card-icon"><Icon size={22} /></div>
      <div className="stat-card-value">
        {isCountUp ? <CountUpValue value={value} /> : value}
        {suffix}
      </div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

export default function Home() {
  const heroRef = useRef(null);
  const stepsRef = useScrollReveal('.step-card');
  const benefitsRef = useScrollReveal('li');
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
        }, '-=0.3')
        .from(heroRef.current.querySelectorAll('.hero-badge, .hero-trust-row li'), {
          opacity: 0,
          y: 12,
          duration: 0.45,
          stagger: 0.08,
        }, '-=0.25');
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="home">
      <section className="hero" ref={heroRef}>
        {/* decorative floating particles / grid — purely visual, no logic */}
        <div className="hero-decor" aria-hidden="true">
          <span className="hero-particle p1" />
          <span className="hero-particle p2" />
          <span className="hero-particle p3" />
          <span className="hero-particle p4" />
          <span className="hero-particle p5" />
          <span className="hero-beam beam1" />
          <span className="hero-beam beam2" />
        </div>

        <div className="container hero-inner">
          <div className="hero-content">
            <span className="hero-badge">🚀 Trusted by Companies Worldwide</span>

            <h1>
              Hire Skilled Engineers{' '}
              <span className="hero-highlight-wrap">
                <span className="hero-highlight">On Hourly Basis</span>
                <svg className="hero-highlight-underline" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 11 C 70 3, 130 15, 180 8 S 260 3, 297 9" stroke="url(#heroUnderlineGrad)" />
                  <defs>
                    <linearGradient id="heroUnderlineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
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
              <Link to="/browse"><Button size="lg">Browse Engineers <FiArrowRight /></Button></Link>
              <Link to="/register"><Button size="lg" variant="outline">Join as an Engineer</Button></Link>
            </div>

            <ul className="hero-trust-row">
              <li><FiCheckCircle /> Verified Talent</li>
              <li><FiShield /> Secure Payments</li>
              <li><FiZap /> Flexible Hiring</li>
            </ul>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="unlock-scene">
              <div className="hero-globe" />
              <div className="unlock-glow" />

              <div className="unlock-chip unlock-chip-verified">
                <FiShield size={14} /> Verified
              </div>

              <div className="unlock-chip unlock-chip-global">
                <FiGlobe size={14} /> Global Talent
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

              <div className="unlock-chip unlock-chip-direct">
                <FiZap size={14} /> Direct Access
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technologies marquee — white pill badges in 3 wrapped/scrolling rows */}
      <section className="tech-badges-section">
        <div className="container tech-badges-inner">
          <h2 className="section-title text-center">Modern Technologies. Expert Developers.</h2>
          <p className="text-muted text-center tech-badges-subtitle">
            Our developers bring deep expertise across the full technology spectrum —
            from modern frontend frameworks to cloud infrastructure and AI.
          </p>

          <div className="tech-badges-row" aria-hidden="true">
            <div className="tech-badges-track">
              {[...TECH_MARQUEE_ROW_1, ...TECH_MARQUEE_ROW_1].map(({ name, Icon }, i) => (
                <span className="tech-badge-pill" key={`r1-${name}-${i}`}>
                  <span className="tech-badge-icon" style={{ background: TECH_COLORS[name] || '#2563eb' }}>
                    <Icon size={13} />
                  </span>
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="tech-badges-row tech-badges-row-reverse" aria-hidden="true">
            <div className="tech-badges-track tech-badges-track-reverse">
              {[...TECH_MARQUEE_ROW_2, ...TECH_MARQUEE_ROW_2].map(({ name, Icon }, i) => (
                <span className="tech-badge-pill" key={`r2-${name}-${i}`}>
                  <span className="tech-badge-icon" style={{ background: TECH_COLORS[name] || '#7c3aed' }}>
                    <Icon size={13} />
                  </span>
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="tech-badges-row" aria-hidden="true">
            <div className="tech-badges-track">
              {[...TECH_MARQUEE_ROW_3, ...TECH_MARQUEE_ROW_3].map(({ name, Icon }, i) => (
                <span className="tech-badge-pill" key={`r3-${name}-${i}`}>
                  <span className="tech-badge-icon" style={{ background: TECH_COLORS[name] || '#10b981' }}>
                    <Icon size={13} />
                  </span>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {stats && (
        <section className="stats-bar">
          <div className="container stats-bar-inner">
            <StatCard icon={FiUsers} value={stats.totalCandidates} suffix="+" label="Verified Engineers" tone="blue" emoji="🔥" />
            <StatCard icon={FiBriefcase} value={stats.totalCompanies} suffix="+" label="Hiring Companies" tone="purple" emoji="🏢" />
            <StatCard icon={FiZap} value={stats.totalUnlocks} suffix="+" label="Contacts Unlocked" tone="green" emoji="⚡" />
            <StatCard icon={FiGlobe} value="Global" suffix="" label="English-Speaking Talent" tone="orange" isCountUp={false} emoji="🌍" />
          </div>
        </section>
      )}

      <section className="container_section">
        <div className="how_section">
          <span className="section-eyebrow text-center">SIMPLE PROCESS</span>
          <h2 className="section-title text-center">How It Works</h2>
          <p className="how-subtitle text-center">Get skilled engineers for your projects in just a few steps.</p>
          <div className="steps-grid" ref={stepsRef}>
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <Card key={title} hoverable className={`step-card step-card-tone-${i}`}>
                <div className="step-number-badge">{String(i + 1).padStart(2, '0')}</div>
                <div className="step-icon-wrap"><Icon size={24} className="step-icon" /></div>
                <h3>{title}</h3>
                <p className="text-muted">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted technology ecosystem — generic descriptive badges, not real
          company logos/partners, to avoid implying an endorsement. */}
      <section className="trusted-section">
        <div className="container trusted-inner">
          <span className="section-eyebrow trusted-eyebrow">— TRUSTED TECHNOLOGY ECOSYSTEM —</span>
          <div className="trusted-grid">
            {TRUST_ITEMS.map(({ label, sub, icon: Icon, tone }) => (
              <div className={`trusted-card trusted-card--${tone}`} key={label}>
                <span className="trusted-card-icon"><Icon size={18} /></span>
                <span className="trusted-card-text">
                  <strong>{label}</strong>
                  <small>{sub}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section tech-teaser-section">
        <div className="container tech-teaser-inner">
          <span className="section-eyebrow tech-tree-eyebrow">SKILL UNIVERSE</span>
          <h2 className="section-title">
            Every Skill, <span className="tech-tree-title-accent">Organized Like a Tree</span>
          </h2>
          <p className="text-muted tech-teaser-copy">
            From React to Kubernetes — Explore Our Full Technology Tree and Find
            Engineers by Exactly the Stack you need.
          </p>

          <Link to="/technologies" className="tech-teaser-link">
            Explore All Technologies <FiArrowRight />
          </Link>

          <div className="skill-universe-grid">
            <div className="skill-stat-list">
              {SKILL_STATS.map(({ icon: Icon, value, label, tone }) => (
                <div className={`skill-stat-card skill-stat-card--${tone}`} key={label}>
                  <span className="skill-stat-icon"><Icon size={20} /></span>
                  <span className="skill-stat-copy">
                    <strong>{value}</strong>
                    <small>{label}</small>
                  </span>
                </div>
              ))}
            </div>

            <div className="tech-tree-wrap">
              <span className="tech-tree-annotation tech-tree-annotation--left">
                Explore<br />Learn<br />Build<br />Grow
              </span>
              <span className="tech-tree-annotation tech-tree-annotation--right">
                Right Talent<br />Right Skills<br />Real Results
              </span>

              <div className="tech-tree-orbit">
                {TEASER_TECH.map(({ Icon, label, color }, i) => (
                  <div
                    className="tech-node tech-teaser-icon"
                    key={label}
                    style={{ '--angle': `${(360 / TEASER_TECH.length) * i}deg`, '--tech-color': color }}
                  >
                    <span className="tech-node-icon"><Icon size={26} /></span>
                    <span className="tech-node-label">{label}</span>
                  </div>
                ))}
              </div>

              <div className="tech-tree-center">
                <FiCpu size={28} className="tech-tree-center-icon" />
                <span className="tech-tree-center-text">6 Core Stacks<br />&amp; Growing</span>
              </div>
            </div>

            <div className="popular-skills-card">
              <h3 className="popular-skills-title"><FiStar size={16} /> Popular Skills</h3>
              <ul className="popular-skills-list">
                {POPULAR_SKILLS.map(({ Icon, label, count, color, bg }) => (
                  <li key={label}>
                    <span className="popular-skill-icon" style={{ background: bg, color }}><Icon size={18} /></span>
                    <span className="popular-skill-copy">
                      <strong>{label}</strong>
                      <small>{count}</small>
                    </span>
                    <FiChevronRight className="popular-skill-arrow" />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="skill-footer-cards">
            {SKILL_FOOTER_CARDS.map(({ emoji, title, desc }) => (
              <div className="skill-footer-card" key={title}>
                <span className="skill-footer-emoji" aria-hidden="true">{emoji}</span>
                <span className="skill-footer-copy">
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </span>
                <FiChevronRight className="skill-footer-arrow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section benefits-section">
        <div className="container benefits-inner">
          <Card className="benefits-card">
            <span className="section-eyebrow">FOR COMPANIES</span>
            <h2 className="section-title">Why Companies Choose HourlyRecruit</h2>
            <ul className="benefits-list" ref={benefitsRef}>
              {BENEFITS.map((b) => (
                <li key={b}><FiCheckCircle className="benefit-icon" /> {b}</li>
              ))}
            </ul>
            <Link to="/browse"><Button>Start Browsing <FiArrowRight /></Button></Link>
          </Card>
          <Card className="cta-card">
            <span className="section-eyebrow section-eyebrow-alt">FOR ENGINEERS</span>
            <h3>Are you an engineer?</h3>
            <p className="text-muted">
              Build your profile, showcase your work, and let companies come to you.
              You keep full control — HourlyRecruit never takes a cut of your rate.
            </p>
            <Link to="/register"><Button variant="secondary" fullWidth>Create Your Profile <FiArrowRight /></Button></Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
