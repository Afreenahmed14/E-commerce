import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiStar, FiShield, FiCode, FiCpu, FiServer, FiPenTool, FiCloud, FiMail, FiPhone, FiMapPin, FiCalendar, FiUser, FiBriefcase, FiTag } from 'react-icons/fi';
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

  const locationText = [candidate?.location?.city, candidate?.location?.state, candidate?.location?.country]
    .filter(Boolean).join(', ');
  const joinedText = candidate?.createdAt
    ? new Date(candidate.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const initial = candidate?.name ? candidate.name.trim().charAt(0).toUpperCase() : 'U';

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

      <div className="overview-profile-outer">
      <div className="overview-profile-title">Profile Summary</div>

      <div className="overview-profile-grid stagger-children">
        <Card className="overview-pcard overview-pcard-id">
          <div className="overview-pcard-avatar">{initial}</div>
          <div className="overview-pcard-name">{candidate?.name || 'Name not added'}</div>
          <div className="overview-pcard-role">Candidate</div>

          <div className="overview-pcard-meta">
            {candidate?.email && (
              <div className="overview-pcard-meta-row">
                <FiMail size={15} /> <span>{candidate.email}</span>
              </div>
            )}
            {candidate?.phone && (
              <div className="overview-pcard-meta-row">
                <FiPhone size={15} /> <span>{candidate.phone}</span>
              </div>
            )}
            {locationText && (
              <div className="overview-pcard-meta-row">
                <FiMapPin size={15} /> <span>{locationText}</span>
              </div>
            )}
            {joinedText && (
              <div className="overview-pcard-meta-row">
                <FiCalendar size={15} /> <span>Joined on {joinedText}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="overview-pcard overview-pcard-about">
          <div className="overview-pcard-heading">
            <span className="overview-pcard-icon overview-pcard-icon-green"><FiUser size={15} /></span>
            About Me
          </div>
          <p className="text-muted overview-pcard-text">
            {candidate?.about || 'No “about” added yet — tell companies a bit about yourself.'}
          </p>
        </Card>

        <Card className="overview-pcard overview-pcard-experience">
          <div className="overview-pcard-heading">
            <span className="overview-pcard-icon overview-pcard-icon-purple"><FiBriefcase size={15} /></span>
            Experience
          </div>
          <div className="overview-pcard-experience-value">
            {candidate?.experience || 0} years
            {candidate?.experienceMonths ? ` ${candidate.experienceMonths} months` : ''}
          </div>
          <div className="overview-pcard-experience-label">Total Experience</div>
        </Card>

        <Card className="overview-pcard overview-pcard-headline">
          <div className="overview-pcard-heading">
            <span className="overview-pcard-icon overview-pcard-icon-orange"><FiTag size={15} /></span>
            Headline
          </div>
          <p className="overview-pcard-text overview-pcard-headline-text">
            {candidate?.headline || 'No headline yet — add one so companies know what you do.'}
          </p>
        </Card>

        <Card className="overview-pcard overview-pcard-skills">
          <div className="overview-pcard-heading">
            <span className="overview-pcard-icon overview-pcard-icon-blue"><FiCode size={15} /></span>
            Skills
          </div>
          <div className="overview-profile-skill-list">
            {(candidate?.skills || []).length > 0 ? (
              candidate.skills.map((skill, i) => (
                <span key={skill} className="overview-skill-badge" style={{ animationDelay: `${i * 35}ms` }}>
                  <Badge>{skill}</Badge>
                </span>
              ))
            ) : (
              <span className="text-muted">No skills added yet.</span>
            )}
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}
