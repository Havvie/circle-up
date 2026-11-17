// Counselor referrals: matching a member's request to a directory, and tracking the handoff.
import { REFERRAL_STATUSES } from './constants.js';

// Each filter is optional. Counselors who meet every hard requirement are returned,
// best match on specialties first, then soonest opening.
export function matchCounselors(request, counselors, now = new Date()) {
  const wants = request.concerns ?? [];
  return counselors
    .filter((c) => !request.insurance || request.insurance === 'self-pay' || c.insurance.includes(request.insurance))
    .filter((c) => !request.language || c.languages.includes(request.language))
    .filter((c) => !request.format || request.format === 'either' || c.formats.includes(request.format))
    .map((c) => {
      const matched = wants.filter((w) => c.specialties.includes(w));
      const openings = (c.openings ?? []).filter((o) => new Date(o) > now).sort((a, b) => new Date(a) - new Date(b));
      return { counselor: c, matched, nextOpening: openings[0] ?? null, openings };
    })
    .filter((m) => wants.length === 0 || m.matched.length > 0)
    .sort(
      (a, b) =>
        b.matched.length - a.matched.length ||
        (a.nextOpening ? new Date(a.nextOpening).getTime() : Infinity) - (b.nextOpening ? new Date(b.nextOpening).getTime() : Infinity),
    );
}

const ORDER = REFERRAL_STATUSES.map((s) => s.key);

// Referrals move forward one step at a time, and can be closed from any open step.
export function canMove(from, to) {
  if (from === to || from === 'closed') return false;
  if (to === 'closed') return true;
  return ORDER.indexOf(to) === ORDER.indexOf(from) + 1;
}

export function moveReferral(referral, to, by, note = '', at = new Date()) {
  if (!canMove(referral.status, to)) throw new Error(`A referral can't go from "${referral.status}" to "${to}".`);
  return {
    ...referral,
    status: to,
    history: [...(referral.history ?? []), { status: to, by, note, at: new Date(at).toISOString() }],
  };
}

// Days from request to the current step, for the coordinator's pipeline.
export const daysOpen = (referral, now = new Date()) =>
  Math.floor((now - new Date(referral.createdAt)) / 86400000);
