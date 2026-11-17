import React from 'react';
import { CRISIS, TOPIC_RESOURCES, topicLabel } from '../../shared/constants.js';
import { initials } from '../lib/format.js';

const TONES = 6;
const toneOf = (id = '') => [...id].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES;

export function Avatar({ person, size = 40 }) {
  if (!person) return null;
  return (
    <span className={`avatar tone-${toneOf(person.id)}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(person.displayName)}
    </span>
  );
}

export function TopicChip({ topic, shared }) {
  return <span className={shared ? 'chip chip-shared' : 'chip'}>{shared && <span aria-hidden="true">✓ </span>}{topicLabel(topic)}</span>;
}

export function RoleBadge({ role }) {
  if (role === 'volunteer') return <span className="badge badge-volunteer">Peer facilitator</span>;
  if (role === 'coordinator') return <span className="badge">Coordinator</span>;
  return null;
}

export function Loading() {
  return <p className="muted" role="status">Loading…</p>;
}

export function ErrorNote({ error }) {
  return error ? <p className="error" role="alert">{error}</p> : null;
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function CrisisBar() {
  return (
    <aside className="crisis-bar" aria-label="Crisis resources">
      <div className="crisis-inner">
        <span className="crisis-lead">In crisis or thinking about suicide?</span>
        <a href={CRISIS.call}>Call <strong>988</strong></a>
        <a href={CRISIS.text}>Text <strong>988</strong></a>
        <a href={CRISIS.chat} target="_blank" rel="noreferrer">Chat online</a>
        <span className="crisis-sep" aria-hidden="true">·</span>
        <span>Emergency: <a href="tel:911"><strong>911</strong></a></span>
      </div>
    </aside>
  );
}

export function SafetyPanel({ onClose }) {
  return (
    <div className="safety-panel" role="alertdialog" aria-labelledby="safety-title" aria-describedby="safety-body">
      <h3 id="safety-title">You don't have to go through this alone</h3>
      <p id="safety-body">
        It sounds like things are really hard right now. Trained crisis counselors are available any time, for free.
        A coordinator here has also been notified, so someone can check in with you.
      </p>
      <div className="safety-actions">
        <a className="btn btn-crisis" href={CRISIS.call}>Call 988</a>
        <a className="btn btn-crisis-outline" href={CRISIS.text}>Text 988</a>
        <a className="btn btn-crisis-outline" href={CRISIS.chat} target="_blank" rel="noreferrer">Chat with 988</a>
        <a className="btn btn-ghost" href="#/help">Find a counselor</a>
      </div>
      <p className="small muted">If you are in immediate danger, call 911.</p>
      {onClose && <button className="link" onClick={onClose}>Close</button>}
    </div>
  );
}

export function TopicResources({ topic, compact = false }) {
  const lines = TOPIC_RESOURCES[topic];
  if (!lines) return null;
  if (compact) {
    return (
      <p className="topic-resources compact small">
        Confidential support any time:{' '}
        {lines.map((r, i) => (
          <React.Fragment key={r.name}>
            {i > 0 && ' · '}
            <a href={r.href} target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{r.name}</a>
          </React.Fragment>
        ))}
      </p>
    );
  }
  return (
    <div className="topic-resources">
      <strong className="small">Confidential support for {topicLabel(topic).toLowerCase()}, any time:</strong>
      <ul>
        {lines.map((r) => (
          <li key={r.name}>
            <a href={r.href} target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{r.name}</a>
            <span className="muted"> · {r.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
