import { useState } from 'react';
import Modal from './Modal';
import MeetingCalendar from './MeetingCalendar';
import Button from './Button';
import Input from './Input';
import './ScheduleMeetingModal.css';

const PLATFORMS = [
  { value: 'google-meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'teams', label: 'Microsoft Teams' },
];

/**
 * Shared "pick a date/time on a calendar and send the invite" modal.
 * Used by the company to schedule an Interview with an applicant, and by
 * a candidate to schedule a meeting with a hired project partner — both
 * flows just pass a different onSubmit and a different `withLabel`.
 */
export default function ScheduleMeetingModal({
  isOpen,
  onClose,
  onSubmit,
  submitting = false,
  withLabel,
  defaultTitle = 'Meeting',
  defaultDuration = 30,
}) {
  const [scheduledAt, setScheduledAt] = useState(null);
  const [platform, setPlatform] = useState('google-meet');
  const [meetingLink, setMeetingLink] = useState('');
  const [title, setTitle] = useState(defaultTitle);
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!scheduledAt) return;
    onSubmit({
      scheduledAt: scheduledAt.toISOString(),
      platform,
      meetingLink,
      title,
      durationMinutes: Number(durationMinutes),
      notes,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={withLabel ? `Schedule a meeting with ${withLabel}` : 'Schedule a meeting'}>
      <form onSubmit={handleSubmit} className="schedule-meeting-form">
        <MeetingCalendar value={scheduledAt} onChange={setScheduledAt} />

        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <div className="form-field">
          <label className="form-label" htmlFor="schedule-platform">Platform</label>
          <select
            id="schedule-platform"
            className="form-input"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <Input
          label="Meeting link"
          placeholder="https://meet.google.com/..."
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
        />

        <Input
          label="Duration (minutes)"
          type="number"
          min={15}
          max={240}
          step={15}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
        />

        <div className="form-field">
          <label className="form-label" htmlFor="schedule-notes">Notes (optional)</label>
          <textarea
            id="schedule-notes"
            className="form-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="schedule-meeting-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting} disabled={!scheduledAt}>Send Invite</Button>
        </div>
      </form>
    </Modal>
  );
}
