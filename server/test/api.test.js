// End-to-end API tests. They run against in-memory storage by default, or against a real
// MongoDB when MONGO_URL is set (as in CI), so both storage backends are checked.
import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { io as connect } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { attachRealtime } from '../src/realtime.js';
import { createMongoRepo } from '../src/mongoRepo.js';
import { DEMO_PASSWORD, sampleDataWithPasswords, seed } from '../src/seedData.js';
import { createMemoryRepo } from '../../shared/memoryRepo.js';

const SECRET = 'test-secret';
let app, repo, server, port;
const tokens = {};

const login = async (email) => {
  const res = await request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.token;
};
const as = (who) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${tokens[who]}`),
  post: (url, body = {}) => request(app).post(url).set('Authorization', `Bearer ${tokens[who]}`).send(body),
  patch: (url, body = {}) => request(app).patch(url).set('Authorization', `Bearer ${tokens[who]}`).send(body),
});

beforeAll(async () => {
  if (process.env.MONGO_URL) {
    repo = await createMongoRepo(process.env.MONGO_URL, `circle_up_test_${Date.now()}`);
    await seed(repo);
  } else {
    repo = createMemoryRepo(await sampleDataWithPasswords());
  }
  app = createApp({ repo, jwtSecret: SECRET });
  server = http.createServer(app);
  attachRealtime(server, app, { jwtSecret: SECRET });
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;
  for (const who of ['jordan', 'maya', 'sam', 'riley']) tokens[who] = await login(`${who}@example.com`);
});

afterAll(async () => {
  server?.close();
  if (repo?.drop) {
    await repo.drop();
    await repo.close();
  }
});

describe('accounts', () => {
  it('registers, rejects duplicates, and never returns the password hash', async () => {
    const body = { email: 'New.Person@example.com', password: 'longenough', displayName: 'New Person' };
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('new.person@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
    expect((await request(app).post('/api/auth/register').send(body)).status).toBe(409);
  });
  it('rejects a wrong password and requests without a token', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'jordan@example.com', password: 'nope' })).status).toBe(401);
    expect((await request(app).get('/api/me')).status).toBe(401);
  });
  it('updates only known topics and time slots', async () => {
    const res = await as('jordan').patch('/api/me', { topics: ['caregiving', 'not-a-topic'], availability: ['tue-evening', 'noon'] });
    expect(res.body.topics).toEqual(['caregiving']);
    expect(res.body.availability).toEqual(['tue-evening']);
    await as('jordan').patch('/api/me', { topics: ['caregiving', 'stress', 'career'], availability: ['tue-evening', 'wed-evening', 'thu-evening', 'sat-morning', 'sun-afternoon'] });
  });
});

describe('matching and circles', () => {
  it('suggests peers with shared topics and explains why', async () => {
    const res = await as('jordan').get('/api/matches');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].reasons[0]).toMatch(/You both chose/);
    expect(res.body.some((m) => m.peer.role === 'coordinator')).toBe(false);
    expect(res.body[0].peer.email).toBeUndefined();
  });
  it('lets a member join and leave a circle, and adds them to its chat', async () => {
    const join = await as('jordan').post('/api/circles/c-care-1/join');
    expect(join.status).toBe(200);
    expect(join.body.members).toContain('u-jordan');
    expect((await as('jordan').post('/api/circles/c-care-1/join')).status).toBe(409);
    const convs = await as('jordan').get('/api/conversations');
    expect(convs.body.some((c) => c.circleId === 'c-care-1')).toBe(true);
    const leave = await as('jordan').post('/api/circles/c-care-1/leave');
    expect(leave.body.members).not.toContain('u-jordan');
  });
});

describe('chat and safety', () => {
  it('keeps conversations private to their participants', async () => {
    expect((await as('maya').get('/api/conversations/conv-dev/messages')).status).toBe(404);
    expect((await as('jordan').get('/api/conversations/conv-maya/messages')).body.length).toBeGreaterThan(2);
  });
  it('delivers messages live to the other participant', async () => {
    const socket = connect(`http://localhost:${port}`, { auth: { token: tokens.maya }, transports: ['websocket'] });
    await new Promise((r) => socket.on('connect', r));
    const received = new Promise((r) => socket.on('message', r));
    const res = await as('jordan').post('/api/conversations/conv-maya/messages', { text: 'See you Tuesday!' });
    expect(res.body.crisis).toBe(false);
    expect((await received).text).toBe('See you Tuesday!');
    socket.close();
  });
  it('flags crisis language for a coordinator and tells the client to show resources', async () => {
    const res = await as('jordan').post('/api/conversations/conv-maya/messages', { text: "Honestly I don't want to keep going, I want to die" });
    expect(res.body.crisis).toBe(true);
    const overview = await as('sam').get('/api/coordinator/overview');
    expect(overview.body.reports.some((r) => r.messageId === res.body.message.id && r.status === 'open')).toBe(true);
  });
  it('blocks: no matches, no messages', async () => {
    const convo = await as('riley').post('/api/conversations', { peerId: 'u-jordan' });
    expect(convo.status).toBe(200);
    await as('jordan').post('/api/people/u-riley/block');
    expect((await as('riley').post('/api/conversations', { peerId: 'u-jordan' })).status).toBe(403);
    const matches = await as('jordan').get('/api/matches');
    expect(matches.body.some((m) => m.peer.id === 'u-riley')).toBe(false);
  });
});

describe('counselor referrals', () => {
  it('creates a request and stops duplicates', async () => {
    const counselors = await as('jordan').get('/api/counselors');
    const k = counselors.body.find((c) => c.id === 'k-nguyen');
    const body = { counselorId: k.id, concerns: ['caregiving'], insurance: 'aetna', preferredTimes: [k.openings[0]] };
    const res = await as('jordan').post('/api/referrals', body);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('requested');
    expect((await as('jordan').post('/api/referrals', body)).status).toBe(409);
  });
  it('lets a coordinator move a referral forward one step at a time', async () => {
    const [mine] = (await as('jordan').get('/api/referrals')).body;
    expect((await as('jordan').post(`/api/coordinator/referrals/${mine.id}/status`, { status: 'contacted' })).status).toBe(403);
    expect((await as('sam').post(`/api/coordinator/referrals/${mine.id}/status`, { status: 'scheduled' })).status).toBe(409);
    const moved = await as('sam').post(`/api/coordinator/referrals/${mine.id}/status`, { status: 'contacted', note: 'Left a voicemail' });
    expect(moved.body.status).toBe('contacted');
    expect(moved.body.history.at(-1).note).toBe('Left a voicemail');
  });
});

describe('coordinator', () => {
  it('only assigns a facilitator who is trained and free', async () => {
    // Marcus is not trained to lead grief circles.
    const bad = await as('sam').post('/api/coordinator/circles/c-grief-1/facilitator', { volunteerId: 'u-marcus' });
    expect(bad.status).toBe(409);
  });
  it('resolves reports', async () => {
    const res = await as('sam').post('/api/coordinator/reports/rep-1/resolve');
    expect(res.body.status).toBe('resolved');
  });
});
