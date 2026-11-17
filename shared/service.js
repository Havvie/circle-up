// The business rules of Circle Up, written once and used by both the Express server and the
// in-browser demo. Every method takes the id of the person acting, and checks what they may do.

import { ALL_SLOTS, FORMATS, REFERRAL_STATUSES, TOPICS } from './constants.js';
import { rankPeers } from './matching.js';
import { canJoin, eligibleFacilitators } from './scheduling.js';
import { moveReferral } from './referrals.js';
import { checkMessage, validateMessage } from './safety.js';

export class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new ServiceError(status, message);
};

const newId = (prefix) => `${prefix}-${globalThis.crypto.randomUUID().slice(0, 12)}`;
const TOPIC_KEYS = TOPICS.map((t) => t.key);
const FORMAT_KEYS = FORMATS.map((f) => f.key);

// What other people may see about someone.
export const publicProfile = (u) =>
  u && {
    id: u.id,
    role: u.role,
    displayName: u.displayName,
    pronouns: u.pronouns ?? '',
    bio: u.bio ?? '',
    topics: u.topics ?? [],
    formats: u.formats ?? [],
    availability: u.availability ?? [],
    trainedTopics: u.trainedTopics ?? [],
  };

// What someone may see about themselves (everything except the password hash).
export const ownProfile = (u) => {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
};

