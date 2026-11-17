import React, { useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { useAsync } from '../lib/useAsync.js';
import { TOPICS, slotOf } from '../../shared/constants.js';
import { seatsLeft } from '../../shared/scheduling.js';
import { dayKey, fmtDay, fmtTime } from '../lib/format.js';
import { ErrorNote, Loading, TopicChip, Empty } from '../components/ui.jsx';

export default function Circles({ user }) {
  const { data, loading, error, setData } = useAsync(async () => {
    const [circles, people] = await Promise.all([api.circles(), api.people()]);
    return { circles, people: Object.fromEntries(people.map((p) => [p.id, p])) };
  });
  const [filter, setFilter] = useState(user.topics?.length ? 'mine' : 'all');
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  const shown = useMemo(() => {
    if (!data) return [];
    return data.circles.filter((c) => (filter === 'all' ? true : filter === 'mine' ? user.topics.includes(c.topic) || c.members.includes(user.id) : c.topic === filter));
  }, [data, filter, user]);

  const byDay = useMemo(() => {
    const groups = [];
    for (const c of shown) {
      const k = dayKey(c.startsAt);
      if (groups.at(-1)?.key !== k) groups.push({ key: k, label: fmtDay(c.startsAt), circles: [] });
      groups.at(-1).circles.push(c);
    }
    return groups;
  }, [shown]);

  const act = async (circle, join) => {
    setBusy(circle.id);
    setErr(null);
    try {
      const updated = join ? await api.joinCircle(circle.id) : await api.leaveCircle(circle.id);
      setData({ ...data, circles: data.circles.map((c) => (c.id === updated.id ? updated : c)) });
    } catch (e) {
      setErr(e.message);
    }
    setBusy(null);
  };

  return (
    <div>
      <h1>Support circles</h1>
      <p className="lead muted">Small groups of up to 10, led by a trained peer facilitator. Join by video; cameras optional.</p>
      <div className="filters" role="group" aria-label="Filter circles">
        <button className={filter === 'mine' ? 'filter on' : 'filter'} onClick={() => setFilter('mine')} aria-pressed={filter === 'mine'}>For you</button>
        <button className={filter === 'all' ? 'filter on' : 'filter'} onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>All</button>
        {TOPICS.map((t) => (
          <button key={t.key} className={filter === t.key ? 'filter on' : 'filter'} onClick={() => setFilter(t.key)} aria-pressed={filter === t.key}>
            {t.label}
          </button>
        ))}
      </div>
      <ErrorNote error={error ?? err} />
      {loading ? (
        <Loading />
      ) : !byDay.length ? (
        <Empty title="No circles match this filter">Try "All", or check back soon.</Empty>
      ) : (
        byDay.map((g) => (
          <section key={g.key} className="day-group">
            <h2 className="day-label">{g.label}</h2>
            <div className="circle-list">
              {g.circles.map((c) => {
                const joined = c.members.includes(user.id);
                const left = seatsLeft(c);
                const facilitator = c.facilitatorId ? data.people[c.facilitatorId] : null;
                const fits = user.availability?.includes(slotOf(c.startsAt));
                return (
                  <article key={c.id} className={joined ? 'card circle-card joined' : 'card circle-card'}>
                    <div className="circle-time">
                      <strong>{fmtTime(c.startsAt)}</strong>
                      <span className="muted small">{c.durationMin} min</span>
                    </div>
                    <div className="circle-body">
                      <div className="circle-title-row">
                        <h3>{c.title}</h3>
                        <TopicChip topic={c.topic} />
                      </div>
                      <p className="muted small">{c.description}</p>
                      <p className="small">
                        {facilitator ? <>Led by <strong>{facilitator.displayName}</strong></> : <span className="muted">Facilitator to be confirmed</span>}
                        {fits && <span className="fit"> · ✓ Fits your schedule</span>}
                      </p>
                    </div>
                    <div className="circle-actions">
                      <div className="seats" aria-label={`${c.members.length} of ${c.capacity} seats taken`}>
                        <div className="seats-bar"><div style={{ width: `${(c.members.length / c.capacity) * 100}%` }} /></div>
                        <span className="small muted">{left === 0 ? 'Full' : `${left} seat${left === 1 ? '' : 's'} left`}</span>
                      </div>
                      {joined ? (
                        <>
                          <span className="status-good small">✓ You're in</span>
                          <a className="btn btn-small" href={`#/messages/conv-${c.id}`}>Group chat</a>
                          <button className="link small" onClick={() => act(c, false)} disabled={busy === c.id}>Give up seat</button>
                        </>
                      ) : (
                        <button className="btn btn-primary btn-small" onClick={() => act(c, true)} disabled={busy === c.id || left === 0}>
                          Save a seat
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
