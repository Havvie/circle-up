import React, { useState } from 'react';
import { api } from '../api/index.js';
import { TOPICS } from '../../shared/constants.js';
import { CIRCLE_LIMITS } from '../../shared/service.js';
import { ErrorNote } from './ui.jsx';

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TIMES = Array.from({ length: 27 }, (_, i) => 8 * 60 + i * 30).map((m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
const timeLabel = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
};

// Members suggest a circle; a coordinator reviews it and finds a trained facilitator before it opens.
export default function StartCircle({ defaultTopic, onCreated, onCancel }) {
  const min = new Date(Date.now() + 2 * 86400000);
  const max = new Date(Date.now() + CIRCLE_LIMITS.maxDaysAhead * 86400000);
  const [form, setForm] = useState({
    title: '',
    topic: defaultTopic ?? TOPICS[0].key,
    description: '',
    date: isoDate(min),
    time: '19:00',
    durationMin: 60,
    capacity: 8,
  });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const circle = await api.proposeCircle({
        title: form.title,
        topic: form.topic,
        description: form.description,
        startsAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
        durationMin: Number(form.durationMin),
        capacity: Number(form.capacity),
      });
      onCreated(circle);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  };

  return (
    <form className="card form start-circle" onSubmit={submit}>
      <h2>Start a circle</h2>
      <p className="muted small">
        Have an idea for a group? Suggest it here. A coordinator will review it and pair it with a trained peer facilitator, and then
        it opens for others to join. You'll have the first seat.
      </p>
      <div className="form-row">
        <label>
          Name
          <input value={form.title} onChange={set('title')} maxLength={CIRCLE_LIMITS.titleMax} placeholder="e.g. Sunday reset for caregivers" required />
        </label>
        <label>
          Topic
          <select value={form.topic} onChange={set('topic')}>
            {TOPICS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        What's it about? <span className="muted small">(optional)</span>
        <textarea rows={2} value={form.description} maxLength={280} onChange={set('description')} placeholder="Who is it for, and what will you talk about?" />
      </label>
      <div className="form-row">
        <label>
          Date
          <input type="date" value={form.date} min={isoDate(min)} max={isoDate(max)} onChange={set('date')} required />
        </label>
        <label>
          Start time
          <select value={form.time} onChange={set('time')}>
            {TIMES.map((t) => (
              <option key={t} value={t}>{timeLabel(t)}</option>
            ))}
          </select>
        </label>
        <label>
          Length
          <select value={form.durationMin} onChange={set('durationMin')}>
            {CIRCLE_LIMITS.durations.map((d) => (
              <option key={d} value={d}>{d} minutes</option>
            ))}
          </select>
        </label>
        <label>
          Seats
          <input type="number" min={CIRCLE_LIMITS.capacityMin} max={CIRCLE_LIMITS.capacityMax} value={form.capacity} onChange={set('capacity')} />
        </label>
      </div>
      <ErrorNote error={err} />
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={busy || form.title.trim().length < CIRCLE_LIMITS.titleMin}>
          Send for approval
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
