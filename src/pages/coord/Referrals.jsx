import React, { useState } from 'react';
import { api } from '../../api/index.js';
import { useOverview } from './useOverview.js';
import { REFERRAL_STATUSES, topicLabel } from '../../../shared/constants.js';
import { daysOpen } from '../../../shared/referrals.js';
import { fmtDayTime } from '../../lib/format.js';
import { ErrorNote, Loading } from '../../components/ui.jsx';

const NEXT = { requested: 'contacted', contacted: 'scheduled', scheduled: 'closed' };
const NEXT_LABEL = { requested: 'Mark contacted', contacted: 'Mark scheduled', scheduled: 'Close' };

export default function Referrals() {
  const { data, loading, reload } = useOverview();
  const [notes, setNotes] = useState({});
  const [err, setErr] = useState(null);
  if (loading || !data) return <Loading />;
  const counselors = Object.fromEntries(data.counselors.map((c) => [c.id, c]));

  const move = async (r, status) => {
    setErr(null);
    try {
      await api.moveReferral(r.id, status, notes[r.id] ?? '');
      setNotes({ ...notes, [r.id]: '' });
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <h1>Counselor referrals</h1>
      <p className="lead muted">Members who asked to talk to a professional. Move each request along as you contact the counselor and book a consult.</p>
      <ErrorNote error={err} />
      <div className="board">
        {REFERRAL_STATUSES.map((s) => {
          const items = data.referrals.filter((r) => r.status === s.key);
          return (
            <section key={s.key} className="board-col" aria-label={s.label}>
              <h2 className="board-head">{s.label} <span className="count">{items.length}</span></h2>
              {items.map((r) => {
                const k = counselors[r.counselorId];
                const age = daysOpen(r);
                return (
                  <article key={r.id} className="card ref-card">
                    <div className="ref-top">
                      <strong>{data.people[r.memberId]?.displayName}</strong>
                      {r.status !== 'closed' && (
                        <span className={age >= 2 && r.status === 'requested' ? 'status-warning small' : 'muted small'}>
                          {age === 0 ? 'today' : `${age}d`}
                        </span>
                      )}
                    </div>
                    <p className="small">→ {k?.name}<br /><span className="muted">{r.concerns.map(topicLabel).join(', ')}</span></p>
                    {r.preferredTimes?.length > 0 && <p className="tiny muted">Prefers {r.preferredTimes.map(fmtDayTime).join('; ')}</p>}
                    {r.notes && <p className="tiny">“{r.notes}”</p>}
                    {r.history?.at(-1)?.note && <p className="tiny muted">Last note: {r.history.at(-1).note}</p>}
                    {NEXT[r.status] && (
                      <div className="ref-actions">
                        <label className="sr-only" htmlFor={`note-${r.id}`}>Note</label>
                        <input id={`note-${r.id}`} placeholder="Add a note (optional)" value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                        <div className="row">
                          <button className="btn btn-small btn-primary" onClick={() => move(r, NEXT[r.status])}>{NEXT_LABEL[r.status]}</button>
                          {r.status !== 'scheduled' && <button className="btn btn-small btn-ghost" onClick={() => move(r, 'closed')}>Close</button>}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {!items.length && <p className="muted small board-empty">None</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
