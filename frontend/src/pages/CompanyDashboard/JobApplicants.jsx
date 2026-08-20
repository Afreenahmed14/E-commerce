import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiStar, FiChevronDown, FiChevronUp, FiMessageSquare, FiVideo } from 'react-icons/fi';
import { applicationService } from '../../services/applicationService';
import { conversationService } from '../../services/conversationService';
import { interviewService } from '../../services/interviewService';
import { asDownloadUrl } from '../../utils/fileUrl';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import StarRating from '../../components/common/StarRating';
import ScheduleMeetingModal from '../../components/common/ScheduleMeetingModal';
import { useAlert } from '../../context/AlertContext';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = ['applied', 'shortlisted', 'rejected', 'hired'];
const STATUS_VARIANT = { applied: 'default', shortlisted: 'info', hired: 'success', rejected: 'danger' };

export default function JobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useAlert();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [messagingId, setMessagingId] = useState(null);
  const [schedulingFor, setSchedulingFor] = useState(null); // application object, or null
  const [scheduling, setScheduling] = useState(false);

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

  const handleMessage = async (candidateId) => {
    setMessagingId(candidateId);
    try {
      const res = await conversationService.start({ candidateId, jobId });
      navigate(`/company/dashboard/messages?conv=${res.data.conversation._id}`);
    } catch (err) {
      showError(err.response?.data?.message || 'Could not start conversation.');
    } finally {
      setMessagingId(null);
    }
  };

  const handleScheduleInterview = async (payload) => {
    setScheduling(true);
    try {
      await interviewService.schedule({ ...payload, applicationId: schedulingFor._id });
      showSuccess('Interview invite sent.');
      setSchedulingFor(null);
    } catch (err) {
      showError(err.response?.data?.message || 'Could not schedule interview.');
    } finally {
      setScheduling(false);
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
                    {app.candidateId?.skills?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {app.candidateId.skills.slice(0, 6).map((skill) => (
                          <Badge key={skill} variant="default">{skill}</Badge>
                        ))}
                      </div>
                    )}
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

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleMessage(app.candidateId?._id)}
                  loading={messagingId === app.candidateId?._id}
                >
                  <FiMessageSquare /> Message
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setSchedulingFor(app)}
                >
                  <FiVideo /> Schedule Interview
                </Button>

                {app.answers?.length > 0 && (
                  <button
                    type="button"
                    className="social-link"
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setExpandedId(expandedId === app._id ? null : app._id)}
                  >
                    {expandedId === app._id ? <FiChevronUp /> : <FiChevronDown />}
                    {' '}Questionnaire ({app.answers.filter((a) => a.isCorrect).length}/{app.answers.length} correct)
                  </button>
                )}
              </div>

              {expandedId === app._id && app.answers?.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                  {app.answers.map((a, idx) => (
                    <div key={idx} style={{ marginBottom: 'var(--space-3)' }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
                        Q{idx + 1}. {a.question?.question}
                      </p>
                      <p style={{ margin: 0 }}>
                        Answer: {a.answer}{' '}
                        {a.question?.type === 'mcq' && (
                          <Badge variant={a.isCorrect ? 'success' : 'danger'}>
                            {a.isCorrect ? 'Correct' : 'Incorrect'}
                          </Badge>
                        )}
                      </p>
                      {a.question?.type === 'mcq' && !a.isCorrect && a.question?.correctOptionIndex != null && (
                        <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 'var(--font-size-sm)' }}>
                          Correct answer: {a.question.options?.[a.question.correctOptionIndex]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ScheduleMeetingModal
        isOpen={!!schedulingFor}
        onClose={() => setSchedulingFor(null)}
        onSubmit={handleScheduleInterview}
        submitting={scheduling}
        withLabel={schedulingFor?.candidateId?.name}
        defaultTitle={`Interview for ${job?.title || 'this role'}`}
        defaultDuration={60}
      />
    </div>
  );
}