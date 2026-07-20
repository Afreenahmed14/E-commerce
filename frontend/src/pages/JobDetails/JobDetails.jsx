import { useEffect, useState, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { FiMapPin, FiBriefcase, FiClock, FiUsers } from 'react-icons/fi';
import { jobService } from '../../services/jobService';
import { applicationService } from '../../services/applicationService';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import LoginRequiredModal from '../../components/common/LoginRequiredModal';
import { formatDate } from '../../utils/formatters';
import './JobDetails.css';

const PAY_PERIOD_SUFFIX = { yearly: '/ yr', monthly: '/ mo', weekly: '/ wk', hourly: '/ hr' };

const formatSalary = (min, max, payType = 'yearly') => {
  const suffix = PAY_PERIOD_SUFFIX[payType] || '/ yr';
  const fmt = (n) => (payType === 'yearly' && n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)} ${suffix}`;
  if (min) return `${fmt(min)}+ ${suffix}`;
  if (max) return `Up to ${fmt(max)} ${suffix}`;
  return 'Not disclosed';
};

export default function JobDetails() {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuth();
  const [job, setJob] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showError, showSuccess } = useAlert();
  const [loginRequired, setLoginRequired] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    jobService.getById(id)
      .then((res) => {
        setJob(res.data.job);
        setHasApplied(res.data.hasApplied);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleApplyClick = () => {
    if (!isAuthenticated) { setLoginRequired(true); return; }
    if (role !== 'candidate') return;
    setApplyOpen(true);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await applicationService.apply(id, coverLetter);
      setHasApplied(true);
      setApplyOpen(false);
      showSuccess('Application submitted.');
    } catch (err) {
      showError(err.response?.data?.message || 'Could not submit your application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (role === 'company') return <Navigate to="/company/dashboard/jobs" replace />;
  if (loading) return <Loader fullPage label="Loading job…" />;
  if (!job) return <div className="container section"><p>Job not found.</p></div>;

  const isCandidate = isAuthenticated && role === 'candidate';
  const isClosed = job.status !== 'open';

  return (
    <div className="container section job-details-page">
      <Card className="job-details-card">
        <div className="job-details-header">
          <img
            src={job.companyId?.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${job.companyId?.companyName || 'C'}`}
            alt=""
            className="job-details-logo"
          />
          <div className="job-details-heading">
            <h1>{job.title}</h1>
            <p className="job-details-company">{job.companyId?.companyName}</p>
            {job.companyId?.verificationStatus === 'verified' && <Badge variant="success">Verified</Badge>}
          </div>
        </div>

        <div className="job-details-meta">
          <span><FiBriefcase size={14} /> {job.jobType}</span>
          {job.location?.city && <span><FiMapPin size={14} /> {job.location.city}{job.location.remote ? ' · Remote' : ''}</span>}
          <span><FiClock size={14} /> Posted {formatDate(job.createdAt)}</span>
          <span><FiUsers size={14} /> {job.openings} opening{job.openings === 1 ? '' : 's'}</span>
        </div>

        <p className="job-details-salary">{formatSalary(job.salaryMin, job.salaryMax, job.payType)}</p>
        {(job.experienceMin || job.experienceMax) && (
          <p className="text-muted">
            Experience: {job.experienceMin || 0}{job.experienceMax ? `–${job.experienceMax}` : '+'} years
          </p>
        )}

        {job.skills?.length > 0 && (
          <div className="job-details-skills">
            {job.skills.map((s) => <Badge key={s} variant="default">{s}</Badge>)}
          </div>
        )}

        <h2>Job Description</h2>
        <p className="job-details-description">{job.description}</p>

        <div className="job-details-actions">
          {isClosed ? (
            <Badge variant="default">This job is closed</Badge>
          ) : hasApplied ? (
            <Badge variant="success">You've applied to this job</Badge>
          ) : (
            <Button onClick={handleApplyClick} disabled={isAuthenticated && !isCandidate}>
              {isAuthenticated && !isCandidate ? 'Only engineers can apply' : 'Apply Now'}
            </Button>
          )}
        </div>
      </Card>

      <Modal isOpen={applyOpen} title={`Apply to ${job.title}`} onClose={() => setApplyOpen(false)}>
        <form onSubmit={handleSubmitApplication} className="job-apply-form">
          <label className="form-label">
            Cover letter (optional)
            <textarea
              value={coverLetter}
              maxLength={2000}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={6}
              placeholder="Tell the company why you're a good fit…"
              className="form-input job-apply-textarea"
            />
          </label>
          <Button type="submit" loading={submitting} fullWidth>Submit Application</Button>
        </form>
      </Modal>

      <LoginRequiredModal open={loginRequired} onClose={() => setLoginRequired(false)} />
    </div>
  );
}
