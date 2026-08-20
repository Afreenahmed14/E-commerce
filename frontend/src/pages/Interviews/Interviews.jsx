import { useEffect, useState, useCallback } from 'react';
import { FiVideo, FiCalendar, FiCheck, FiX, FiClock, FiExternalLink, FiPlus } from 'react-icons/fi';
import { interviewService } from '../../services/interviewService';
import { partnerMeetingService } from '../../services/partnerMeetingService';
import { candidateService } from '../../services/candidateService';
import { jobService } from '../../services/jobService';
import { applicationService } from '../../services/applicationService';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../context/AlertContext';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import ScheduleMeetingModal from '../../components/common/ScheduleMeetingModal';
import { formatDate, toDateTimeInputValue } from '../../utils/formatters';
import './Interviews.css';

const STATUS_VARIANT = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  declined: 'danger',
  rescheduled: 'info',
  completed: 'default',
  cancelled: 'danger',
};

const PLATFORM_LABEL = { 'google-meet': 'Google Meet', zoom: 'Zoom', teams: 'Microsoft Teams' };

/**
 * One meeting card, shared by both the Interviews tab and the Partner
 * Meetings tab. `meta` carries everything that differs between the two:
 * who the "other side" is, whether the current viewer may respond /
 * cancel / confirm a reschedule, and the action callbacks to wire up.
 */
