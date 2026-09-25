import { IMeeting } from '../models/Meeting';
import { IUser } from '../models/User';
import mongoose from 'mongoose';

// Types for the service
interface IParticipantObj {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  timings: { start: Date; end: Date }[];
}

export interface ISuggestedSlot {
  start: Date;
  end: Date;
  participants: { _id: mongoose.Types.ObjectId; name: string; email: string }[];
}

/**
 * sweepLine.ts
 * Pure function service for finding optimal meeting time slots.
 *
 * Given a populated Meeting document, returns the top N candidate slots
 * where the host and at least one invitee overlap for the required duration.
 *
 * @param meeting - Populated Mongoose Meeting document
 * @param topN - Maximum number of slots to return (default: 3)
 */
export function suggestMeetingTimes(meeting: any, topN: number = 3): ISuggestedSlot[] {
  const hostIdStr = meeting.host._id.toString();

  // Build participant list: host + invitees
  const allParticipants: IParticipantObj[] = [
    { _id: meeting.host._id, name: meeting.host.name, email: meeting.host.email, timings: [] },
    ...meeting.invitees.map((i: any) => ({ _id: i._id, name: i.name, email: i.email, timings: [] }))
  ];

  // Fill in submitted timings for each participant
  // r.user may be a populated object { _id, name, email } or a raw ObjectId/string,
  // depending on whether .populate() was called on this query.
  allParticipants.forEach(p => {
    const resp = meeting.inviteeResponses.find((r: any) => {
      const rUserId = r.user?._id ? r.user._id.toString() : r.user?.toString();
      return rUserId === p._id.toString();
    });
    if (resp) p.timings = resp.timings;
  });

  // #21: Host must submit their own availability — return empty if they haven't
  const hostParticipant = allParticipants.find(p => p._id.toString() === hostIdStr);
  if (!hostParticipant || !hostParticipant.timings || hostParticipant.timings.length === 0) {
    return []; // Signal to the client that the host needs to submit timings first
  }

  // Build sweep-line events: { time, type: 'start'|'end', userId }
  const events: { time: Date; type: 'start' | 'end'; userId: string }[] = [];
  allParticipants.forEach(p => {
    p.timings.forEach(t => {
      events.push({ time: new Date(t.start), type: 'start', userId: p._id.toString() });
      events.push({ time: new Date(t.end),   type: 'end',   userId: p._id.toString() });
    });
  });
  events.sort((a, b) => a.time.getTime() - b.time.getTime() || (a.type === 'start' ? -1 : 1));

  // Sweep to find intervals where host + >= 1 invitee overlap for >= duration
  const durationMs = meeting.duration * 60 * 1000;
  const active = new Set<string>();
  const intervals: { start: Date; end: Date; participants: string[] }[] = [];

  for (let i = 0; i < events.length - 1; ++i) {
    const e = events[i];
    if (e.type === 'start') active.add(e.userId);
    else active.delete(e.userId);

    const currTime = e.time;
    const nextTime = events[i + 1].time;

    if (
      nextTime.getTime() - currTime.getTime() >= durationMs &&
      active.has(hostIdStr) &&
      active.size >= 2
    ) {
      intervals.push({
        start: new Date(currTime),
        end: new Date(nextTime),
        participants: Array.from(active)
      });
    }
  }

  // Expand each interval into fixed-duration candidate slots (5-min step)
  const candidateSlots: { start: Date; end: Date; participants: string[]; participantObjs?: IParticipantObj[] }[] = [];
  intervals.forEach(intv => {
    let slotStart = new Date(intv.start);
    while (slotStart.getTime() + durationMs <= intv.end.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + durationMs);
      candidateSlots.push({
        start: new Date(slotStart),
        end: slotEnd,
        participants: intv.participants
      });
      slotStart = new Date(slotStart.getTime() + 5 * 60 * 1000);
    }
  });

  // Enrich each slot with participant objects and sort by most participants first
  candidateSlots.forEach(slot => {
    slot.participantObjs = allParticipants.filter(p => slot.participants.includes(p._id.toString()));
  });
  candidateSlots.sort((a, b) => b.participants.length - a.participants.length || a.start.getTime() - b.start.getTime());

  // Pick top N slots, preferring highest participation count
  const topSlots: typeof candidateSlots = [];
  const maxCount = candidateSlots.length > 0 ? candidateSlots[0].participants.length : 0;

  for (const slot of candidateSlots) {
    if (slot.participants.length < maxCount && topSlots.length > 0) break;
    topSlots.push(slot);
    if (topSlots.length >= topN) break;
  }

  // If still under topN, fill with next-best participation counts
  if (topSlots.length < topN) {
    let nextCount = maxCount - 1;
    while (topSlots.length < topN && nextCount >= 2) {
      for (const s of candidateSlots.filter(s => s.participants.length === nextCount)) {
        topSlots.push(s);
        if (topSlots.length >= topN) break;
      }
      nextCount--;
    }
  }

  // Return clean output
  return topSlots.map(slot => ({
    start: slot.start,
    end: slot.end,
    participants: slot.participantObjs!.map(p => ({ _id: p._id, name: p.name, email: p.email }))
  }));
}
