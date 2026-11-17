import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ServiceError, createService, ownProfile } from '../../shared/service.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createApp({ repo, jwtSecret, corsOrigin = '*', now }) {
  if (!jwtSecret) throw new Error('JWT_SECRET is required.');
  const service = createService(repo, { now });
  const app = express();
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '50kb' }));

  const sign = (user) => jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' });
  const auth = (req, res, next) => {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    try {
      req.userId = jwt.verify(token, jwtSecret).sub;
      next();
    } catch {
      res.status(401).json({ error: 'Please sign in.' });
    }
  };
  // Wraps a service call so errors become clean JSON responses.
  const handle = (fn) => async (req, res) => {
    try {
      res.json(await fn(req, res));
    } catch (e) {
      if (e instanceof ServiceError) return res.status(e.status).json({ error: e.message });
      console.error(e);
      res.status(500).json({ error: 'Something went wrong on our side.' });
    }
  };

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.post(
    '/api/auth/register',
    handle(async (req, res) => {
      const email = String(req.body.email ?? '').trim().toLowerCase();
      const password = String(req.body.password ?? '');
      const displayName = String(req.body.displayName ?? '').trim();
      if (!EMAIL.test(email)) throw new ServiceError(400, 'Enter a valid email address.');
      if (password.length < 8) throw new ServiceError(400, 'Use a password of at least 8 characters.');
      if (!displayName || displayName.length > 40) throw new ServiceError(400, 'Display name must be 1 to 40 characters.');
      if ((await repo.find('users', { email })).length) throw new ServiceError(409, 'An account with that email already exists.');
      const user = {
        id: `u-${globalThis.crypto.randomUUID().slice(0, 12)}`,
        role: 'member',
        email,
        displayName,
        passwordHash: await bcrypt.hash(password, 10),
        pronouns: '',
        bio: '',
        topics: [],
        formats: [],
        availability: [],
        blocked: [],
        joinedAt: new Date().toISOString(),
      };
      await repo.insert('users', user);
      res.status(201);
      return { token: sign(user), user: ownProfile(user) };
    }),
  );

  app.post(
    '/api/auth/login',
    handle(async (req) => {
      const email = String(req.body.email ?? '').trim().toLowerCase();
      const [user] = await repo.find('users', { email });
      const ok = user?.passwordHash && (await bcrypt.compare(String(req.body.password ?? ''), user.passwordHash));
      if (!ok) throw new ServiceError(401, 'That email and password do not match.');
      return { token: sign(user), user: ownProfile(user) };
    }),
  );

  const api = express.Router();
  api.use(auth);
  api.get('/me', handle((req) => service.me(req.userId)));
  api.patch('/me', handle((req) => service.updateProfile(req.userId, req.body)));
  api.get('/people', handle((req) => service.people(req.userId)));
  api.get('/matches', handle((req) => service.matches(req.userId)));
  api.post('/people/:id/block', handle((req) => service.block(req.userId, req.params.id)));

  api.get('/circles', handle((req) => service.circles(req.userId)));
  api.post('/circles', handle((req) => service.proposeCircle(req.userId, req.body)));
  api.post('/circles/:id/join', handle((req) => service.joinCircle(req.userId, req.params.id)));
  api.post('/circles/:id/leave', handle((req) => service.leaveCircle(req.userId, req.params.id)));

  api.get('/conversations', handle((req) => service.conversations(req.userId)));
  api.post('/conversations', handle((req) => service.startDirect(req.userId, req.body.peerId)));
  api.get('/conversations/:id/messages', handle((req) => service.messages(req.userId, req.params.id)));
  api.post(
    '/conversations/:id/messages',
    handle(async (req) => {
      const result = await service.sendMessage(req.userId, req.params.id, req.body.text);
      app.emit('message', result);
      return { message: result.message, crisis: result.crisis };
    }),
  );
  api.post('/messages/:id/report', handle((req) => service.report(req.userId, req.params.id, req.body.reason)));

  api.get('/counselors', handle((req) => service.counselors(req.userId)));
  api.get('/referrals', handle((req) => service.myReferrals(req.userId)));
  api.post('/referrals', handle((req) => service.requestReferral(req.userId, req.body)));

  api.get('/coordinator/overview', handle((req) => service.overview(req.userId)));
  api.post('/coordinator/circles/:id/facilitator', handle((req) => service.assignFacilitator(req.userId, req.params.id, req.body.volunteerId)));
  api.post('/coordinator/circles/:id/review', handle((req) => service.reviewCircle(req.userId, req.params.id, req.body.decision, req.body.note)));
  api.post('/coordinator/referrals/:id/status', handle((req) => service.moveReferral(req.userId, req.params.id, req.body.status, req.body.note)));
  api.post('/coordinator/reports/:id/resolve', handle((req) => service.resolveReport(req.userId, req.params.id)));

  app.use('/api', api);
  app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  return app;
}
