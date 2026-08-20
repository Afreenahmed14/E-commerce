import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiStar, FiShield, FiCode, FiCpu, FiServer, FiPenTool, FiCloud } from 'react-icons/fi';
import { FaRupeeSign } from "react-icons/fa";
import { candidateService } from '../../services/candidateService';
import { jobService } from '../../services/jobService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import CountUpValue from '../../components/common/CountUpValue';
import StarRating from '../../components/common/StarRating';
import './Overview.css';

const JOB_THEMES = [
  { color: 'blue', icon: FiCode },
  { color: 'pink', icon: FiCpu },
  { color: 'green', icon: FiServer },
  { color: 'orange', icon: FiPenTool },
  { color: 'purple', icon: FiCloud },
];

export default function CandidateOverview() {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentJobs, setRecentJobs] = useState([]);

  useEffect(() => {
    candidateService.getMyProfile()
      .then((res) => setCandidate(res.data.candidate))
      .finally(() => setLoading(false));

    jobService.search({ limit: 10, sort: '-createdAt' })
      .then((res) => setRecentJobs(res.data?.jobs || res.data?.results || []))
      .catch(() => setRecentJobs([]));
  }, []);

  if (loading) return <Loader label="Loading your dashboard…" />;

  const profileComplete = Boolean(candidate?.headline && candidate?.about && candidate?.skills?.length);

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="overview-welcome">Welcome Back</h1>
      </div>

      {!profileComplete && (
        <Card className="stat-card" style={{ marginBottom: 'var(--space-6)', borderLeft: '3px solid var(--color-warning)' }}>
          <p><strong>Your profile is incomplete.</strong> Complete your headline, about, and skills so companies can find you in search.</p>
        </Card>
      )}

      <div className="stat-grid stagger-children">
        <Card className="stat-card overview-stat-card">
          <div className="stat-icon-circle stat-icon-blue"><FaRupeeSign size={18} /></div>
          <div className="stat-card-body">
            <div className="stat-card-label">Your Charges Per Hour</div>
            <div className="stat-card-value">₹<CountUpValue value={candidate?.hourlyRate || 0} /></div>
          </div>
        </Card>
        <Card className="stat-card overview-stat-card">
          <div className="stat-icon-circle stat-icon-orange"><FiStar size={18} /></div>
          <div className="stat-card-body">
            <div className="stat-card-label">Rating</div>
            <div className="stat-card-value"><StarRating value={candidate?.rating} reviewsCount={candidate?.reviewsCount || 0} size={16} /></div>
          </div>
        </Card>
        <Card className="stat-card overview-stat-card">
          <div className="stat-icon-circle stat-icon-indigo"><FiEye size={18} /></div>
          <div className="stat-card-body">
            <div className="stat-card-label">Visibility</div>
            <div className="stat-card-value" style={{ fontSize: 'var(--font-size-lg)', textTransform: 'capitalize' }}>{candidate?.visibility}</div>
          </div>
        </Card>
        <Card className="stat-card overview-stat-card">
          <div className="stat-icon-circle stat-icon-green"><FiShield size={18} /></div>
          <div className="stat-card-body">
            <div className="stat-card-label">Verification</div>
            <Badge variant={candidate?.verificationStatus === 'verified' ? 'success' : 'default'}>
              {candidate?.verificationStatus}
            </Badge>
          </div>
        </Card>
      </div>

      <div className="overview-jobs-section">
        <div className="overview-jobs-title">Recent Jobs</div>
        {recentJobs.length === 0 ? (
          <p className="overview-jobs-empty">No recent jobs to show right now.</p>
        ) : (
          <div className="overview-marquee">
            <div className="overview-marquee-track">
              {[...recentJobs, ...recentJobs].map((job, i) => {
                const theme = JOB_THEMES[i % recentJobs.length % JOB_THEMES.length];
                const Icon = theme.icon;
                return (
                  <Link
                    to={`/jobs/${job._id}`}
                    key={`${job._id}-${i}`}
                    className={`overview-job-card overview-job-${theme.color}`}
                  >
                    <div className={`overview-job-icon overview-job-icon-${theme.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="overview-job-title">{job.title}</div>
                    <div className="overview-job-company">{job.companyName || job.companyId?.companyName || ''}</div>
                    <span className={`overview-job-badge overview-job-badge-${theme.color}`}>
                      {job.location?.remote || job.remote ? 'Remote' : 'On-site'}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Card className="overview-profile-summary">
        <h3 className="overview-profile-title">Profile Summary</h3>

        <div className="overview-profile-info">
          <div className="overview-profile-item">
            <span className="overview-profile-label">Candidate Name</span>
            <strong>{candidate?.name || 'Name not added'}</strong>
          </div>

          <div className="overview-profile-item">
            <span className="overview-profile-label">Experience</span>
            <strong>
              {candidate?.experience || 0} years
              {candidate?.experienceMonths
                ? ` ${candidate.experienceMonths} months`
                : ''}
            </strong>
          </div>
        </div>

        <div className="overview-profile-headline">
          <span className="overview-profile-label">Headline</span>
          <p className="text-muted">
            {candidate?.headline ||
              'No headline yet — add one so companies know what you do.'}
          </p>
        </div>

        <div className="overview-profile-skills">
          <span className="overview-profile-label">Skills</span>

          <div className="overview-profile-skill-list">
            {(candidate?.skills || []).length > 0 ? (
              candidate.skills.map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))
            ) : (
              <span className="text-muted">No skills added yet.</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
