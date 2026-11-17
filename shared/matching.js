// Peer matching: suggest people with shared experiences who are free at the same times.
import { slotLabel, topicLabel } from './constants.js';

const WEIGHTS = { topics: 0.6, availability: 0.3, format: 0.1 };

const overlap = (a = [], b = []) => {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
};

// Jaccard similarity: shared items divided by all distinct items.
export function jaccard(a = [], b = []) {
  const union = new Set([...a, ...b]).size;
  return union ? overlap(a, b).length / union : 0;
}

// Score one candidate for one member. Returns null when they should never be suggested.
export function scorePeer(me, other) {
  if (!other || other.id === me.id) return null;
  if (me.blocked?.includes(other.id) || other.blocked?.includes(me.id)) return null;
  if (other.openToMatches === false) return null;
  const sharedTopics = overlap(me.topics, other.topics);
  if (sharedTopics.length === 0) return null;
  const sharedSlots = overlap(me.availability, other.availability);
  const mine = me.availability?.length ?? 0;
  const availability = mine ? sharedSlots.length / mine : 0;
  const formatMatch = (me.formats ?? []).some((f) => (other.formats ?? []).includes(f)) ? 1 : 0;
  const score =
    WEIGHTS.topics * jaccard(me.topics, other.topics) + WEIGHTS.availability * availability + WEIGHTS.format * formatMatch;

  const reasons = [`You both chose ${listOf(sharedTopics.map(topicLabel))}`];
  if (sharedSlots.length) reasons.push(`Both free ${listOf(sharedSlots.slice(0, 2).map(slotLabel))}`);
  return { peer: other, score: Math.round(score * 100) / 100, sharedTopics, sharedSlots, reasons };
}

export function rankPeers(me, people, limit = 6) {
  return people
    .map((p) => scorePeer(me, p))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.peer.displayName.localeCompare(b.peer.displayName))
    .slice(0, limit);
}

export function listOf(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
