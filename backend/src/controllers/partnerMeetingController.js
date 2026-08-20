const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const PartnerMeeting = require('../models/PartnerMeeting');
const Candidate = require('../models/Candidate');
const ContactUnlock = require('../models/ContactUnlock');
const { HIRER_TYPE, UNLOCK_STATUS } = require('../constants/status');
const { notify } = require('../services/notificationHelper');

/**
 * Project Partner meetings — a candidate-to-candidate calendar flow that
 * mirrors the Interview module (Google Meet / Zoom / Teams link, same
 * accept/decline/reschedule lifecycle), but scoped to two Candidates who
 * already have an active Project Partner relationship instead of a
 * Company scheduling for an applicant. Either partner may propose the
 * meeting, since neither side is the "hiring authority" the way a
 * Company is for an interview.
 */

/**
 * Confirms an active project-partner relationship exists between the two
 * candidates, in either hiring direction.
 */
const assertArePartners = async (candidateAId, candidateBId) => {
  const relation = await ContactUnlock.findOne({
    hirerType: HIRER_TYPE.CANDIDATE,
    status: UNLOCK_STATUS.ACTIVE,
    $or: [
      { hiringCandidateId: candidateAId, candidateId: candidateBId },
      { hiringCandidateId: candidateBId, candidateId: candidateAId },
    ],
  }).lean();
  if (!relation) {
    throw ApiError.forbidden('You can only schedule meetings with a hired project partner');
  }
};

/**
 * POST /api/v1/partner-meetings
 * A candidate proposes a meeting with a fellow candidate they are (or are
 * hired by as) a project partner with.
 * Body: { partnerId, platform, meetingLink, scheduledAt, durationMinutes, title, notes }
 */
const createPartnerMeeting = asyncHandler(async (req, res) => {
  const {
    partnerId, platform = 'google-meet', meetingLink = '',
    scheduledAt, durationMinutes = 30, title = 'Project Sync', notes = '',
  } = req.body;

  if (!scheduledAt) throw ApiError.badRequest('scheduledAt is required');
  if (!partnerId) throw ApiError.badRequest('partnerId is required');
  if (partnerId === String(req.user._id)) throw ApiError.badRequest('You cannot schedule a meeting with yourself');

  const partner = await Candidate.findById(partnerId).select('name email').lean();
  if (!partner) throw ApiError.notFound('Project partner not found');

  await assertArePartners(req.user._id, partnerId);

  const meeting = await PartnerMeeting.create({
    organizerId: req.user._id,
    partnerId,
    platform,
    meetingLink,
    title,
    scheduledAt,
    durationMinutes,
    notes,
  });

  await notify({
    userId: partnerId,
    role: 'candidate',
    title: 'New meeting request',
    message: `${req.user.name || 'A project partner'} proposed a meeting for ${new Date(scheduledAt).toLocaleString()}.`,
    type: 'interview',
    link: '/candidate/dashboard/interviews',
  });

  return new ApiResponse(201, { meeting }, 'Meeting proposed').send(res);
});

/**
 * GET /api/v1/partner-meetings/me
 * Every partner meeting this candidate organized or was invited to.
 */
const getMyPartnerMeetings = asyncHandler(async (req, res) => {
  const meetings = await PartnerMeeting.find({
    $or: [{ organizerId: req.user._id }, { partnerId: req.user._id }],
  })
    .populate('organizerId', 'name email profileImage headline')
    .populate('partnerId', 'name email profileImage headline')
    .sort({ scheduledAt: 1 });

  return new ApiResponse(200, { meetings }, 'Partner meetings fetched').send(res);
});

/**
 * PATCH /api/v1/partner-meetings/:id/respond
 * The invited partner accepts/declines. Body: { action: 'accept'|'decline' }
 */
const respondToPartnerMeeting = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['accept', 'decline'].includes(action)) {
    throw ApiError.badRequest('action must be accept or decline');
  }

  const meeting = await PartnerMeeting.findOne({ _id: req.params.id, partnerId: req.user._id });
  if (!meeting) throw ApiError.notFound('Meeting not found');

  meeting.status = action === 'accept' ? 'accepted' : 'declined';
  await meeting.save();

  await notify({
    userId: meeting.organizerId,
    role: 'candidate',
    title: `Meeting ${action === 'accept' ? 'accepted' : 'declined'}`,
    message: `${req.user.name || 'Your project partner'} ${action === 'accept' ? 'accepted' : 'declined'} your meeting request.`,
    type: 'interview',
    link: '/candidate/dashboard/interviews',
  });

  return new ApiResponse(200, { meeting }, `Meeting ${action}d`).send(res);
});

