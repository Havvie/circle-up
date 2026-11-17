// Made-up people, circles, counselors and conversations for the demo and the database seed.
// Dates are built relative to "now" so the demo always shows upcoming sessions.

const at = (base, dayOffset, hour, minute = 0) => {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
// The next given weekday after today (1 to 7 days ahead), plus whole weeks.
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const on = (base, weekday, hour, week = 0) => {
  const today = new Date(base).getDay();
  const ahead = (WEEKDAYS.indexOf(weekday) - today + 7) % 7 || 7;
  return at(base, ahead + week * 7, hour);
};
const ago = (base, minutes) => new Date(new Date(base).getTime() - minutes * 60000).toISOString();

export function buildSampleData(now = new Date()) {
  const users = [
    {
      id: 'u-jordan', role: 'member', displayName: 'Jordan', email: 'jordan@example.com', pronouns: 'they/them',
      bio: 'Caring for my mom while working full time. Looking for people who get it.',
      topics: ['caregiving', 'stress', 'career'], formats: ['one-on-one', 'group'],
      availability: ['tue-evening', 'wed-evening', 'thu-evening', 'sat-morning', 'sun-afternoon'], blocked: [], joinedAt: at(now, -40, 9),
    },
    {
      id: 'u-maya', role: 'member', displayName: 'Maya R.', email: 'maya@example.com', pronouns: 'she/her',
      bio: 'Two years into caring for my dad after his stroke. Happy to swap what has helped.',
      topics: ['caregiving', 'stress'], formats: ['one-on-one'], availability: ['tue-evening', 'thu-evening', 'sun-afternoon'], blocked: [], joinedAt: at(now, -120, 9),
    },
    {
      id: 'u-dev', role: 'member', displayName: 'Dev P.', email: 'dev@example.com', pronouns: 'he/him',
      bio: 'Left teaching for tech this year. The identity shift is real.',
      topics: ['career', 'stress', 'anxiety'], formats: ['group', 'one-on-one'], availability: ['wed-evening', 'sat-morning'], blocked: [], joinedAt: at(now, -60, 9),
    },
    {
      id: 'u-ana', role: 'member', displayName: 'Ana L.', email: 'ana@example.com', pronouns: 'she/her',
      bio: 'New mom, new city, figuring it out.',
      topics: ['parenting', 'loneliness'], formats: ['group'], availability: ['mon-morning', 'wed-morning', 'fri-morning'], blocked: [], joinedAt: at(now, -15, 9),
    },
    {
      id: 'u-chris', role: 'member', displayName: 'Chris T.', email: 'chris@example.com', pronouns: 'he/him',
      bio: 'Lost my brother last spring. Grateful for this group.',
      topics: ['grief', 'loneliness'], formats: ['group', 'one-on-one'], availability: ['mon-evening', 'thu-evening'], blocked: [], joinedAt: at(now, -200, 9),
    },
    {
      id: 'u-riley', role: 'member', displayName: 'Riley K.', email: 'riley@example.com', pronouns: 'they/them',
      bio: 'Burned out nurse trying to find balance.',
      topics: ['stress', 'anxiety', 'career'], formats: ['one-on-one'], availability: ['tue-evening', 'sat-morning', 'sun-afternoon'], blocked: [], joinedAt: at(now, -30, 9),
    },
    {
      id: 'u-sofia', role: 'member', displayName: 'Sofia M.', email: 'sofia@example.com', pronouns: 'she/her',
      bio: 'Sandwich generation: two kids and a grandmother at home.',
      topics: ['caregiving', 'parenting', 'stress'], formats: ['group'], availability: ['wed-evening', 'sat-morning'], blocked: [], joinedAt: at(now, -90, 9),
    },
    {
      id: 'u-omar', role: 'member', displayName: 'Omar H.', email: 'omar@example.com', pronouns: 'he/him',
      bio: '18 months sober. Here to give back and keep going.',
      topics: ['recovery', 'loneliness'], formats: ['group', 'one-on-one'], availability: ['mon-evening', 'fri-evening'], blocked: [], joinedAt: at(now, -300, 9),
    },
    // Trained volunteer facilitators (also members).
    {
      id: 'u-lee', role: 'volunteer', displayName: 'Lee W.', email: 'lee@example.com', pronouns: 'she/her',
      bio: 'Certified peer support specialist. Former caregiver.', topics: ['caregiving', 'grief'], formats: ['group'],
      trainedTopics: ['caregiving', 'grief', 'stress'], availability: ['tue-evening', 'thu-evening', 'sun-afternoon'], blocked: [], joinedAt: at(now, -400, 9),
    },
    {
      id: 'u-marcus', role: 'volunteer', displayName: 'Marcus J.', email: 'marcus@example.com', pronouns: 'he/him',
      bio: 'Peer facilitator. I lead the Saturday career change circle.', topics: ['career', 'stress'], formats: ['group'],
      trainedTopics: ['career', 'stress', 'anxiety'], availability: ['wed-evening', 'sat-morning'], blocked: [], joinedAt: at(now, -380, 9),
    },
    {
      id: 'u-priya', role: 'volunteer', displayName: 'Priya S.', email: 'priya@example.com', pronouns: 'she/her',
      bio: 'Mom of three, peer facilitator for new parents.', topics: ['parenting'], formats: ['group'],
      trainedTopics: ['parenting', 'loneliness', 'anxiety'], availability: ['mon-morning', 'wed-morning', 'fri-morning', 'tue-evening', 'sun-afternoon'], blocked: [], joinedAt: at(now, -250, 9),
    },
    {
      id: 'u-ben', role: 'volunteer', displayName: 'Ben A.', email: 'ben@example.com', pronouns: 'he/him',
      bio: 'In recovery 6 years. Facilitator for recovery and grief circles.', topics: ['recovery', 'grief'], formats: ['group'],
      trainedTopics: ['recovery', 'grief', 'loneliness'], availability: ['mon-evening', 'thu-evening', 'fri-evening'], blocked: [], joinedAt: at(now, -500, 9),
    },
    {
      id: 'u-sam', role: 'coordinator', displayName: 'Sam C.', email: 'sam@example.com', pronouns: 'she/her',
      bio: 'Program coordinator.', topics: [], formats: [], availability: [], blocked: [], joinedAt: at(now, -600, 9),
    },
  ];

  const circle = (id, title, topic, [weekday, week], hour, capacity, facilitatorId, members, description) => ({
    id, title, topic, startsAt: on(now, weekday, hour, week), durationMin: 60, capacity, facilitatorId, members, description,
  });
  // Circles meet on fixed weekdays, so volunteer availability lines up; hours are local time.
  const circles = [
    circle('c-care-1', 'Caregivers check-in', 'caregiving', ['tue', 0], 19, 8, 'u-lee', ['u-maya', 'u-sofia'], 'A weekly space to share what this week asked of you, and what helped.'),
    circle('c-career-1', 'Starting over: career change', 'career', ['wed', 0], 18, 10, 'u-marcus', ['u-dev', 'u-riley', 'u-jordan'], 'For anyone leaving one field for another. Bring the doubts and the wins.'),
    circle('c-parents-1', 'New parents coffee hour', 'parenting', ['wed', 0], 10, 8, 'u-priya', ['u-ana'], 'Babies welcome on camera. Sleep-deprived honesty encouraged.'),
    circle('c-grief-1', 'Grief circle', 'grief', ['thu', 0], 19, 8, null, ['u-chris'], 'Remembering the people we lost, at whatever pace is right for you.'),
    circle('c-stress-1', 'Burnout and boundaries', 'stress', ['thu', 0], 18, 10, null, ['u-riley', 'u-dev'], 'Practical ways to protect your time and energy, from people who have been there.'),
    circle('c-recovery-1', 'Recovery circle', 'recovery', ['fri', 0], 19, 10, 'u-ben', ['u-omar'], 'Peer support for any stage of recovery. All pathways welcome.'),
    circle('c-care-2', 'Caregivers weekend morning', 'caregiving', ['sat', 0], 10, 8, null, ['u-sofia'], 'A slower Saturday session for caregivers who can grab an hour.'),
    circle('c-career-2', 'Career change: networking without dread', 'career', ['sat', 0], 10, 10, 'u-marcus', ['u-dev'], 'Low-pressure practice for reaching out to people in a new field.'),
    circle('c-lonely-1', 'Making connections', 'loneliness', ['sun', 0], 14, 8, null, ['u-ana', 'u-chris', 'u-omar'], 'For anyone feeling disconnected. Start by just listening if you like.'),
    circle('c-anxiety-1', 'Anxiety: what helps', 'anxiety', ['tue', 1], 19, 10, null, ['u-riley'], 'Share tools and small wins for living with anxiety.'),
    circle('c-care-3', 'Caregivers check-in', 'caregiving', ['tue', 1], 19, 8, 'u-lee', ['u-maya'], 'A weekly space to share what this week asked of you, and what helped.'),
  ];

  const counselors = [
    {
      id: 'k-alvarez', name: 'Dr. Elena Alvarez', credentials: 'PsyD, Licensed Psychologist', specialties: ['anxiety', 'stress', 'career'],
      approach: 'Cognitive behavioral therapy, with a focus on practical tools.', insurance: ['aetna', 'bcbs', 'cigna'], languages: ['English', 'Spanish'],
      formats: ['telehealth', 'in-person'], openings: [at(now, 2, 9), at(now, 3, 15), at(now, 6, 11)],
    },
    {
      id: 'k-okafor', name: 'James Okafor', credentials: 'LCSW', specialties: ['grief', 'loneliness', 'recovery'],
      approach: 'Grief and life-transition counseling, person-centered.', insurance: ['medicaid', 'bcbs', 'united'], languages: ['English'],
      formats: ['telehealth'], openings: [at(now, 1, 17), at(now, 4, 12)],
    },
    {
      id: 'k-nguyen', name: 'Linh Nguyen', credentials: 'LMFT', specialties: ['caregiving', 'parenting', 'stress'],
      approach: 'Family systems therapy for caregivers and families in transition.', insurance: ['aetna', 'united', 'cigna'], languages: ['English', 'Vietnamese'],
      formats: ['telehealth', 'in-person'], openings: [at(now, 3, 18), at(now, 5, 10), at(now, 9, 18)],
    },
    {
      id: 'k-brooks', name: 'Tasha Brooks', credentials: 'LPC', specialties: ['anxiety', 'caregiving', 'stress'],
      approach: 'Mindfulness-based and solution-focused counseling.', insurance: ['bcbs', 'medicaid', 'aetna'], languages: ['English'],
      formats: ['telehealth'], openings: [at(now, 2, 19), at(now, 7, 19)],
    },
    {
      id: 'k-weiss', name: 'Dr. Aaron Weiss', credentials: 'PhD, Licensed Psychologist', specialties: ['recovery', 'anxiety'],
      approach: 'Evidence-based treatment for substance use and co-occurring anxiety.', insurance: ['united', 'cigna'], languages: ['English', 'Hebrew'],
      formats: ['in-person', 'telehealth'], openings: [at(now, 8, 10)],
    },
    {
      id: 'k-haddad', name: 'Nadia Haddad', credentials: 'LPC', specialties: ['parenting', 'loneliness', 'anxiety'],
      approach: 'Perinatal and postpartum mental health.', insurance: ['aetna', 'bcbs'], languages: ['English', 'Arabic', 'French'],
      formats: ['telehealth'], openings: [at(now, 1, 10), at(now, 4, 14)],
    },
  ];

  const msg = (id, conversationId, senderId, text, minutesAgo, flagged = false) => ({
    id, conversationId, senderId, text, createdAt: ago(now, minutesAgo), flagged,
  });
  const conversations = [
    { id: 'conv-maya', type: 'direct', participants: ['u-jordan', 'u-maya'], title: null },
    { id: 'conv-dev', type: 'direct', participants: ['u-jordan', 'u-dev'], title: null },
    { id: 'conv-c-career-1', type: 'circle', circleId: 'c-career-1', participants: ['u-marcus', 'u-dev', 'u-riley', 'u-jordan'], title: 'Starting over: career change' },
    { id: 'conv-riley-lee', type: 'direct', participants: ['u-riley', 'u-lee'], title: null },
  ];
  const messages = [
    msg('m1', 'conv-maya', 'u-maya', "Hi Jordan! I saw we're both caring for a parent. How are you holding up this week?", 1500),
    msg('m2', 'conv-maya', 'u-jordan', "Honestly, tired. Mom had two appointments and I had a deadline. I keep feeling guilty that I'm not doing either one well.", 1440),
    msg('m3', 'conv-maya', 'u-maya', 'That guilt is so familiar. Something that helped me was writing down the three things that actually had to happen each day, and letting the rest be "nice if".', 1420),
    msg('m4', 'conv-maya', 'u-maya', 'Also, Lee runs a caregivers check-in on Tuesdays. It made a big difference for me. Want to come?', 1419),
    msg('m5', 'conv-maya', 'u-jordan', "I think I will. Thank you, it helps just knowing someone else gets it.", 1380),
    msg('m6', 'conv-dev', 'u-dev', 'Hey! Fellow career changer here. What field are you moving into?', 3000),
    msg('m7', 'conv-dev', 'u-jordan', "Instructional design, hopefully. You?", 2950),
    msg('m8', 'conv-dev', 'u-dev', 'Data analytics. The Wednesday circle has been good for keeping me going between rejections.', 2900),
    msg('m9', 'conv-c-career-1', 'u-marcus', 'Welcome, everyone! This week let\'s each share one small win, however small.', 600),
    msg('m10', 'conv-c-career-1', 'u-riley', 'I updated my resume for the first time in 8 years. Took me all weekend but it is done.', 540),
    msg('m11', 'conv-c-career-1', 'u-dev', 'Huge! I finally reached out to someone for an informational interview.', 520),
    msg('m12', 'conv-riley-lee', 'u-riley', "Some days I feel like everyone would be better off without me.", 95, true),
  ];

  const referral = (id, memberId, counselorId, concerns, status, daysAgo, history, preferredTimes = []) => ({
    id, memberId, counselorId, concerns, status, insurance: 'bcbs', format: 'telehealth', notes: '',
    preferredTimes, createdAt: at(now, -daysAgo, 10), history,
  });
  const referrals = [
    referral('r1', 'u-chris', 'k-okafor', ['grief'], 'scheduled', 9, [
      { status: 'requested', by: 'u-chris', at: at(now, -9, 10) },
      { status: 'contacted', by: 'u-sam', at: at(now, -8, 11) },
      { status: 'scheduled', by: 'u-sam', at: at(now, -6, 15), note: 'Consult booked for next week.' },
    ]),
    referral('r2', 'u-ana', 'k-haddad', ['parenting', 'anxiety'], 'contacted', 4, [
      { status: 'requested', by: 'u-ana', at: at(now, -4, 10) },
      { status: 'contacted', by: 'u-sam', at: at(now, -3, 9) },
    ]),
    referral('r3', 'u-riley', 'k-alvarez', ['stress', 'anxiety'], 'requested', 1, [{ status: 'requested', by: 'u-riley', at: at(now, -1, 10) }]),
    referral('r4', 'u-sofia', 'k-nguyen', ['caregiving'], 'requested', 3, [{ status: 'requested', by: 'u-sofia', at: at(now, -3, 10) }]),
    referral('r5', 'u-omar', 'k-weiss', ['recovery'], 'closed', 21, [
      { status: 'requested', by: 'u-omar', at: at(now, -21, 10) },
      { status: 'contacted', by: 'u-sam', at: at(now, -20, 10) },
      { status: 'scheduled', by: 'u-sam', at: at(now, -18, 10) },
      { status: 'closed', by: 'u-sam', at: at(now, -10, 10), note: 'Now seeing Dr. Weiss weekly.' },
    ]),
  ];

  const reports = [
    { id: 'rep-1', kind: 'crisis', messageId: 'm12', conversationId: 'conv-riley-lee', reporterId: null, reason: 'Crisis language detected. Crisis resources were shown to the sender.', status: 'open', createdAt: ago(now, 95) },
    { id: 'rep-2', kind: 'member', messageId: null, conversationId: null, reporterId: 'u-ana', reason: 'Someone in a circle chat kept sending sales links.', status: 'resolved', createdAt: ago(now, 4000) },
  ];

  return { users, circles, counselors, conversations, messages, referrals, reports };
}

// Canned, supportive replies so the demo chat feels alive. Not generated, not advice.
export const DEMO_REPLIES = [
  "Thank you for sharing that. It takes something to say it out loud.",
  "That sounds like a lot to carry. What has been helping, even a little?",
  "I've been there too. Small steps still count.",
  "I'm glad you reached out. Are you coming to the next circle?",
];

export const INSURANCE = [
  { key: 'aetna', label: 'Aetna' },
  { key: 'bcbs', label: 'Blue Cross Blue Shield' },
  { key: 'cigna', label: 'Cigna' },
  { key: 'medicaid', label: 'Medicaid' },
  { key: 'united', label: 'UnitedHealthcare' },
  { key: 'self-pay', label: 'Self-pay / not sure' },
];
