import { describe, expect, it } from 'vitest';
import { jaccard, listOf, rankPeers, scorePeer } from './matching.js';
import { canJoin, coverageReport, eligibleFacilitators, recommendCircles, seatsLeft } from './scheduling.js';
import { canMove, matchCounselors, moveReferral } from './referrals.js';
import { checkMessage, validateMessage } from './safety.js';
import { slotOf } from './constants.js';
import { buildSampleData } from './sampleData.js';

const NOW = new Date('2026-03-02T08:00:00'); // a Monday morning
const data = buildSampleData(NOW);
const jordan = data.users.find((u) => u.id === 'u-jordan');

describe('peer matching', () => {
  it('measures topic overlap', () => {
    expect(jaccard(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3);
    expect(jaccard([], [])).toBe(0);
  });
  it('never suggests yourself, blocked people, or people with nothing in common', () => {
    expect(scorePeer(jordan, jordan)).toBeNull();
    expect(scorePeer({ ...jordan, blocked: ['u-maya'] }, data.users.find((u) => u.id === 'u-maya'))).toBeNull();
    expect(scorePeer(jordan, data.users.find((u) => u.id === 'u-ana'))).toBeNull();
  });
  it('ranks the closest match first and explains it', () => {
    const [top] = rankPeers(jordan, data.users.filter((u) => u.role !== 'coordinator'));
    expect(['u-maya', 'u-riley', 'u-sofia']).toContain(top.peer.id);
    expect(top.reasons[0]).toMatch(/^You both chose/);
  });
  it('writes natural lists', () => {
    expect(listOf(['a'])).toBe('a');
    expect(listOf(['a', 'b'])).toBe('a and b');
    expect(listOf(['a', 'b', 'c'])).toBe('a, b and c');
  });
});

describe('circles', () => {
  it('puts circles at times you are free first', () => {
    const recs = recommendCircles(jordan, data.circles, NOW);
    expect(recs.every((r) => jordan.topics.includes(r.circle.topic))).toBe(true);
    const firstMiss = recs.findIndex((r) => !r.fitsSchedule);
    if (firstMiss >= 0) expect(recs.slice(firstMiss).every((r) => !r.fitsSchedule)).toBe(true);
  });
  it('blocks joining a full, started or already-joined circle', () => {
    const c = { id: 'x', startsAt: '2026-03-03T19:00:00', capacity: 2, members: ['a'] };
    expect(canJoin({ id: 'b' }, c, NOW).ok).toBe(true);
    expect(canJoin({ id: 'a' }, c, NOW).ok).toBe(false);
    expect(canJoin({ id: 'b' }, { ...c, members: ['a', 'c'] }, NOW).reason).toMatch(/full/);
    expect(canJoin({ id: 'b' }, c, new Date('2026-03-04')).reason).toMatch(/started/);
    expect(seatsLeft({ capacity: 2, members: ['a', 'b', 'c'] })).toBe(0);
  });
  it('only offers facilitators who are trained, free and not double-booked', () => {
    const grief = data.circles.find((c) => c.id === 'c-grief-1');
    const vols = data.users.filter((u) => u.role === 'volunteer');
    const names = eligibleFacilitators(grief, vols, data.circles).map((v) => v.id);
    for (const id of names) {
      const v = vols.find((x) => x.id === id);
      expect(v.trainedTopics).toContain('grief');
      expect(v.availability).toContain(slotOf(grief.startsAt));
    }
    const busy = { ...grief, id: 'other', facilitatorId: names[0] };
    if (names[0]) expect(eligibleFacilitators(grief, vols, [...data.circles, busy]).map((v) => v.id)).not.toContain(names[0]);
  });
  it('summarizes coverage for the week', () => {
    const r = coverageReport(data.circles, data.users.filter((u) => u.role === 'volunteer'), NOW);
    expect(r.total).toBeGreaterThan(0);
    expect(r.needsFacilitator).toBe(r.rows.filter((x) => !x.circle.facilitatorId).length);
    expect(r.fillRate).toBeGreaterThan(0);
    expect(r.fillRate).toBeLessThanOrEqual(1);
  });
});

describe('counselor referrals', () => {
  it('filters by insurance and format, and ranks by specialty fit', () => {
    const res = matchCounselors({ concerns: ['caregiving', 'stress'], insurance: 'aetna', format: 'telehealth' }, data.counselors, NOW);
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((m) => m.counselor.insurance.includes('aetna'))).toBe(true);
    expect(res[0].matched.length).toBe(2);
  });
  it('treats self-pay as no insurance filter', () => {
    expect(matchCounselors({ insurance: 'self-pay' }, data.counselors, NOW)).toHaveLength(data.counselors.length);
  });
  it('moves forward one step at a time and records who moved it', () => {
    expect(canMove('requested', 'contacted')).toBe(true);
    expect(canMove('requested', 'scheduled')).toBe(false);
    expect(canMove('contacted', 'closed')).toBe(true);
    expect(canMove('closed', 'requested')).toBe(false);
    const r = moveReferral({ status: 'requested', history: [] }, 'contacted', 'u-sam', 'Called', NOW);
    expect(r.history).toEqual([{ status: 'contacted', by: 'u-sam', note: 'Called', at: NOW.toISOString() }]);
    expect(() => moveReferral(r, 'requested', 'u-sam')).toThrow();
  });
});

describe('safety check', () => {
  it('catches common crisis phrases', () => {
    for (const t of ['I want to kill myself', "I've been thinking about suicide", 'everyone would be better off without me', "I can't go on"]) {
      expect(checkMessage(t).crisis).toBe(true);
    }
  });
  it('does not fire on everyday language', () => {
    for (const t of ['This deadline is killing me', 'How do I kill a frozen app?', 'I could die laughing', 'Going to the store']) {
      expect(checkMessage(t).crisis).toBe(false);
    }
  });
  it('validates message length', () => {
    expect(validateMessage('  ')).toBeTruthy();
    expect(validateMessage('hi')).toBeNull();
    expect(validateMessage('x'.repeat(2001))).toMatch(/2000/);
  });
});

describe('time slots', () => {
  it('maps dates to day and part of day', () => {
    expect(slotOf('2026-03-03T19:00:00')).toBe('tue-evening');
    expect(slotOf('2026-03-08T10:00:00')).toBe('sun-morning');
    expect(slotOf('2026-03-04T13:00:00')).toBe('wed-afternoon');
  });
});
