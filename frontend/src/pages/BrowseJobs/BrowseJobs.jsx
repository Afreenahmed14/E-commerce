import { useEffect, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiBriefcase, FiClock } from 'react-icons/fi';
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
  { value: '', label: 'All types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

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
    <div className="container section browse-jobs-page">
      <div className="browse-jobs-hero">
        <h1>Browse Jobs</h1>
        <p className="text-muted browse-subtitle">
          Search full-time, part-time, contract, and internship openings posted by companies on the platform.
        </p>
      </div>

      <div className="jobs-filterbar">
        <div className="filter-search-inline">
          <FiSearch />
          <input
            placeholder="Search by title, skill, or keyword…"
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
          />
        </div>
        <select value={jobType} onChange={(e) => { setPage(1); setJobType(e.target.value); }}>
          {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={developerType} onChange={(e) => { setPage(1); setDeveloperType(e.target.value); }}>
          <option value="">All developer types</option>
          {developerTypes.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      <p className="text-muted jobs-results-count">
        {loading ? 'Searching…' : `${pagination.total ?? jobs.length} job${(pagination.total ?? jobs.length) === 1 ? '' : 's'} found`}
      </p>

      {loading ? (
        <Loader label="Finding jobs…" />
      ) : jobs.length === 0 ? (
        <EmptyState title="No jobs match your search" description="Try a different keyword or filter." />
      ) : (
        <div className="jobs-grid">
          {jobs.map((job) => (
            <Link to={`/jobs/${job._id}`} key={job._id} className="job-card-link">
              <Card className="job-card">
                <div className="job-card-top">
                  <img
                    src={job.companyId?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${job.companyId?.companyName || 'C'}`}
                    alt=""
                    className="job-card-logo"
                  />
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
                    {job.skills.slice(0, 4).map((s) => <Badge key={s} variant="default">{s}</Badge>)}
                  </div>
                )}
                {job.hasApplied && <Badge variant="success" style={{ marginTop: 'var(--space-2)' }}>Applied</Badge>}
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
