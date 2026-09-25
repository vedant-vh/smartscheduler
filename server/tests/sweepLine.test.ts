// @ts-nocheck
/**
 * tests/sweepLine.test.js
 * Unit tests for the sweep-line meeting time suggestion algorithm.
 * These are pure function tests — no DB or HTTP needed.
 */
const { suggestMeetingTimes } = require('../services/sweepLine');

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeId = (n) => ({ toString: () => String(n), equals: (o) => String(n) === o.toString() });

function makeMeeting({ duration = 60, hostTimings = [], inviteeTimings = [] } = {}) {
  const host = { _id: makeId('host'), name: 'Host', email: 'host@test.com' };
  const invitee = { _id: makeId('inv1'), name: 'Invitee', email: 'inv@test.com' };

  return {
    host,
    invitees: [invitee],
    duration,
    inviteeResponses: [
      ...(hostTimings.length ? [{ user: { _id: makeId('host') }, timings: hostTimings }] : []),
      ...(inviteeTimings.length ? [{ user: { _id: makeId('inv1') }, timings: inviteeTimings }] : []),
    ],
  };
}

const t = (dateStr) => new Date(dateStr);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('suggestMeetingTimes', () => {

  test('returns empty array when host has not submitted timings', () => {
    const meeting = makeMeeting({
      duration: 60,
      // invitee has timings but host has NOT submitted
      inviteeTimings: [{ start: t('2025-01-10T09:00:00Z'), end: t('2025-01-10T12:00:00Z') }],
    });
    const result = suggestMeetingTimes(meeting);
    expect(result).toEqual([]);
  });

  test('returns empty array when no invitee has submitted timings', () => {
    const meeting = makeMeeting({
      duration: 60,
      // Host submits but no invitees
      hostTimings: [{ start: t('2025-01-10T09:00:00Z'), end: t('2025-01-10T18:00:00Z') }],
    });
    const result = suggestMeetingTimes(meeting);
    expect(result).toEqual([]);
  });

  test('returns slots when host and invitee have overlapping windows', () => {
    const meeting = makeMeeting({
      duration: 60,
      hostTimings: [{ start: t('2025-01-10T08:00:00Z'), end: t('2025-01-10T18:00:00Z') }],
      inviteeTimings: [{ start: t('2025-01-10T09:00:00Z'), end: t('2025-01-10T12:00:00Z') }],
    });
    const result = suggestMeetingTimes(meeting);
    expect(result.length).toBeGreaterThan(0);
    // Each slot must be at least 60 min long
    result.forEach(slot => {
      const diff = new Date(slot.end) - new Date(slot.start);
      expect(diff).toBeGreaterThanOrEqual(60 * 60 * 1000);
    });
  });

  test('returns at most topN (default 3) slots', () => {
    const meeting = makeMeeting({
      duration: 30,
      hostTimings: [{ start: t('2025-01-10T06:00:00Z'), end: t('2025-01-10T22:00:00Z') }],
      inviteeTimings: [{ start: t('2025-01-10T08:00:00Z'), end: t('2025-01-10T20:00:00Z') }],
    });
    const result = suggestMeetingTimes(meeting);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  test('respects custom topN argument', () => {
    const meeting = makeMeeting({
      duration: 30,
      hostTimings: [{ start: t('2025-01-10T06:00:00Z'), end: t('2025-01-10T22:00:00Z') }],
      inviteeTimings: [{ start: t('2025-01-10T08:00:00Z'), end: t('2025-01-10T20:00:00Z') }],
    });
    const result = suggestMeetingTimes(meeting, 5);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  test('does not suggest slots shorter than meeting duration', () => {
    const meeting = makeMeeting({
      duration: 90,
      hostTimings: [{ start: t('2025-01-10T08:00:00Z'), end: t('2025-01-10T18:00:00Z') }],
      // Only 45 min invitee window — not enough
      inviteeTimings: [{ start: t('2025-01-10T09:00:00Z'), end: t('2025-01-10T09:45:00Z') }],
    });
    const result = suggestMeetingTimes(meeting);
    expect(result).toEqual([]);
  });

  test('returns slots with participant objects', () => {
    const meeting = makeMeeting({
      duration: 60,
      hostTimings: [{ start: t('2025-01-10T08:00:00Z'), end: t('2025-01-10T18:00:00Z') }],
      inviteeTimings: [{ start: t('2025-01-10T09:00:00Z'), end: t('2025-01-10T12:00:00Z') }],
    });
    const result = suggestMeetingTimes(meeting);
    expect(result.length).toBeGreaterThan(0);
    result.forEach(slot => {
      expect(Array.isArray(slot.participants)).toBe(true);
      slot.participants.forEach(p => {
        expect(p).toHaveProperty('_id');
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('email');
      });
    });
  });

  test('prefers slots with more participants', () => {
    // Two invitees; first window only one invitee, second window both
    const host = { _id: makeId('host'), name: 'Host', email: 'host@test.com' };
    const inv1 = { _id: makeId('inv1'), name: 'A', email: 'a@test.com' };
    const inv2 = { _id: makeId('inv2'), name: 'B', email: 'b@test.com' };

    const meeting = {
      host,
      invitees: [inv1, inv2],
      duration: 60,
      inviteeResponses: [
        {
          user: { _id: makeId('host') },
          timings: [{ start: t('2025-01-10T08:00:00Z'), end: t('2025-01-10T20:00:00Z') }],
        },
        {
          user: { _id: makeId('inv1') },
          timings: [{ start: t('2025-01-10T09:00:00Z'), end: t('2025-01-10T18:00:00Z') }],
        },
        {
          user: { _id: makeId('inv2') },
          timings: [{ start: t('2025-01-10T14:00:00Z'), end: t('2025-01-10T18:00:00Z') }],
        },
      ],
    };

    const result = suggestMeetingTimes(meeting, 1);
    // The single best slot should include both invitees
    expect(result[0].participants.length).toBe(3); // host + 2 invitees
  });

  test('slot start times are spaced at least 5 minutes apart (step size)', () => {
    const meeting = makeMeeting({
      duration: 60,
      hostTimings: [{ start: t('2025-01-10T08:00:00Z'), end: t('2025-01-10T18:00:00Z') }],
      inviteeTimings: [{ start: t('2025-01-10T09:00:00Z'), end: t('2025-01-10T12:00:00Z') }],
    });
    const result = suggestMeetingTimes(meeting, 3);
    if (result.length >= 2) {
      const gap = new Date(result[1].start) - new Date(result[0].start);
      expect(gap).toBeGreaterThanOrEqual(5 * 60 * 1000);
    }
  });
});

