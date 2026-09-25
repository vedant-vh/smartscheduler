import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { Meeting, ScheduledMeeting, IMeeting } from '../models/Meeting';
import { User, IUser } from '../models/User';
import { Notification } from '../models/Notification';
import authMiddleware from '../middleware/authMiddleware';
import validate from '../middleware/validate';
import { suggestMeetingTimes } from '../services/sweepLine';
import { createCalendarEvent, getAuthUrl, CREDENTIALS_PATH } from '../services/googleCalendar';
import logger from '../utils/logger';
import fs from 'fs';
import { getIO } from '../socket';

const router = express.Router();

// Create a meeting
// Fix #15: deadlineToRespond is now sent by the client (optional, defaults to 3 days)
router.post('/schedule-meeting',
  authMiddleware,
  validate([
    body('title').trim().notEmpty().withMessage('Meeting title is required'),
    body('friendIds').isArray({ min: 1 }).withMessage('At least one friend must be invited'),
    body('duration').isInt({ min: 5, max: 480 }).withMessage('Duration must be between 5 and 480 minutes'),
    body('meetingDate').notEmpty().withMessage('Meeting date is required'),
    body('windowStart').matches(/^\d{2}:\d{2}$/).withMessage('windowStart must be in HH:MM format'),
    body('windowEnd').matches(/^\d{2}:\d{2}$/).withMessage('windowEnd must be in HH:MM format'),
    body('deadlineDays')
      .optional()
      .isInt({ min: 1, max: 14 })
      .withMessage('deadlineDays must be between 1 and 14'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { friendIds, duration, title, meetingDate, windowStart, windowEnd, deadlineDays } = req.body;
      // Fix #15: Use client-supplied deadline (days) or default to 3 days
      const deadlineMs = (deadlineDays || 3) * 24 * 60 * 60 * 1000;

      const meeting = new Meeting({
        title,
        description: '',
        host: req.user!.id,
        invitees: friendIds,
        duration,
        meetingDate,
        windowStart,
        windowEnd,
        deadlineToRespond: new Date(Date.now() + deadlineMs),
        inviteeResponses: [],
        status: 'pending',
      });
      await meeting.save();

      for (const inviteeId of friendIds) {
        await Notification.create({
          user: inviteeId,
          type: 'meeting_invite',
          message: `${req.user!.name} invited you to a meeting: ${meeting.title}`,
          data: { meetingId: meeting._id, hostId: req.user!.id, hostName: req.user!.name },
        });
      }
      res.json({ message: 'Meeting scheduled', meeting });
    } catch (err: any) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// Get all meetings for current user (as host or invitee)
router.get('/meetings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const meetings = await Meeting.find({ $or: [{ host: userId }, { invitees: userId }] })
      .populate('host', 'name email')
      .populate('invitees', 'name email')
      .populate({ path: 'inviteeResponses', populate: { path: 'user', select: 'name email' } })
      .lean();

    const finalMeetings = await Promise.all(
      meetings.map(async (meeting: any) => {
        if (Array.isArray(meeting.inviteeResponses)) {
          for (const resp of meeting.inviteeResponses) {
            if (resp.user && typeof resp.user === 'string') {
              const userObj = await User.findById(resp.user).select('name email _id').lean();
              if (userObj) resp.user = userObj;
            }
          }
        }
        // Only count invitees (not the host) in submittedCount
        const hostIdStr = meeting.host._id ? meeting.host._id.toString() : meeting.host.toString();
        const usersWhoResponded = new Set(
          (meeting.inviteeResponses || [])
            .filter((r: any) => {
              if (!r.user || !r.timings || r.timings.length === 0) return false;
              const rUserId = r.user._id ? r.user._id.toString() : r.user.toString();
              return rUserId !== hostIdStr; // exclude host's own availability
            })
            .map((r: any) => (r.user._id ? r.user._id.toString() : r.user.toString()))
        );
        meeting.submittedCount = usersWhoResponded.size;
        if (meeting.finalizedSlot?.confirmedParticipants?.length > 0) {
          meeting.finalizedSlot.confirmedParticipants = await User.find({
            _id: { $in: meeting.finalizedSlot.confirmedParticipants }
          }).select('name email _id').lean();
        }
        return meeting;
      })
    );

    res.json(finalMeetings);
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/meetings');
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Invitee submits a single timing slot
router.post('/meetings/:id/respond', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { start, end } = req.body;
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const isInvitee = meeting.invitees.map((id: any) => id.toString()).includes(req.user!.id.toString());
    if (!isInvitee) return res.status(403).json({ message: 'Not invited' });

    const durationMs = meeting.duration * 60 * 1000;
    if (new Date(end).getTime() - new Date(start).getTime() < durationMs) {
      return res.status(400).json({ message: 'Timing must be at least the meeting duration' });
    }

    let response = meeting.inviteeResponses.find((r: any) => r.user.toString() === req.user!.id.toString());
    if (!response) {
      response = { user: req.user!.id as any, timings: [] };
      meeting.inviteeResponses.push(response);
    }
    response.timings.push({ start: new Date(start), end: new Date(end) });
    await meeting.save();

    const allSubmitted = meeting.invitees.every((inviteeId: any) => {
      const resp = meeting.inviteeResponses.find((r: any) => r.user.toString() === inviteeId.toString());
      return resp && resp.timings && resp.timings.length > 0;
    });
    if (allSubmitted) {
      meeting.status = 'awaiting_selection';
      await meeting.save();
    }

    res.json({ message: 'Timing submitted' });
  } catch (err: any) {
    logger.error({ err }, 'Error in /meetings/:id/respond');
    res.status(500).json({ message: 'Server error' });
  }
});

// Invitee submits (replaces) all timings at once
router.post('/meetings/:id/submit-timings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { timings } = req.body;
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const isHost = meeting.host.toString() === req.user!.id;
    const isInvitee = meeting.invitees.map((id: any) => id.toString()).includes(req.user!.id);
    if (!isHost && !isInvitee) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    const durationMs = meeting.duration * 60 * 1000;
    for (const timing of timings) {
      const s = new Date(timing.start), e = new Date(timing.end);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return res.status(400).json({ message: 'Invalid date format in timings' });
      if (e.getTime() - s.getTime() < durationMs) return res.status(400).json({ message: `Timing must be at least ${meeting.duration} minutes` });
    }

    let response = meeting.inviteeResponses.find((r: any) => r.user.toString() === req.user!.id.toString());
    if (!response) {
      meeting.inviteeResponses.push({ user: req.user!.id as any, timings: [] });
      // Re-fetch from the array: Mongoose wraps push() into a new subdocument internally,
      // so the original plain-object reference would NOT reflect changes on save.
      response = meeting.inviteeResponses[meeting.inviteeResponses.length - 1];
    }
    response.timings = timings.map((t: any) => ({ start: new Date(t.start), end: new Date(t.end) }));
    await meeting.save();

    const allSubmitted = meeting.invitees.every((inviteeId: any) => {
      const resp = meeting.inviteeResponses.find((r: any) => r.user.toString() === inviteeId.toString());
      return resp && resp.timings && resp.timings.length > 0;
    });
    if (allSubmitted) {
      meeting.status = 'awaiting_selection';
      await meeting.save();
    }

    // Notify all participants in this meeting room that timings were updated
    try {
      getIO().to(`meeting:${String(meeting._id)}`).emit('meeting:updated', {
        meetingId: String(meeting._id),
        updatedBy: req.user!.id,
      });
    } catch (socketErr) {
      logger.warn({ socketErr }, 'Socket emit failed (non-fatal)');
    }

    res.json({ message: 'Timings submitted successfully' });
  } catch (err: any) {
    logger.error({ err }, 'Error in /meetings/:id/submit-timings');
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Clear current user's timings for a meeting
router.post('/meetings/:id/clear-timings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (!meeting.invitees.map((id: any) => id.toString()).includes(req.user!.id)) {
      return res.status(403).json({ message: 'Not invited' });
    }
    const response = meeting.inviteeResponses.find((r: any) => r.user.toString() === req.user!.id);
    if (response) {
      response.timings = [];
      await meeting.save();
      return res.json({ message: 'Timings cleared' });
    }
    return res.json({ message: 'No timings to clear' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Host views detailed responses for a meeting
router.get('/meetings/:id/responses', authMiddleware, async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email')
      .populate('invitees', 'name email')
      .populate({ path: 'inviteeResponses.user', select: 'name email' })
      .lean();

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if ((meeting.host as any)._id.toString() !== req.user!.id) {
      return res.status(403).json({ message: 'Only host can view responses' });
    }
    res.json(meeting);
  } catch (err) {
    logger.error({ err }, 'Error in /meetings/:id/responses');
    res.status(500).json({ message: 'Server error' });
  }
});

// Count of pending unanswered meeting invites (for notification badge)
router.get('/meetings/notifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const meetings = await Meeting.find({
      invitees: userId,
      status: { $in: ['pending', 'awaiting_selection'] }
    });
    let count = 0;
    meetings.forEach(m => {
      const resp = m.inviteeResponses.find(r => r.user.toString() === userId);
      if (!resp || resp.timings.length === 0) count++;
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Suggest top 3 meeting times using the sweep-line algorithm
router.get('/meetings/:id/suggest-times', authMiddleware, async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email _id')
      .populate('invitees', 'name email _id')
      .populate('inviteeResponses.user', 'name email _id');
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const result = suggestMeetingTimes(meeting);

    // #21: empty result means the host hasn't submitted their availability yet
    if (result.length === 0) {
      const hostIdStr = (meeting.host as any)._id.toString();
      const hostHasSubmitted = meeting.inviteeResponses.some((r: any) => {
        // r.user may be a populated object or a raw ObjectId
        const rUserId = r.user?._id ? r.user._id.toString() : r.user?.toString();
        return rUserId === hostIdStr && r.timings && r.timings.length > 0;
      });
      if (!hostHasSubmitted) {
        return res.status(400).json({
          message: 'Host must submit their availability before time suggestions can be generated.',
          code: 'HOST_AVAILABILITY_MISSING',
        });
      }
      return res.status(400).json({
        message: 'No overlapping time slots found. Ask invitees to submit more availability windows.',
        code: 'NO_SLOTS_FOUND',
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Schedule a Google Meet for a chosen slot
router.post('/meetings/:id/schedule-gmeet', authMiddleware, async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate('host').populate('invitees');
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if ((meeting.host as any)._id.toString() !== req.user!.id) {
      return res.status(403).json({ message: 'Only host can schedule' });
    }

    const { start, end, participants } = req.body;
    if (!start || !end || !participants || participants.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!fs.existsSync(CREDENTIALS_PATH)) {
      return res.status(500).json({ message: 'Google Calendar integration not configured.' });
    }

    // Resolve participant IDs
    const confirmedParticipants = [];
    for (const p of participants) {
      if (p._id) {
        confirmedParticipants.push(p._id);
      } else {
        const found = await User.findOne({ email: p.email });
        if (found) confirmedParticipants.push(found._id);
      }
    }

    const { meetLink, eventData } = await createCalendarEvent({
      title: meeting.title,
      description: meeting.description,
      start,
      end,
      attendees: participants,
    });

    // Save snapshot to ScheduledMeeting
    const scheduled = new ScheduledMeeting({
      meetingId: meeting._id,
      title: meeting.title,
      host: (meeting.host as any)._id,
      invitees: meeting.invitees.map((i: any) => i._id),
      start: new Date(start),
      end: new Date(end),
      meetLink: meetLink as string,
    });
    await scheduled.save();

    // Update the original meeting
    meeting.meetLink = meetLink as string;
    meeting.finalizedSlot = { start: new Date(start), end: new Date(end), confirmedParticipants: confirmedParticipants as any };
    meeting.status = 'finalized';
    await meeting.save();

    // Notify all invitees (DB notifications)
    for (const invitee of meeting.invitees) {
      if ((invitee as any)._id.toString() !== (meeting.host as any)._id.toString()) {
        await Notification.create({
          user: (invitee as any)._id,
          type: 'meeting_scheduled',
          message: `Meeting scheduled: ${meeting.title}. Join link: ${meetLink}`,
          data: { meetingId: meeting._id, meetLink },
        });
      }
    }

    // Real-time: broadcast finalization to everyone in this meeting room
    try {
      getIO().to(`meeting:${String(meeting._id)}`).emit('meeting:finalized', {
        meetingId: String(meeting._id),
        meetLink,
        start,
        end,
      });
    } catch (socketErr) {
      logger.warn({ socketErr }, 'Socket emit failed (non-fatal)');
    }

    res.json({ meetLink, event: eventData, scheduled });
  } catch (err: any) {
    logger.error({ err }, 'Error in /meetings/:id/schedule-gmeet');

    if (err.code === 401 || err.code === 400) {
      try {
        const authUrl = getAuthUrl();
        return res.status(401).json({
          message: 'Google authorization required. Please authorize the application.',
          authUrl,
          error: err.message,
        });
      } catch (authError: any) {
        logger.error({ err: authError }, 'Error generating auth URL');
        return res.status(500).json({ message: 'Google Calendar integration error.', error: authError.message });
      }
    }

    if (err.message?.includes('credentials file not found')) {
      return res.status(500).json({
        message: 'Google Calendar integration not configured. See GOOGLE_CALENDAR_SETUP.md',
        error: err.message,
      });
    }

    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
