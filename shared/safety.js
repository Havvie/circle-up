// A basic safeguard: when a message suggests someone may be in crisis, show crisis resources
// right away and put the message in front of a coordinator. Phrase matching misses things and
// will sometimes fire on harmless messages, so it supports trained people; it never replaces them.

const PATTERNS = [
  /\bkill(ing)? my ?self\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend (it all|my life)\b/i,
  /\b(want|wanted|going) to die\b/i,
  /\bno reason to live\b/i,
  /\bhurt(ing)? my ?self\b/i,
  /\bself[- ]harm/i,
  /\bcut(ting)? my ?self\b/i,
  /\bbetter off without me\b/i,
  /\bcan'?t (go on|keep going)\b/i,
  /\boverdose\b/i,
];

export function checkMessage(text = '') {
  const hits = PATTERNS.filter((p) => p.test(text));
  return { crisis: hits.length > 0 };
}

export const MAX_MESSAGE_LENGTH = 2000;

export function validateMessage(text) {
  const t = String(text ?? '').trim();
  if (!t) return 'Write a message first.';
  if (t.length > MAX_MESSAGE_LENGTH) return `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`;
  return null;
}
