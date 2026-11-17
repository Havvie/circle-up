// The live demo runs the real business logic (shared/service.js) in the browser, on sample data
// saved in localStorage. No server, no accounts, nothing leaves the browser.
import { createService } from '../../shared/service.js';
import { createMemoryRepo } from '../../shared/memoryRepo.js';
import { DEMO_REPLIES, buildSampleData } from '../../shared/sampleData.js';

const DATA_KEY = 'circle-up:demo-data:v2';
const USER_KEY = 'circle-up:demo-user';

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // Private browsing or full storage: the demo still works until the page reloads.
  }
};

function freshRepo() {
  const saved = read(DATA_KEY);
  return createMemoryRepo(saved ?? buildSampleData(), (data) => write(DATA_KEY, data));
}

let repo = freshRepo();
let svc = createService(repo);
let userId = read(USER_KEY);
const listeners = new Set();
const emit = (m) => listeners.forEach((fn) => fn(m));
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let replyIndex = 0;

// Errors come back the same shape as the HTTP API's.
const call = async (fn) => {
  await delay(60);
  try {
    return await fn();
  } catch (e) {
    throw new Error(e.message);
  }
};

export const demoApi = {
  isDemo: true,
  async session() {
    if (!userId) return null;
    try {
      return await svc.me(userId);
    } catch {
      return null;
    }
  },
  async demoLogin(id) {
    userId = id;
    write(USER_KEY, id);
    return svc.me(id);
  },
  async logout() {
    userId = null;
    write(USER_KEY, null);
  },
  async resetDemo() {
    write(DATA_KEY, null);
    repo = freshRepo();
    svc = createService(repo);
  },

  me: () => call(() => svc.me(userId)),
  updateProfile: (patch) => call(() => svc.updateProfile(userId, patch)),
  people: () => call(() => svc.people(userId)),
  matches: () => call(() => svc.matches(userId)),
  block: (id) => call(() => svc.block(userId, id)),
  circles: () => call(() => svc.circles(userId)),
  proposeCircle: (body) => call(() => svc.proposeCircle(userId, body)),
  joinCircle: (id) => call(() => svc.joinCircle(userId, id)),
  leaveCircle: (id) => call(() => svc.leaveCircle(userId, id)),
  conversations: () => call(() => svc.conversations(userId)),
  messages: (id) => call(() => svc.messages(userId, id)),
  startDirect: (peerId) => call(() => svc.startDirect(userId, peerId)),
  report: (messageId, reason) => call(() => svc.report(userId, messageId, reason)),
  counselors: () => call(() => svc.counselors(userId)),
  referrals: () => call(() => svc.myReferrals(userId)),
  requestReferral: (body) => call(() => svc.requestReferral(userId, body)),
  overview: () => call(() => svc.overview(userId)),
  assignFacilitator: (circleId, volunteerId) => call(() => svc.assignFacilitator(userId, circleId, volunteerId)),
  reviewCircle: (id, decision, note) => call(() => svc.reviewCircle(userId, id, decision, note)),
  moveReferral: (id, status, note) => call(() => svc.moveReferral(userId, id, status, note)),
  resolveReport: (id) => call(() => svc.resolveReport(userId, id)),

  async send(conversationId, text) {
    const result = await call(() => svc.sendMessage(userId, conversationId, text));
    emit(result.message);
    // In a one-on-one chat, the sample peer writes back after a moment. Never after a crisis message:
    // the right response there is crisis resources and a coordinator, not a cheerful canned reply.
    const conv = (await repo.get('conversations', conversationId)) ?? {};
    const other = conv.type === 'direct' && conv.participants.find((p) => p !== userId);
    if (other && !result.crisis) {
      const me = userId;
      setTimeout(async () => {
        const text = DEMO_REPLIES[replyIndex++ % DEMO_REPLIES.length];
        try {
          const reply = await svc.sendMessage(other, conversationId, text);
          if (me === userId) emit(reply.message);
        } catch {
          // The person was blocked or the demo was reset in the meantime.
        }
      }, 1800);
    }
    return { message: result.message, crisis: result.crisis };
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
