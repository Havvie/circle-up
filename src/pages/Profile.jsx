import React, { useState } from 'react';
import { api } from '../api/index.js';
import { FORMATS, TOPICS } from '../../shared/constants.js';
import AvailabilityGrid from '../components/AvailabilityGrid.jsx';
import { ErrorNote } from '../components/ui.jsx';

export default function Profile({ user, onSaved }) {
  const [form, setForm] = useState({
    displayName: user.displayName,
    pronouns: user.pronouns ?? '',
    bio: user.bio ?? '',
    topics: user.topics ?? [],
    formats: user.formats ?? [],
    availability: user.availability ?? [],
    openToMatches: user.openToMatches !== false,
  });
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);
  const set = (patch) => {
    setSaved(false);
    setForm((f) => ({ ...f, ...patch }));
  };
  const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      onSaved(await api.updateProfile(form));
      setSaved(true);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <form className="profile form" onSubmit={save}>
      <h1>Your profile</h1>
      <p className="lead muted">Only your display name, pronouns, short intro and topics are shown to other members. Your email is never shown.</p>
      <section className="card">
        <div className="form-row">
          <label>
            Display name
            <input value={form.displayName} onChange={(e) => set({ displayName: e.target.value })} maxLength={40} required />
          </label>
          <label>
            Pronouns <span className="muted small">(optional)</span>
            <input value={form.pronouns} onChange={(e) => set({ pronouns: e.target.value })} maxLength={30} />
          </label>
        </div>
        <label>
          A short intro <span className="muted small">(optional, {280 - form.bio.length} characters left)</span>
          <textarea rows={2} value={form.bio} maxLength={280} onChange={(e) => set({ bio: e.target.value })} />
        </label>
      </section>
      <section className="card">
        <fieldset>
          <legend>What are you going through?</legend>
          <p className="muted small">We use these to suggest peers and circles. Choose any that fit.</p>
          <div className="chips">
            {TOPICS.map((t) => (
              <button type="button" key={t.key} className={form.topics.includes(t.key) ? 'chip-toggle on' : 'chip-toggle'} aria-pressed={form.topics.includes(t.key)} onClick={() => set({ topics: toggle(form.topics, t.key) })}>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>How do you like to connect?</legend>
          <div className="chips">
            {FORMATS.map((f) => (
              <button type="button" key={f.key} className={form.formats.includes(f.key) ? 'chip-toggle on' : 'chip-toggle'} aria-pressed={form.formats.includes(f.key)} onClick={() => set({ formats: toggle(form.formats, f.key) })}>
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
      </section>
      <section className="card">
        <fieldset>
          <legend>When are you usually free?</legend>
          <AvailabilityGrid value={form.availability} onChange={(availability) => set({ availability })} />
        </fieldset>
        <label className="check">
          <input type="checkbox" checked={form.openToMatches} onChange={(e) => set({ openToMatches: e.target.checked })} />
          Suggest me to other members as a peer to connect with
        </label>
      </section>
      <ErrorNote error={err} />
      <div className="row">
        <button className="btn btn-primary" type="submit">Save profile</button>
        {saved && <span className="status-good" role="status">✓ Saved</span>}
      </div>
    </form>
  );
}