function MeetingCard({ meeting, meta }) {
  const {
    otherName, otherSub, otherAvatar, jobTitle,
    canRespond, canReschedule, canConfirmReschedule, canCancel, canJoin,
    rescheduleFor, setRescheduleFor, proposedAt, setProposedAt,
    rescheduleNote, setRescheduleNote, submitting,
    onRespond, onReschedule, onConfirmReschedule, onCancel,
    respondLabels, // { acceptLabel, declineLabel, acceptAction, declineAction }
  } = meta;

  return (
    <Card className="interview-card">
      <div className="interview-card-top">
        <div className="interview-avatar">
          {otherAvatar ? <img src={otherAvatar} alt="" /> : <FiVideo />}
        </div>
        <div className="interview-info">
          <strong>{meeting.title || 'Meeting'}</strong>
          <div className="text-muted">{otherName}{jobTitle ? ` · ${jobTitle}` : ''}</div>
          {otherSub && <div className="text-muted">{otherSub}</div>}
        </div>
        <Badge variant={STATUS_VARIANT[meeting.status] || 'default'}>{meeting.status}</Badge>
      </div>

      <div className="interview-details">
        <span><FiCalendar /> {formatDate(meeting.scheduledAt)}</span>
        <span><FiClock /> {new Date(meeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {meeting.durationMinutes} min</span>
        <span><FiVideo /> {PLATFORM_LABEL[meeting.platform] || meeting.platform}</span>
        {meeting.meetingLink && (
          <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="interview-link">
            <FiExternalLink /> Join Meeting
          </a>
        )}
      </div>

      {meeting.notes && <p className="interview-notes text-muted">{meeting.notes}</p>}

      {meeting.status === 'rescheduled' && meeting.rescheduleRequest?.proposedAt && (
        <div className="interview-reschedule-request">
          <strong>Reschedule requested:</strong> {formatDate(meeting.rescheduleRequest.proposedAt)} {new Date(meeting.rescheduleRequest.proposedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {meeting.rescheduleRequest.note && <div className="text-muted">{meeting.rescheduleRequest.note}</div>}
          {canConfirmReschedule && (
            <div className="interview-actions">
              <input
                type="datetime-local"
                defaultValue={toDateTimeInputValue(meeting.rescheduleRequest.proposedAt)}
                id={`confirm-${meeting._id}`}
                className="interview-datetime"
              />
              <Button size="sm" variant="primary" onClick={() => onConfirmReschedule(meeting._id, document.getElementById(`confirm-${meeting._id}`).value)}>
                Confirm New Time
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="interview-actions">
        {canRespond && meeting.status === 'pending' && (
          <>
            <Button size="sm" variant="success" onClick={() => onRespond(meeting._id, respondLabels.acceptAction)}>
              <FiCheck /> {respondLabels.acceptLabel}
            </Button>
            <Button size="sm" variant="danger" onClick={() => onRespond(meeting._id, respondLabels.declineAction)}>
              <FiX /> {respondLabels.declineLabel}
            </Button>
            {canReschedule && (
              <Button size="sm" variant="secondary" onClick={() => setRescheduleFor(meeting._id)}>
                <FiClock /> Reschedule
              </Button>
            )}
          </>
        )}
        {canJoin && meeting.status === 'accepted' && meeting.meetingLink && (
          <a href={meeting.meetingLink} target="_blank" rel="noreferrer">
            <Button size="sm" variant="primary"><FiExternalLink /> Join Meeting</Button>
          </a>
        )}
        {canCancel && meeting.status !== 'cancelled' && meeting.status !== 'completed' && (
          <Button size="sm" variant="danger" onClick={() => onCancel(meeting._id)}><FiX /> Cancel</Button>
        )}
      </div>

      {rescheduleFor === meeting._id && (
        <form onSubmit={onReschedule} className="interview-reschedule-form">
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
          <Button type="button" size="sm" variant="secondary" onClick={() => setRescheduleFor(null)}>Cancel</Button>
        </form>
      )}
    </Card>
  );
}

/** Company-side "Applied Candidates" view: pick a job, see every
 * candidate who applied listed right below (name, skills, status), each
 * with its own "Schedule Interview" button — so companies don't have to
 * first drill into a job's applicants page to schedule. */
function AppliedCandidatesPanel({ onScheduled }) {
  const { showError, showSuccess } = useAlert();
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [schedulingFor, setSchedulingFor] = useState(null); // application object, or null
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await jobService.getMyJobs();
        setJobs(res.data.jobs || []);
      } catch (err) {
        showError(err.response?.data?.message || 'Could not load your jobs.');
      }
    })();
  }, [showError]);

  const handleJobChange = async (id) => {
    setJobId(id);
    setApplicants([]);
    if (!id) return;
    setLoadingApplicants(true);
    try {
      const res = await applicationService.getForJob(id);
      setApplicants(res.data.applications || []);
    } catch (err) {
      showError(err.response?.data?.message || 'Could not load applicants for this job.');
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleSchedule = async (payload) => {
    setSubmitting(true);
    try {
      await interviewService.schedule({ ...payload, applicationId: schedulingFor._id });
      showSuccess('Interview invite sent.');
      setSchedulingFor(null);
      onScheduled?.();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not schedule interview.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="applied-candidates-panel">
      <select className="form-input" value={jobId} onChange={(e) => handleJobChange(e.target.value)}>
        <option value="">Select a job to see its applicants…</option>
        {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
      </select>

      {jobId && loadingApplicants && <Loader label="Loading applicants…" />}

      {jobId && !loadingApplicants && applicants.length === 0 && (
        <EmptyState title="No applicants yet" description="No one has applied to this job yet." />
      )}

      {jobId && !loadingApplicants && applicants.length > 0 && (
        <div className="applied-candidates-list">
          {applicants.map((app) => (
            <Card key={app._id} className="applied-candidate-card">
              <img
                src={app.candidateId?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${app.candidateId?.name || 'C'}`}
                alt=""
                className="applicant-mini-avatar"
              />
              <div className="applied-candidate-info">
                <strong>{app.candidateId?.name}</strong>
                <span className="text-muted">{app.candidateId?.headline}</span>
                {app.candidateId?.skills?.length > 0 && (
                  <div className="applicant-mini-skills">
                    {app.candidateId.skills.slice(0, 6).map((skill) => (
                      <Badge key={skill} variant="default">{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Badge variant={app.status === 'hired' ? 'success' : app.status === 'rejected' ? 'danger' : 'default'}>{app.status}</Badge>
              <Button size="sm" variant="primary" onClick={() => setSchedulingFor(app)}>
                <FiVideo /> Schedule Interview
              </Button>
            </Card>
          ))}
        </div>
      )}

      <ScheduleMeetingModal
        isOpen={!!schedulingFor}
        onClose={() => setSchedulingFor(null)}
        onSubmit={handleSchedule}
        submitting={submitting}
        withLabel={schedulingFor?.candidateId?.name}
        defaultTitle="Interview"
        defaultDuration={60}
      />
    </div>
  );
}

/** Company-scheduled interviews (candidate accepts/rejects/reschedules; company schedules/cancels/confirms). */
function InterviewsTab({ role }) {
  const { showError, showSuccess } = useAlert();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [proposedAt, setProposedAt] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [companyView, setCompanyView] = useState('scheduled'); // 'scheduled' | 'applied'
  const [jobFilter, setJobFilter] = useState('');

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
      await interviewService.requestReschedule(rescheduleFor, proposedAt, rescheduleNote);
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
      await interviewService.confirmReschedule(id, scheduledAt);
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

  if (loading) return <Loader label="Loading interviews…" />;

  // Candidates just see their interview list — no sub-tabs, no job filter.
  if (role === 'candidate') {
    if (interviews.length === 0) {
      return (
        <EmptyState
          title="No interviews yet"
          description="When a company schedules an interview with you, it will appear here."
        />
      );
    }
    return (
      <div className="interviews-list">
        {interviews.map((iv) => (
          <MeetingCard
            key={iv._id}
            meeting={iv}
            meta={{
              otherName: iv.companyId?.companyName,
              otherSub: '',
              otherAvatar: iv.companyId?.logo,
              jobTitle: iv.jobId?.title || 'Job',
              canRespond: true,
              canReschedule: true,
              canConfirmReschedule: false,
              canCancel: false,
              canJoin: true,
              rescheduleFor, setRescheduleFor, proposedAt, setProposedAt,
              rescheduleNote, setRescheduleNote, submitting,
              onRespond: handleRespond,
              onReschedule: handleReschedule,
              onConfirmReschedule: handleConfirmReschedule,
              onCancel: handleCancel,
              respondLabels: { acceptLabel: 'Accept', declineLabel: 'Reject', acceptAction: 'accept', declineAction: 'reject' },
            }}
          />
        ))}
      </div>
    );
  }

  // Company view: two sub-tabs — "Scheduled Meetings" (every interview
  // this company has booked, filterable by job) and "Applied Candidates"
  // (pick a job, see everyone who applied, schedule right from there).
  const jobsWithInterviews = interviews
    .map((iv) => iv.jobId)
    .filter(Boolean)
    .filter((j, idx, arr) => arr.findIndex((x) => x._id === j._id) === idx);
  const filteredInterviews = jobFilter ? interviews.filter((iv) => iv.jobId?._id === jobFilter) : interviews;

  return (
    <div className="interviews-tab-body">
      <div className="company-view-tabs">
        <button
          type="button"
          className={`interviews-tab-btn ${companyView === 'scheduled' ? 'active' : ''}`}
          onClick={() => setCompanyView('scheduled')}
        >
          <FiVideo /> Scheduled Meetings
        </button>
        <button
          type="button"
          className={`interviews-tab-btn ${companyView === 'applied' ? 'active' : ''}`}
          onClick={() => setCompanyView('applied')}
        >
          <FiPlus /> Applied Candidates
        </button>
      </div>

      {companyView === 'applied' ? (
        <AppliedCandidatesPanel onScheduled={() => { load(); setCompanyView('scheduled'); }} />
      ) : interviews.length === 0 ? (
        <EmptyState
          title="No interviews scheduled yet"
          description='Switch to "Applied Candidates" to pick a job and schedule your first interview.'
        />
      ) : (
        <>
          {jobsWithInterviews.length > 1 && (
            <select className="form-input" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} style={{ maxWidth: 280 }}>
              <option value="">All jobs</option>
              {jobsWithInterviews.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
          )}
          <div className="interviews-list">
            {filteredInterviews.map((iv) => (
              <MeetingCard
                key={iv._id}
                meeting={iv}
                meta={{
                  otherName: iv.candidateId?.name,
                  otherSub: iv.candidateId?.headline || '',
                  otherAvatar: iv.candidateId?.profileImage,
                  jobTitle: iv.jobId?.title || 'Job',
                  // Company is the scheduling authority — only the
                  // candidate may accept/reject/request-reschedule; only
                  // the company may confirm a reschedule or cancel.
                  canRespond: false,
                  canReschedule: false,
                  canConfirmReschedule: true,
                  canCancel: true,
                  canJoin: false,
                  rescheduleFor, setRescheduleFor, proposedAt, setProposedAt,
                  rescheduleNote, setRescheduleNote, submitting,
                  onRespond: handleRespond,
                  onReschedule: handleReschedule,
                  onConfirmReschedule: handleConfirmReschedule,
                  onCancel: handleCancel,
                  respondLabels: { acceptLabel: 'Accept', declineLabel: 'Reject', acceptAction: 'accept', declineAction: 'reject' },
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Candidate <-> project partner meetings — either side may organize. */
function PartnerMeetingsTab({ userId }) {
  const { showError, showSuccess } = useAlert();
  const [meetings, setMeetings] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [proposedAt, setProposedAt] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scheduleFor, setScheduleFor] = useState(null); // partner object, or null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meetingsRes, myPartnersRes, hiredByRes] = await Promise.all([
        partnerMeetingService.getMine(),
        candidateService.getMyProjectPartners(),
        candidateService.getHiredBy(),
      ]);
      setMeetings(meetingsRes.data.meetings);

      // "My project partners" = anyone I hired as a partner, plus anyone
      // who hired me as a partner — either direction counts as a partner
      // relationship you can schedule a meeting against.
      const iHired = (myPartnersRes.data.hires || []).map((h) => h.candidateId).filter(Boolean);
      const hiredMe = (hiredByRes.data.hires || [])
        .filter((h) => h.hirerType === 'candidate')
        .map((h) => h.hiringCandidateId)
        .filter(Boolean);
      const merged = [...iHired, ...hiredMe].filter((p, idx, arr) => arr.findIndex((x) => x._id === p._id) === idx);
      setPartners(merged);
    } catch (err) {
      showError(err.response?.data?.message || 'Could not load partner meetings.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { load(); }, [load]);

  const handleSchedule = async (payload) => {
    setSubmitting(true);
    try {
      await partnerMeetingService.schedule({ ...payload, partnerId: scheduleFor._id });
      showSuccess('Meeting invite sent.');
      setScheduleFor(null);
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not schedule meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (id, action) => {
    try {
      await partnerMeetingService.respond(id, action);
      showSuccess(`Meeting ${action}ed.`);
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
      await partnerMeetingService.requestReschedule(rescheduleFor, proposedAt, rescheduleNote);
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
      await partnerMeetingService.confirmReschedule(id, scheduledAt);
      showSuccess('Reschedule confirmed.');
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not confirm reschedule.');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this meeting?')) return;
    try {
      await partnerMeetingService.cancel(id);
      showSuccess('Meeting cancelled.');
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not cancel meeting.');
    }
  };

  if (loading) return <Loader label="Loading partner meetings…" />;

  return (
    <div className="partner-meetings-tab">
      <div className="partner-meetings-toolbar">
        <p className="text-muted" style={{ margin: 0 }}>
          Schedule a meeting with anyone you've hired — or been hired by — as a project partner.
        </p>
        {partners.length > 0 && (
          <div className="partner-meetings-picker">
            <select
              className="form-input"
              value=""
              onChange={(e) => {
                const p = partners.find((x) => x._id === e.target.value);
                if (p) setScheduleFor(p);
              }}
            >
              <option value="" disabled>Select a partner…</option>
              {partners.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {partners.length === 0 && meetings.length === 0 ? (
        <EmptyState
          title="No project partners yet"
          description="Hire a fellow engineer as a project partner (or get hired by one) from Find Project Partners — then you can schedule meetings with them here."
        />
      ) : meetings.length === 0 ? (
        <EmptyState title="No meetings yet" description="Pick a partner above to schedule your first meeting." />
      ) : (
        <div className="interviews-list">
          {meetings.map((m) => {
            const iAmOrganizer = String(m.organizerId?._id) === String(userId);
            const other = iAmOrganizer ? m.partnerId : m.organizerId;
            return (
              <MeetingCard
                key={m._id}
                meeting={m}
                meta={{
                  otherName: other?.name,
                  otherSub: other?.headline || '',
                  otherAvatar: other?.profileImage,
                  jobTitle: '',
                  // Peers — either side can respond to a pending invite
                  // (except the organizer responding to their own invite),
                  // reschedule, join, or cancel.
                  canRespond: !iAmOrganizer,
                  canReschedule: true,
                  canConfirmReschedule: true,
                  canCancel: true,
                  canJoin: true,
                  rescheduleFor, setRescheduleFor, proposedAt, setProposedAt,
                  rescheduleNote, setRescheduleNote, submitting,
                  onRespond: handleRespond,
                  onReschedule: handleReschedule,
                  onConfirmReschedule: handleConfirmReschedule,
                  onCancel: handleCancel,
                  respondLabels: { acceptLabel: 'Accept', declineLabel: 'Decline', acceptAction: 'accept', declineAction: 'decline' },
                }}
              />
            );
          })}
        </div>
      )}

      <ScheduleMeetingModal
        isOpen={!!scheduleFor}
        onClose={() => setScheduleFor(null)}
        onSubmit={handleSchedule}
        submitting={submitting}
        withLabel={scheduleFor?.name}
        defaultTitle="Project Sync"
        defaultDuration={30}
      />
    </div>
  );
}

export default function Interviews() {
  const { role, user } = useAuth();
  const [tab, setTab] = useState('interviews');

  return (
    <div className="interviews-page">
      <div className="dashboard-header">
        <h1>{role === 'candidate' ? 'Interviews & Meetings' : 'Interviews'}</h1>
        <p className="text-muted">
          {role === 'candidate'
            ? 'Interviews companies schedule with you, and meetings you arrange with project partners.'
            : 'Manage interviews for your job applicants.'}
        </p>
      </div>

      {role === 'candidate' && (
        <div className="interviews-tabs">
          <button
            type="button"
            className={`interviews-tab-btn ${tab === 'interviews' ? 'active' : ''}`}
            onClick={() => setTab('interviews')}
          >
            <FiVideo /> Interviews
          </button>
          <button
            type="button"
            className={`interviews-tab-btn ${tab === 'partners' ? 'active' : ''}`}
            onClick={() => setTab('partners')}
          >
            <FiPlus /> Project Partner Meetings
          </button>
        </div>
      )}

      {role === 'candidate' && tab === 'partners' ? (
        <PartnerMeetingsTab userId={user?._id} />
      ) : (
        <InterviewsTab role={role} />
      )}
    </div>
  );
}