/**
 * PATCH /api/v1/partner-meetings/:id/reschedule
 * Either side can propose a new time — whoever didn't organize the current
 * slot. Body: { proposedAt, note }
 */
const requestReschedulePartnerMeeting = asyncHandler(async (req, res) => {
  const { proposedAt, note = '' } = req.body;
  if (!proposedAt) throw ApiError.badRequest('proposedAt is required');

  const meeting = await PartnerMeeting.findOne({
    _id: req.params.id,
    $or: [{ organizerId: req.user._id }, { partnerId: req.user._id }],
  });
  if (!meeting) throw ApiError.notFound('Meeting not found');

  meeting.status = 'rescheduled';
  meeting.rescheduleRequest = { proposedAt, note };
  await meeting.save();

  const otherPartyId = String(meeting.organizerId) === String(req.user._id) ? meeting.partnerId : meeting.organizerId;

  await notify({
    userId: otherPartyId,
    role: 'candidate',
    title: 'Meeting reschedule requested',
    message: `${req.user.name || 'Your project partner'} requested to reschedule to ${new Date(proposedAt).toLocaleString()}.`,
    type: 'interview',
    link: '/candidate/dashboard/interviews',
  });

  return new ApiResponse(200, { meeting }, 'Reschedule requested').send(res);
});

/**
 * PATCH /api/v1/partner-meetings/:id/reschedule/confirm
 * Confirms a proposed new time. Body: { scheduledAt }
 */
const confirmReschedulePartnerMeeting = asyncHandler(async (req, res) => {
  const { scheduledAt } = req.body;
  if (!scheduledAt) throw ApiError.badRequest('scheduledAt is required');

  const meeting = await PartnerMeeting.findOne({
    _id: req.params.id,
    $or: [{ organizerId: req.user._id }, { partnerId: req.user._id }],
  });
  if (!meeting) throw ApiError.notFound('Meeting not found');

  meeting.scheduledAt = scheduledAt;
  meeting.status = 'accepted';
  meeting.rescheduleRequest = { proposedAt: null, note: '' };
  meeting.reminderSentAt = null;
  await meeting.save();

  const otherPartyId = String(meeting.organizerId) === String(req.user._id) ? meeting.partnerId : meeting.organizerId;

  await notify({
    userId: otherPartyId,
    role: 'candidate',
    title: 'Meeting rescheduled',
    message: `Your meeting is now confirmed for ${new Date(scheduledAt).toLocaleString()}.`,
    type: 'interview',
    link: '/candidate/dashboard/interviews',
  });

  return new ApiResponse(200, { meeting }, 'Reschedule confirmed').send(res);
});

/**
 * PATCH /api/v1/partner-meetings/:id/cancel
 * Either side can cancel.
 */
const cancelPartnerMeeting = asyncHandler(async (req, res) => {
  const meeting = await PartnerMeeting.findOne({
    _id: req.params.id,
    $or: [{ organizerId: req.user._id }, { partnerId: req.user._id }],
  });
  if (!meeting) throw ApiError.notFound('Meeting not found');

  meeting.status = 'cancelled';
  await meeting.save();

  const otherPartyId = String(meeting.organizerId) === String(req.user._id) ? meeting.partnerId : meeting.organizerId;

  await notify({
    userId: otherPartyId,
    role: 'candidate',
    title: 'Meeting cancelled',
    message: `${req.user.name || 'Your project partner'} cancelled the scheduled meeting.`,
    type: 'interview',
    link: '/candidate/dashboard/interviews',
  });

  return new ApiResponse(200, { meeting }, 'Meeting cancelled').send(res);
});

module.exports = {
  createPartnerMeeting,
  getMyPartnerMeetings,
  respondToPartnerMeeting,
  requestReschedulePartnerMeeting,
  confirmReschedulePartnerMeeting,
  cancelPartnerMeeting,
};
