// Shared by the React app and the Express server.

export const TOPICS = [
  { key: 'stress', label: 'Stress & burnout' },
  { key: 'anxiety', label: 'Anxiety' },
  { key: 'grief', label: 'Grief & loss' },
  { key: 'caregiving', label: 'Caregiving' },
  { key: 'parenting', label: 'New parenthood' },
  { key: 'career', label: 'Career change' },
  { key: 'loneliness', label: 'Loneliness' },
  { key: 'recovery', label: 'Recovery' },
];
export const topicLabel = (key) => TOPICS.find((t) => t.key === key)?.label ?? key;

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_NAMES = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
export const PARTS = ['morning', 'afternoon', 'evening'];
export const PART_NAMES = { morning: 'Mornings', afternoon: 'Afternoons', evening: 'Evenings' };
// An availability slot is "day-part", e.g. "tue-evening".
export const ALL_SLOTS = DAYS.flatMap((d) => PARTS.map((p) => `${d}-${p}`));
export const slotLabel = (slot) => {
  const [d, p] = slot.split('-');
  return `${DAY_NAMES[d]} ${PART_NAMES[p].toLowerCase()}`;
};

// Which slot a date falls in (local time). Morning before noon, afternoon before 5 p.m.
export function slotOf(date) {
  const d = new Date(date);
  const day = DAYS[(d.getDay() + 6) % 7];
  const h = d.getHours();
  return `${day}-${h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}`;
}

export const FORMATS = [
  { key: 'one-on-one', label: 'One-on-one chat' },
  { key: 'group', label: 'Small groups' },
];

export const REFERRAL_STATUSES = [
  { key: 'requested', label: 'Requested' },
  { key: 'contacted', label: 'Counselor contacted' },
  { key: 'scheduled', label: 'Consult scheduled' },
  { key: 'closed', label: 'Closed' },
];
export const referralStatusLabel = (key) => REFERRAL_STATUSES.find((s) => s.key === key)?.label ?? key;

export const CRISIS = {
  line: '988',
  name: '988 Suicide & Crisis Lifeline',
  call: 'tel:988',
  text: 'sms:988',
  chat: 'https://988lifeline.org/chat/',
  emergency: '911',
};
