import { useEffect, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  FiSearch, FiMapPin, FiBriefcase, FiClock, FiCheckCircle, FiZap, FiTrendingUp,
  FiArrowRight, FiGrid, FiList, FiBookmark, FiUsers, FiShield, FiGlobe,
} from 'react-icons/fi';
import {
  SiReact, SiNodedotjs, SiPython, SiDocker, SiKubernetes, SiTypescript, SiMongodb,
} from 'react-icons/si';
import { FaAws, FaJava, FaDatabase, FaPalette } from 'react-icons/fa';
import { jobService } from '../../services/jobService';
import { taxonomyService } from '../../services/taxonomyService';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { formatRelativeTime } from '../../utils/formatters';
import './BrowseJobs.css';

const JOB_TYPES = [
  { value: '', label: 'All job types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

/* Quick-pick chips under the search bar — set the same `q` search the
   box already supports. Colored like the Browse Engineers page so each
   technology reads clearly at a glance. */
const POPULAR_SEARCHES = [
  { name: 'React', Icon: SiReact, color: '#149eca' },
  { name: 'Node.js', Icon: SiNodedotjs, color: '#3c873a' },
  { name: 'Python', Icon: SiPython, color: '#3776ab' },
  { name: 'Java', Icon: FaJava, color: '#f89820' },
  { name: 'AWS', Icon: FaAws, color: '#ff9900' },
  { name: 'Docker', Icon: SiDocker, color: '#2496ed' },
  { name: 'Kubernetes', Icon: SiKubernetes, color: '#326ce5' },
  { name: 'SQL', Icon: FaDatabase, color: '#4479a1' },
  { name: 'TypeScript', Icon: SiTypescript, color: '#3178c6' },
  { name: 'MongoDB', Icon: SiMongodb, color: '#10b981' },
  { name: 'UI/UX', Icon: FaPalette, color: '#ec4899' },
];

const TRUST_STRIP_ITEMS = [
  { icon: FiTrendingUp, tone: 'purple', title: 'Top Companies', sub: 'Hire the best talent' },
  { icon: FiShield, tone: 'blue', title: 'Secure & Transparent', sub: 'Safe hiring experience' },
  { icon: FiGlobe, tone: 'green', title: 'Global Opportunities', sub: 'Work from anywhere' },
  { icon: FiUsers, tone: 'orange', title: 'Grow Your Career', sub: 'Unlock new possibilities' },
];

// Colors cycled per card for the initials avatar box, purely cosmetic.
const AVATAR_TONES = ['#ef4444', '#2563eb', '#0891b2', '#7c3aed', '#059669', '#d97706'];

const PAY_PERIOD_SUFFIX = { yearly: '/ yr', monthly: '/ mo', weekly: '/ wk', hourly: '/ hr' };

const formatSalary = (min, max, payType = 'yearly') => {
  const suffix = PAY_PERIOD_SUFFIX[payType] || '/ yr';
  // Large yearly figures read better abbreviated (₹12.5L); smaller,
  // more frequent pay periods (weekly/hourly) read better in full.
  const fmt = (n) => (payType === 'yearly' && n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)} ${suffix}`;
  if (min) return `${fmt(min)}+ ${suffix}`;
  if (max) return `Up to ${fmt(max)} ${suffix}`;
  return 'Not disclosed';
};

export default function BrowseJobs() {
  const { role } = useAuth();
  const [q, setQ] = useState('');
  const [jobType, setJobType] = useState('');
  const [developerType, setDeveloperType] = useState('');
  const [developerTypes, setDeveloperTypes] = useState([]);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' — display only
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const debouncedQ = useDebounce(q, 400);

  useEffect(() => {
    taxonomyService.getDeveloperTypes().then((res) => setDeveloperTypes(res.data.developerTypes)).catch(() => {});
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { q: debouncedQ, jobType, developerType, page, limit: 12 };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await jobService.search(params);
      setJobs(res.data.jobs);
      setPagination(res.data.pagination);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, jobType, developerType, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Companies post jobs, they don't apply to them — keep this listing
  // scoped to candidates/guests, same as the nav link.
  if (role === 'company') return <Navigate to="/company/dashboard/jobs" replace />;

  return (
    <div className="container-section-browse-jobs-page">

      {/* ---------- Search card ---------- */}
      <div className="jobs-search-card">
        <div className="jobs-filterbar">
          <div className="filter-search-inline jobs-main-search">
            <FiSearch />
            <input
              placeholder="Search jobs by title, skill, or keyword…"
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
            />
          </div>

          <div className="jobs-select-wrap">
            <FiBriefcase size={15} />
            <select value={jobType} onChange={(e) => { setPage(1); setJobType(e.target.value); }}>
              {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="jobs-select-wrap">
            <FiUsers size={15} />
            <select value={developerType} onChange={(e) => { setPage(1); setDeveloperType(e.target.value); }}>
              <option value="">All developer types</option>
              {developerTypes.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
            </select>
          </div>

          <button type="button" className="jobs-search-btn" onClick={() => setPage(1)}>
            <FiSearch size={16} /> Search Jobs <FiArrowRight size={16} />
          </button>
        </div>

        <div className="popular-skills-row">
          <span className="popular-skills-row-label">Popular Searches:</span>
          <div className="popular-skills-row-chips">
            {POPULAR_SEARCHES.map(({ name, Icon, color }) => (
              <button
                type="button"
                key={name}
                className={`popular-skill-chip ${q === name ? 'is-selected' : ''}`}
                style={{ '--tech-color': color }}
                onClick={() => { setPage(1); setQ(q === name ? '' : name); }}
              >
                <Icon size={14} /> {name}
              </button>
            ))}
            <button
              type="button"
              className="popular-skill-chip popular-skill-chip-viewall"
              onClick={() => { setPage(1); setQ(''); }}
            >
              View All <FiArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Hero banner ---------- */}
      <section className="jobs-hero">
        <div className="jobs-hero-decor" aria-hidden="true">
          <span className="jobs-hero-particle jhp1" />
          <span className="jobs-hero-particle jhp2" />
        </div>
        <div className="jobs-hero-inner">
          <div className="jobs-hero-content">
            <span className="jobs-hero-badge">🚀 1200+ Verified Companies Hiring</span>
            <h1 className="jobs-hero-title">
              Find Your Next <span className="jobs-hero-title-accent">Opportunity</span>
            </h1>
            <p className="jobs-hero-subtitle">
              Explore remote, hybrid, and onsite jobs from top companies worldwide.
            </p>

            <div className="jobs-hero-chips">
              <div className="jobs-hero-chip">
                <span className="jobs-hero-chip-icon jobs-hero-chip-icon--green"><FiCheckCircle size={18} /></span>
                <span className="jobs-hero-chip-copy"><strong>Verified Companies</strong><small>Trusted &amp; Secure</small></span>
              </div>
              <div className="jobs-hero-chip">
                <span className="jobs-hero-chip-icon jobs-hero-chip-icon--purple"><FiZap size={18} /></span>
                <span className="jobs-hero-chip-copy"><strong>Flexible Work</strong><small>Remote, Hybrid, Onsite</small></span>
              </div>
              <div className="jobs-hero-chip">
                <span className="jobs-hero-chip-icon jobs-hero-chip-icon--orange"><FiTrendingUp size={18} /></span>
                <span className="jobs-hero-chip-copy"><strong>Better Opportunities</strong><small>Higher Growth</small></span>
              </div>
            </div>
          </div>

          <div className="jobs-hero-visual" aria-hidden="true">
            <span className="jobs-hero-doodle">Dream Job<br />Is Waiting!</span>
            <div className="jobs-hero-avatar">
              <FiBriefcase size={40} />
            </div>
            <div className="jobs-hero-cta">
              <FiArrowRight size={0} style={{ display: 'none' }} />
              Build Your Career<br />No Limits <FiArrowRight size={16} />
            </div>
            <div className="jobs-hero-stat-card">
              <div className="jobs-hero-stat-avatars">
                <span className="jobs-hero-stat-avatar" style={{ background: '#ef4444' }} />
                <span className="jobs-hero-stat-avatar" style={{ background: '#2563eb' }} />
                <span className="jobs-hero-stat-avatar" style={{ background: '#111827' }} />
                <span className="jobs-hero-stat-avatar jobs-hero-stat-avatar-more">+</span>
              </div>
              <span className="jobs-hero-stat-copy"><strong>1000+</strong><small>Open Positions</small></span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Toolbar ---------- */}
      <div className="jobs-toolbar">
        <div className="jobs-toolbar-left">
          <span className="jobs-results-count">
            {loading ? 'Searching…' : `${pagination.total ?? jobs.length} job${(pagination.total ?? jobs.length) === 1 ? '' : 's'} found`}
          </span>
          <span className="jobs-results-tagline">Updated Just Now</span>
        </div>

        <div className="browse-view-toggle" role="group" aria-label="Result view">
          <button
            type="button"
            className={`browse-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <FiGrid size={15} /> Grid View
          </button>
          <button
            type="button"
            className={`browse-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <FiList size={15} /> List View
          </button>
        </div>
      </div>

      {loading ? (
        <Loader label="Finding jobs…" />
      ) : jobs.length === 0 ? (
        <EmptyState title="No jobs match your search" description="Try a different keyword or filter." />
      ) : (
        <div className={`jobs-grid ${viewMode === 'list' ? 'jobs-grid-list' : ''}`}>
          {jobs.map((job, i) => {
            const isRemote = !!job.location?.remote;
            const isNew = job.createdAt && (Date.now() - new Date(job.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
            const initials = (job.companyId?.companyName || job.title || 'J').slice(0, 2).toUpperCase();
            const tone = AVATAR_TONES[i % AVATAR_TONES.length];
            return (
              <Card className="job-card" key={job._id}>
                {(isRemote || isNew) && (
                  <span className={`job-card-status-badge ${isRemote ? 'is-remote' : 'is-new'}`}>
                    {isRemote ? '● Remote' : '✦ New'}
                  </span>
                )}
                <button type="button" className="job-card-bookmark" aria-label="Save job">
                  <FiBookmark size={15} />
                </button>

                <Link to={`/jobs/${job._id}`} className="job-card-link">
                  <div className="job-card-top">
                    {job.companyId?.logo ? (
                      <img src={job.companyId.logo} alt="" className="job-card-logo" />
                    ) : (
                      <span className="job-card-logo job-card-logo-initials" style={{ background: tone }}>{initials}</span>
                    )}
                    <div>
                      <h3>{job.title}</h3>
                      <p className="text-muted">{job.companyId?.companyName}</p>
                    </div>
                  </div>
                  <div className="job-card-meta">
                    <span><FiBriefcase size={13} /> {job.jobType}</span>
                    {job.location?.city && <span><FiMapPin size={13} /> {job.location.city}{job.location.remote ? ' · Remote' : ''}</span>}
                    <span><FiClock size={13} /> {formatRelativeTime(job.createdAt)}</span>
                  </div>
                  <p className="job-card-salary">{formatSalary(job.salaryMin, job.salaryMax, job.payType)}</p>
                  {job.skills?.length > 0 && (
                    <div className="job-card-skills">
                      {job.skills.slice(0, 3).map((s) => <Badge key={s} variant="default">{s}</Badge>)}
                      {job.skills.length > 3 && <Badge variant="default">+{job.skills.length - 3}</Badge>}
                    </div>
                  )}
                  {job.hasApplied && <Badge variant="success" style={{ marginTop: 'var(--space-2)' }}>Applied</Badge>}
                </Link>

                <div className="job-card-footer">
                  <button type="button" className="job-card-bookmark-inline" aria-label="Save job">
                    <FiBookmark size={15} />
                  </button>
                  <Link to={`/jobs/${job._id}`} className="btn btn-outline btn-sm job-card-view-btn">
                    View Details <FiArrowRight size={14} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="jobs-pagination-row">
          <div className="browse-trust-strip-inline">
            {TRUST_STRIP_ITEMS.slice(0, 2).map(({ icon: Icon, tone, title, sub }) => (
              <div className={`browse-trust-item browse-trust-item--${tone}`} key={title}>
                <span className="browse-trust-icon"><Icon size={18} /></span>
                <span className="browse-trust-copy"><strong>{title}</strong><small>{sub}</small></span>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />

          <div className="browse-trust-strip-inline">
            {TRUST_STRIP_ITEMS.slice(2, 4).map(({ icon: Icon, tone, title, sub }) => (
              <div className={`browse-trust-item browse-trust-item--${tone}`} key={title}>
                <span className="browse-trust-icon"><Icon size={18} /></span>
                <span className="browse-trust-copy"><strong>{title}</strong><small>{sub}</small></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
