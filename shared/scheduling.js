// Support circles: recommending sessions to members, and helping coordinators staff them.
import { slotOf } from './constants.js';

export const seatsLeft = (circle) => Math.max(0, circle.capacity - (circle.members?.length ?? 0));

// Upcoming circles on the member's topics, with ones at times they're free ranked first.
export function recommendCircles(me, circles, now = new Date()) {
  return circles
    .filter((c) => new Date(c.startsAt) > now && me.topics?.includes(c.topic))
    .map((c) => ({ circle: c, fitsSchedule: me.availability?.includes(slotOf(c.startsAt)) ?? false }))
    .sort((a, b) => Number(b.fitsSchedule) - Number(a.fitsSchedule) || new Date(a.circle.startsAt) - new Date(b.circle.startsAt));
}

export function canJoin(me, circle, now = new Date()) {
  if (new Date(circle.startsAt) <= now) return { ok: false, reason: 'This circle has already started.' };
  if (circle.members?.includes(me.id)) return { ok: false, reason: 'You already have a seat.' };
  if (seatsLeft(circle) === 0) return { ok: false, reason: 'This circle is full.' };
  return { ok: true };
}

// Volunteers who could facilitate: trained on the topic, free at that time, not double-booked.
export function eligibleFacilitators(circle, volunteers, circles) {
  const slot = slotOf(circle.startsAt);
  const start = new Date(circle.startsAt).getTime();
  const end = start + circle.durationMin * 60000;
  return volunteers.filter((v) => {
    if (!v.trainedTopics?.includes(circle.topic)) return false;
    if (!v.availability?.includes(slot)) return false;
    return !circles.some((other) => {
      if (other.id === circle.id || other.facilitatorId !== v.id) return false;
      const s = new Date(other.startsAt).getTime();
      const e = s + other.durationMin * 60000;
      return s < end && start < e;
    });
  });
}

// What a coordinator needs to see for the coming days.
export function coverageReport(circles, volunteers, now = new Date(), days = 7) {
  const until = now.getTime() + days * 86400000;
  const upcoming = circles
    .filter((c) => {
      const t = new Date(c.startsAt).getTime();
      return t > now.getTime() && t <= until;
    })
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const rows = upcoming.map((c) => ({
    circle: c,
    covered: Boolean(c.facilitatorId),
    seatsFilled: c.members?.length ?? 0,
    candidates: c.facilitatorId ? [] : eligibleFacilitators(c, volunteers, circles),
  }));
  const seats = upcoming.reduce((n, c) => n + c.capacity, 0);
  const filled = upcoming.reduce((n, c) => n + (c.members?.length ?? 0), 0);
  return {
    rows,
    total: upcoming.length,
    needsFacilitator: rows.filter((r) => !r.covered).length,
    fillRate: seats ? filled / seats : 0,
  };
}
