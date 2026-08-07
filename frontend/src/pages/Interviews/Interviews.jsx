import { useEffect, useState, useCallback } from 'react';
import { FiVideo, FiCalendar, FiCheck, FiX, FiClock, FiExternalLink } from 'react-icons/fi';
import { interviewService } from '../../services/interviewService';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, toDateTimeInputValue } from '../../utils/formatters';
import './Interviews.css';

const STATUS_VARIANT = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  rescheduled: 'info',
  completed: 'default',
  cancelled: 'danger',
};

const PLATFORM_LABEL = { 'google-meet': 'Google Meet', zoom: 'Zoom', teams: 'Microsoft Teams' };

export default function Interviews() {
  const { role } = useAuth();
  const { showError, showSuccess } = useAlert();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [proposedAt, setProposedAt] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = role === 'candidate'
        ? await interviewService.getMine()
        : await interviewService.getCompany();
      setInterviews(res.data.interviews);
    } catch (err) {
      showError(err.response?.data?.message || 'Could not load interviews.');
    } finally {
      setLoading(false);
    }
  }, [role, showError]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async (id, action) => {
    try {
      await interviewService.respond(id, action);
      showSuccess(`Interview ${action}ed.`);
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Action failed.');
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleFor || !proposedAt) return;
    setSubmitting(true);
    try {
      await interviewService.requestReschedule(rescheduleFor, { proposedAt, note: rescheduleNote });
      showSuccess('Reschedule requested.');
      setRescheduleFor(null);
      setProposedAt('');
      setRescheduleNote('');
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Reschedule request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReschedule = async (id, scheduledAt) => {
    if (!scheduledAt) return;
    try {
      await interviewService.confirmReschedule(id, { scheduledAt });
      showSuccess('Reschedule confirmed.');
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not confirm reschedule.');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this interview?')) return;
    try {
      await interviewService.cancel(id);
      showSuccess('Interview cancelled.');
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not cancel interview.');
    }
  };

  if (loading) return <Loader fullPage label="Loading interviews…" />;

  return (
    <div className="interviews-page">
      <div className="dashboard-header">
        <h1>Interviews</h1>
        <p className="text-muted">
          {role === 'candidate' ? 'Your scheduled interviews with recruiters.' : 'Manage interviews for your job applicants.'}
        </p>
      </div>

      {interviews.length === 0 ? (
        <EmptyState title="No interviews yet" description="When an interview is scheduled it will appear here." />
      ) : (
        <div className="interviews-list">
          {interviews.map((iv) => {
            const isCandidate = role === 'candidate';
            const otherName = isCandidate ? iv.companyId?.companyName : iv.candidateId?.name;
            const otherSub = isCandidate ? '' : iv.candidateId?.headline || '';
            const jobTitle = iv.jobId?.title || 'Job';

            return (
              <Card key={iv._id} className="interview-card">
                <div className="interview-card-top">
                  <div className="interview-avatar">
                    {isCandidate
                      ? (iv.companyId?.logo ? <img src={iv.companyId.logo} alt="" /> : <FiVideo />)
                      : (iv.candidateId?.profileImage ? <img src={iv.candidateId.profileImage} alt="" /> : <FiVideo />)}
                  </div>
                  <div className="interview-info">
                    <strong>{iv.title || 'Interview'}</strong>
                    <div className="text-muted">{otherName} · {jobTitle}</div>
                    {otherSub && <div className="text-muted">{otherSub}</div>}
                  </div>
                  <Badge variant={STATUS_VARIANT[iv.status] || 'default'}>{iv.status}</Badge>
                </div>

                <div className="interview-details">
                  <span><FiCalendar /> {formatDate(iv.scheduledAt)}</span>
                  <span><FiClock /> {new Date(iv.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {iv.durationMinutes} min</span>
                  <span><FiVideo /> {PLATFORM_LABEL[iv.platform] || iv.platform}</span>
                  {iv.meetingLink && (
                    <a href={iv.meetingLink} target="_blank" rel="noreferrer" className="interview-link">
                      <FiExternalLink /> Join Meeting
                    </a>
                  )}
                </div>

                {iv.notes && <p className="interview-notes text-muted">{iv.notes}</p>}

                {iv.status === 'rescheduled' && iv.rescheduleRequest?.proposedAt && (
                  <div className="interview-reschedule-request">
                    <strong>Reschedule requested:</strong> {formatDate(iv.rescheduleRequest.proposedAt)} {new Date(iv.rescheduleRequest.proposedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {iv.rescheduleRequest.note && <div className="text-muted">{iv.rescheduleRequest.note}</div>}
                    {!isCandidate && (
                      <div className="interview-actions">
                        <input
                          type="datetime-local"
                          defaultValue={toDateTimeInputValue(iv.rescheduleRequest.proposedAt)}
                          id={`confirm-${iv._id}`}
                          className="interview-datetime"
                        />
                        <Button size="sm" variant="primary" onClick={() => handleConfirmReschedule(iv._id, document.getElementById(`confirm-${iv._id}`).value)}>
                          Confirm New Time
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="interview-actions">
                  {isCandidate && iv.status === 'pending' && (
                    <>
                      <Button size="sm" variant="success" onClick={() => handleRespond(iv._id, 'accept')}><FiCheck /> Accept</Button>
                      <Button size="sm" variant="danger" onClick={() => handleRespond(iv._id, 'reject')}><FiX /> Reject</Button>
                      <Button size="sm" variant="secondary" onClick={() => setRescheduleFor(iv._id)}><FiClock /> Reschedule</Button>
                    </>
                  )}
                  {isCandidate && iv.status === 'accepted' && iv.meetingLink && (
                    <a href={iv.meetingLink} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="primary"><FiExternalLink /> Join Meeting</Button>
                    </a>
                  )}
                  {!isCandidate && iv.status !== 'cancelled' && iv.status !== 'completed' && (
                    <Button size="sm" variant="danger" onClick={() => handleCancel(iv._id)}><FiX /> Cancel</Button>
                  )}
                </div>

                {rescheduleFor === iv._id && (
                  <form onSubmit={handleReschedule} className="interview-reschedule-form">
                    <input
                      type="datetime-local"
                      required
                      value={proposedAt}
                      onChange={(e) => setProposedAt(e.target.value)}
                      className="interview-datetime"
                    />
                    <input
                      type="text"
                      placeholder="Note (optional)"
                      value={rescheduleNote}
                      onChange={(e) => setRescheduleNote(e.target.value)}
                      className="interview-datetime"
                    />
                    <Button type="submit" size="sm" loading={submitting}>Request Reschedule</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setRescheduleFor(null)}>Reschedule Cancel</Button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
