const cron = require('node-cron');
const Interview = require('../models/Interview');
const PartnerMeeting = require('../models/PartnerMeeting');
const { notify } = require('../services/notificationHelper');

// Reminder fires once a meeting is within this window of starting.
const REMINDER_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Notifies both sides of every confirmed Interview that starts within the
 * next 30 minutes and hasn't already been reminded (reminderSentAt is
 * cleared whenever a meeting is rescheduled — see interviewController /
 * partnerMeetingController).
 */
async function sendInterviewReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const dueInterviews = await Interview.find({
    status: 'accepted',
    scheduledAt: { $gte: now, $lte: windowEnd },
    reminderSentAt: null,
  })
    .populate('jobId', 'title')
    .lean();

  for (const interview of dueInterviews) {
    const when = new Date(interview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const jobTitle = interview.jobId?.title || 'your job';

    // eslint-disable-next-line no-await-in-loop
    await Promise.all([
      notify({
        userId: interview.candidateId,
        role: 'candidate',
        title: 'Interview starting soon',
        message: `Your interview for "${jobTitle}" starts at ${when}.`,
        type: 'interview',
        link: '/candidate/dashboard/interviews',
      }),
      notify({
        userId: interview.companyId,
        role: 'company',
        title: 'Interview starting soon',
        message: `Your interview for "${jobTitle}" starts at ${when}.`,
        type: 'interview',
        link: '/company/dashboard/interviews',
      }),
    ]);

    // eslint-disable-next-line no-await-in-loop
    await Interview.updateOne({ _id: interview._id }, { reminderSentAt: now });
  }
}

/**
 * Same reminder pass for candidate <-> project-partner meetings.
 */
async function sendPartnerMeetingReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const dueMeetings = await PartnerMeeting.find({
    status: 'accepted',
    scheduledAt: { $gte: now, $lte: windowEnd },
    reminderSentAt: null,
  }).lean();

  for (const meeting of dueMeetings) {
    const when = new Date(meeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // eslint-disable-next-line no-await-in-loop
    await Promise.all([
      notify({
        userId: meeting.organizerId,
        role: 'candidate',
        title: 'Meeting starting soon',
        message: `"${meeting.title || 'Project Sync'}" starts at ${when}.`,
        type: 'interview',
        link: '/candidate/dashboard/interviews',
      }),
      notify({
        userId: meeting.partnerId,
        role: 'candidate',
        title: 'Meeting starting soon',
        message: `"${meeting.title || 'Project Sync'}" starts at ${when}.`,
        type: 'interview',
        link: '/candidate/dashboard/interviews',
      }),
    ]);

    // eslint-disable-next-line no-await-in-loop
    await PartnerMeeting.updateOne({ _id: meeting._id }, { reminderSentAt: now });
  }
}

async function runReminderPass() {
  await sendInterviewReminders();
  await sendPartnerMeetingReminders();
}

/**
 * Starts the meeting-reminder job: runs immediately on boot (so a server
 * restart doesn't cause a reminder to be missed), then every 5 minutes.
 * A 5-minute cadence against a 30-minute window guarantees every accepted
 * meeting is caught at least once, without spamming.
 */
function startMeetingReminderJob() {
  runReminderPass().catch((err) => console.error('[MeetingReminderJob] initial run failed:', err));

  cron.schedule('*/5 * * * *', () => {
    runReminderPass().catch((err) => console.error('[MeetingReminderJob] scheduled run failed:', err));
  });
}

module.exports = { startMeetingReminderJob, runReminderPass };