export function createService(repo, { now = () => new Date() } = {}) {
  const user = async (id) => (await repo.get('users', id)) ?? fail(401, 'Please sign in again.');
  const coordinator = async (id) => {
    const u = await user(id);
    if (u.role !== 'coordinator') fail(403, 'Only coordinators can do that.');
    return u;
  };
  const conversationFor = async (actorId, conversationId) => {
    const c = await repo.get('conversations', conversationId);
    if (!c || !c.participants.includes(actorId)) fail(404, 'Conversation not found.');
    return c;
  };

  const svc = {
    // ----- Profile -----
    async me(actorId) {
      return ownProfile(await user(actorId));
    },

    async updateProfile(actorId, patch = {}) {
      await user(actorId);
      const clean = {};
      if ('displayName' in patch) {
        const n = String(patch.displayName ?? '').trim();
        if (n.length < 1 || n.length > 40) fail(400, 'Display name must be 1 to 40 characters.');
        clean.displayName = n;
      }
      if ('pronouns' in patch) clean.pronouns = String(patch.pronouns ?? '').trim().slice(0, 30);
      if ('bio' in patch) clean.bio = String(patch.bio ?? '').trim().slice(0, 280);
      if ('topics' in patch) clean.topics = [...new Set(patch.topics ?? [])].filter((t) => TOPIC_KEYS.includes(t));
      if ('formats' in patch) clean.formats = [...new Set(patch.formats ?? [])].filter((f) => FORMAT_KEYS.includes(f));
      if ('availability' in patch) clean.availability = [...new Set(patch.availability ?? [])].filter((s) => ALL_SLOTS.includes(s));
      if ('openToMatches' in patch) clean.openToMatches = Boolean(patch.openToMatches);
      return ownProfile(await repo.update('users', actorId, clean));
    },

    async people(actorId) {
      const me = await user(actorId);
      const all = await repo.find('users');
      return all
        .filter((u) => u.id !== me.id && !me.blocked?.includes(u.id) && !u.blocked?.includes(me.id))
        .map(publicProfile);
    },

    async matches(actorId) {
      const me = await user(actorId);
      const others = (await repo.find('users')).filter((u) => u.role !== 'coordinator');
      return rankPeers(me, others).map((m) => ({ ...m, peer: publicProfile(m.peer) }));
    },

    async block(actorId, otherId) {
      const me = await user(actorId);
      if (otherId === actorId) fail(400, "You can't block yourself.");
      if (!(await repo.get('users', otherId))) fail(404, 'Person not found.');
      const blocked = [...new Set([...(me.blocked ?? []), otherId])];
      await repo.update('users', actorId, { blocked });
      return { blocked };
    },

    // ----- Circles -----
    async circles(actorId) {
      await user(actorId);
      const t = now();
      return (await repo.find('circles'))
        .filter((c) => new Date(c.startsAt).getTime() + c.durationMin * 60000 > t.getTime())
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    },

    async joinCircle(actorId, circleId) {
      const me = await user(actorId);
      const circle = (await repo.get('circles', circleId)) ?? fail(404, 'Circle not found.');
      const check = canJoin(me, circle, now());
      if (!check.ok) fail(409, check.reason);
      const updated = await repo.update('circles', circleId, { members: [...circle.members, actorId] });
      await addToCircleChat(circle, actorId);
      return updated;
    },

    async leaveCircle(actorId, circleId) {
      await user(actorId);
      const circle = (await repo.get('circles', circleId)) ?? fail(404, 'Circle not found.');
      if (!circle.members.includes(actorId)) fail(409, "You don't have a seat in this circle.");
      const updated = await repo.update('circles', circleId, { members: circle.members.filter((m) => m !== actorId) });
      const chat = (await repo.find('conversations', { circleId }))[0];
      if (chat && actorId !== circle.facilitatorId) {
        await repo.update('conversations', chat.id, { participants: chat.participants.filter((p) => p !== actorId) });
      }
      return updated;
    },

    // ----- Messages -----
    async conversations(actorId) {
      const me = await user(actorId);
      const convs = await repo.find('conversations', { participants: actorId });
      const users = Object.fromEntries((await repo.find('users')).map((u) => [u.id, u]));
      const out = [];
      for (const c of convs) {
        const msgs = (await repo.find('messages', { conversationId: c.id })).filter((m) => !me.blocked?.includes(m.senderId));
        msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const others = c.participants.filter((p) => p !== actorId).map((p) => publicProfile(users[p])).filter(Boolean);
        out.push({ ...c, others, lastMessage: msgs[msgs.length - 1] ?? null });
      }
      return out.sort((a, b) => new Date(b.lastMessage?.createdAt ?? 0) - new Date(a.lastMessage?.createdAt ?? 0));
    },

    async messages(actorId, conversationId) {
      const me = await user(actorId);
      await conversationFor(actorId, conversationId);
      return (await repo.find('messages', { conversationId }))
        .filter((m) => !me.blocked?.includes(m.senderId))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    },

    async sendMessage(actorId, conversationId, text) {
      await user(actorId);
      const conv = await conversationFor(actorId, conversationId);
      const problem = validateMessage(text);
      if (problem) fail(400, problem);
      const { crisis } = checkMessage(text);
      const message = await repo.insert('messages', {
        id: newId('m'),
        conversationId,
        senderId: actorId,
        text: String(text).trim(),
        createdAt: now().toISOString(),
        flagged: crisis,
      });
      if (crisis) {
        await repo.insert('reports', {
          id: newId('rep'),
          kind: 'crisis',
          messageId: message.id,
          conversationId,
          reporterId: null,
          reason: 'Crisis language detected. Crisis resources were shown to the sender.',
          status: 'open',
          createdAt: message.createdAt,
        });
      }
      return { message, crisis, participants: conv.participants };
    },

    async startDirect(actorId, otherId) {
      const me = await user(actorId);
      const other = (await repo.get('users', otherId)) ?? fail(404, 'Person not found.');
      if (other.id === me.id) fail(400, "You can't message yourself.");
      if (me.blocked?.includes(other.id) || other.blocked?.includes(me.id)) fail(403, "You can't message this person.");
      const existing = (await repo.find('conversations', { participants: actorId, type: 'direct' })).find((c) =>
        c.participants.includes(otherId),
      );
      if (existing) return existing;
      return repo.insert('conversations', { id: newId('conv'), type: 'direct', participants: [actorId, otherId], title: null });
    },

    async report(actorId, messageId, reason) {
      await user(actorId);
      const msg = (await repo.get('messages', messageId)) ?? fail(404, 'Message not found.');
      await conversationFor(actorId, msg.conversationId);
      const r = String(reason ?? '').trim();
      if (r.length < 3) fail(400, 'Please say briefly what is wrong.');
      return repo.insert('reports', {
        id: newId('rep'),
        kind: 'member',
        messageId,
        conversationId: msg.conversationId,
        reporterId: actorId,
        reason: r.slice(0, 500),
        status: 'open',
        createdAt: now().toISOString(),
      });
    },

    // ----- Counselor referrals -----
    async counselors(actorId) {
      await user(actorId);
      return repo.find('counselors');
    },

    async requestReferral(actorId, body = {}) {
      await user(actorId);
      const counselor = (await repo.get('counselors', body.counselorId)) ?? fail(400, 'Choose a counselor.');
      const concerns = (body.concerns ?? []).filter((c) => TOPIC_KEYS.includes(c));
      if (!concerns.length) fail(400, 'Choose at least one thing you want support with.');
      const preferredTimes = (body.preferredTimes ?? []).filter((t) => counselor.openings.includes(t));
      const open = (await repo.find('referrals', { memberId: actorId })).find((r) => r.counselorId === counselor.id && r.status !== 'closed');
      if (open) fail(409, `You already have an open request with ${counselor.name}.`);
      const createdAt = now().toISOString();
      return repo.insert('referrals', {
        id: newId('r'),
        memberId: actorId,
        counselorId: counselor.id,
        concerns,
        insurance: String(body.insurance ?? ''),
        format: String(body.format ?? ''),
        preferredTimes,
        notes: String(body.notes ?? '').trim().slice(0, 1000),
        status: 'requested',
        createdAt,
        history: [{ status: 'requested', by: actorId, at: createdAt }],
      });
    },

    async myReferrals(actorId) {
      await user(actorId);
      return (await repo.find('referrals', { memberId: actorId })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // ----- Coordinator tools -----
    async overview(actorId) {
      await coordinator(actorId);
      const [users, circles, referrals, reports, messages] = await Promise.all([
        repo.find('users'),
        svc.circles(actorId),
        repo.find('referrals'),
        repo.find('reports'),
        repo.find('messages', { flagged: true }),
      ]);
      const byId = Object.fromEntries(users.map((u) => [u.id, u]));
      const reportMessages = await Promise.all(reports.map((r) => (r.messageId ? repo.get('messages', r.messageId) : null)));
      return {
        stats: {
          members: users.filter((u) => u.role !== 'coordinator').length,
          volunteers: users.filter((u) => u.role === 'volunteer').length,
          flaggedMessages: messages.length,
        },
        volunteers: users.filter((u) => u.role === 'volunteer').map(publicProfile),
        people: Object.fromEntries(users.map((u) => [u.id, { id: u.id, displayName: u.displayName, role: u.role }])),
        circles,
        referrals: referrals.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        counselors: await repo.find('counselors'),
        reports: reports
          .map((r, i) => ({ ...r, message: reportMessages[i], sender: reportMessages[i] ? publicProfile(byId[reportMessages[i].senderId]) : null }))
          .sort((a, b) => Number(a.status !== 'open') - Number(b.status !== 'open') || new Date(b.createdAt) - new Date(a.createdAt)),
      };
    },

    async assignFacilitator(actorId, circleId, volunteerId) {
      await coordinator(actorId);
      const circle = (await repo.get('circles', circleId)) ?? fail(404, 'Circle not found.');
      const users = await repo.find('users', { role: 'volunteer' });
      const ok = eligibleFacilitators(circle, users, await repo.find('circles')).some((v) => v.id === volunteerId);
      if (!ok) fail(409, 'That volunteer is not trained for this topic, not free then, or already leading another circle.');
      const updated = await repo.update('circles', circleId, { facilitatorId: volunteerId });
      await addToCircleChat(updated, volunteerId);
      return updated;
    },

    async moveReferral(actorId, referralId, status, note = '') {
      await coordinator(actorId);
      if (!REFERRAL_STATUSES.some((s) => s.key === status)) fail(400, 'Unknown status.');
      const r = (await repo.get('referrals', referralId)) ?? fail(404, 'Referral not found.');
      let next;
      try {
        next = moveReferral(r, status, actorId, String(note).slice(0, 500), now());
      } catch (e) {
        fail(409, e.message);
      }
      return repo.update('referrals', referralId, { status: next.status, history: next.history });
    },

    async resolveReport(actorId, reportId) {
      const me = await coordinator(actorId);
      if (!(await repo.get('reports', reportId))) fail(404, 'Report not found.');
      return repo.update('reports', reportId, { status: 'resolved', resolvedBy: me.id, resolvedAt: now().toISOString() });
    },
  };

  async function addToCircleChat(circle, userId) {
    let chat = (await repo.find('conversations', { circleId: circle.id }))[0];
    if (!chat) {
      chat = await repo.insert('conversations', {
        id: `conv-${circle.id}`,
        type: 'circle',
        circleId: circle.id,
        title: circle.title,
        participants: [circle.facilitatorId, ...circle.members].filter(Boolean),
      });
    }
    if (!chat.participants.includes(userId)) {
      await repo.update('conversations', chat.id, { participants: [...chat.participants, userId] });
    }
  }

  return svc;
}
