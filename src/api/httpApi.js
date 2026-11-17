// Talks to the Express server (server/). Used when the app is built with VITE_API_URL set.
import { io } from 'socket.io-client';

const BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const TOKEN_KEY = 'circle-up:token';
let token = (() => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
})();
let socket = null;
const listeners = new Set();

const saveToken = (t) => {
  token = t;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
};

async function req(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data;
}

function connectSocket() {
  socket?.close();
  if (!token) return;
  socket = io(BASE, { auth: { token } });
  socket.on('message', (m) => listeners.forEach((fn) => fn(m)));
}

const get = (p) => req('GET', p);
const post = (p, b = {}) => req('POST', p, b);

export const httpApi = {
  isDemo: false,
  async session() {
    if (!token) return null;
    try {
      const me = await get('/me');
      connectSocket();
      return me;
    } catch {
      saveToken(null);
      return null;
    }
  },
  async login(email, password) {
    const { token: t, user } = await post('/auth/login', { email, password });
    saveToken(t);
    connectSocket();
    return user;
  },
  async register(displayName, email, password) {
    const { token: t, user } = await post('/auth/register', { displayName, email, password });
    saveToken(t);
    connectSocket();
    return user;
  },
  async logout() {
    saveToken(null);
    socket?.close();
  },

  me: () => get('/me'),
  updateProfile: (patch) => req('PATCH', '/me', patch),
  people: () => get('/people'),
  matches: () => get('/matches'),
  block: (id) => post(`/people/${id}/block`),
  circles: () => get('/circles'),
  proposeCircle: (body) => post('/circles', body),
  joinCircle: (id) => post(`/circles/${id}/join`),
  leaveCircle: (id) => post(`/circles/${id}/leave`),
  conversations: () => get('/conversations'),
  messages: (id) => get(`/conversations/${id}/messages`),
  send: (id, text) => post(`/conversations/${id}/messages`, { text }),
  startDirect: (peerId) => post('/conversations', { peerId }),
  report: (messageId, reason) => post(`/messages/${messageId}/report`, { reason }),
  counselors: () => get('/counselors'),
  referrals: () => get('/referrals'),
  requestReferral: (body) => post('/referrals', body),
  overview: () => get('/coordinator/overview'),
  assignFacilitator: (circleId, volunteerId) => post(`/coordinator/circles/${circleId}/facilitator`, { volunteerId }),
  reviewCircle: (id, decision, note) => post(`/coordinator/circles/${id}/review`, { decision, note }),
  moveReferral: (id, status, note) => post(`/coordinator/referrals/${id}/status`, { status, note }),
  resolveReport: (id) => post(`/coordinator/reports/${id}/resolve`),
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
