import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiStar } from 'react-icons/fi';
import { applicationService } from '../../services/applicationService';
import { asDownloadUrl } from '../../utils/fileUrl';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import StarRating from '../../components/common/StarRating';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = ['applied', 'shortlisted', 'rejected', 'hired'];
const STATUS_VARIANT = { applied: 'default', shortlisted: 'info', hired: 'success', rejected: 'danger' };

export default function JobApplicants() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationService.getForJob(jobId)
      .then((res) => {
        setJob(res.data.job);
        setApplications(res.data.applications);
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleStatusChange = async (applicationId, status) => {
    setApplications((prev) => prev.map((a) => (a._id === applicationId ? { ...a, status } : a)));
    try {
      await applicationService.updateStatus(applicationId, status);
    } catch {
      // Refetch on failure so the dropdown doesn't lie about actual state.
      applicationService.getForJob(jobId).then((res) => setApplications(res.data.applications));
    }
  };

  if (loading) return <Loader label="Loading applicants…" />;

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <Link to="/company/dashboard/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 'var(--space-2)' }}>
            <FiArrowLeft size={14} /> Back to My Jobs
          </Link>
          <h1>Applicants for "{job?.title}"</h1>
        </div>
      </div>

      {applications.length === 0 ? (
        <EmptyState title="No applications yet" description="Candidates who apply to this job will appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {applications.map((app) => (
            <Card key={app._id} style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <img
                    src={app.candidateId?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${app.candidateId?.name || 'C'}`}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: 'var(--radius-full, 50%)', objectFit: 'cover' }}
                  />
                  <div>
                    <h3 style={{ margin: '0 0 2px' }}>{app.candidateId?.name}</h3>
                    <p className="text-muted" style={{ margin: 0 }}>{app.candidateId?.headline}</p>
                    <StarRating value={app.candidateId?.rating} size={13} />
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <Badge variant={STATUS_VARIANT[app.status] || 'default'}>{app.status}</Badge>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)' }}>
                    Applied {formatDate(app.createdAt)}
                  </p>
                </div>
              </div>

              {app.coverLetter && <p style={{ marginTop: 'var(--space-3)' }}>{app.coverLetter}</p>}

              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                {(app.resumeSnapshot || app.candidateId?.resume) && (
                  <a
                    href={asDownloadUrl(app.resumeSnapshot || app.candidateId?.resume, `${app.candidateId?.name || 'candidate'}-resume.pdf`)}
                    className="social-link"
                  >
                    <FiDownload /> Resume
                  </a>
                )}

                <select
                  value={app.status}
                  onChange={(e) => handleStatusChange(app._id, e.target.value)}
                  className="form-input"
                  style={{ width: 'auto' }}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
