import React, { useState } from 'react';
import { api } from '../../api/index.js';
import { useOverview } from './useOverview.js';
import { coverageReport, eligibleFacilitators } from '../../../shared/scheduling.js';
import { fmtDayTime } from '../../lib/format.js';
import { ErrorNote, Loading, TopicChip } from '../../components/ui.jsx';

export default function Coverage() {
  const { data, loading, reload } = useOverview();
  const [pick, setPick] = useState({});
  const [err, setErr] = useState(null);
  const [days, setDays] = useState(14);
  const [reviewNotes, setReviewNotes] = useState({});
  if (loading || !data) return <Loading />;
  const cov = coverageReport(data.circles, data.volunteers, new Date(), days);

  const assign = async (circleId) => {
    setErr(null);
    try {
      await api.assignFacilitator(circleId, pick[circleId]);
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  const review = async (circleId, decision) => {
    setErr(null);
    try {
      await api.reviewCircle(circleId, decision, reviewNotes[circleId] ?? '');
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <h1>Circle coverage</h1>
      <p className="lead muted">
        Every circle needs a trained peer facilitator. Only volunteers trained on the topic, free at that time and not already leading
        another circle are offered.
      </p>
      {data.proposals.length > 0 && (
        <section className="card proposals">
          <h2>Circles suggested by members</h2>
          <p className="muted small">Approve to open it for sign-ups (then assign a facilitator below), or decline with a short note the member will see.</p>
          <ul>
            {data.proposals.map((c) => (
              <li key={c.id} className="proposal">
                <div className="proposal-body">
                  <div className="circle-title-row">
                    <strong>{c.title}</strong>
                    <TopicChip topic={c.topic} />
                  </div>
                  <p className="small muted">
                    {fmtDayTime(c.startsAt)} · {c.durationMin} min · {c.capacity} seats · suggested by {data.people[c.proposedBy]?.displayName}
                  </p>
                  {c.description && <p className="small">{c.description}</p>}
                  <p className="small">
                    {eligibleFacilitators(c, data.volunteers, data.circles).length
                      ? <span className="status-good">✓ {eligibleFacilitators(c, data.volunteers, data.circles).map((v) => v.displayName).join(', ')} could facilitate</span>
                      : <span className="status-warning">! No trained volunteer is free at that time yet</span>}
                  </p>
                </div>
                <div className="proposal-actions">
                  <label className="sr-only" htmlFor={`rn-${c.id}`}>Note to member</label>
                  <input id={`rn-${c.id}`} placeholder="Note to member (optional)" value={reviewNotes[c.id] ?? ''} onChange={(e) => setReviewNotes({ ...reviewNotes, [c.id]: e.target.value })} />
                  <div className="row">
                    <button className="btn btn-small btn-primary" onClick={() => review(c.id, 'approve')}>Approve</button>
                    <button className="btn btn-small" onClick={() => review(c.id, 'decline')}>Decline</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="filters">
        {[7, 14].map((d) => (
          <button key={d} className={days === d ? 'filter on' : 'filter'} aria-pressed={days === d} onClick={() => setDays(d)}>Next {d} days</button>
        ))}
        <span className="muted small summary">
          {cov.total} circles · {cov.needsFacilitator} need a facilitator · {Math.round(cov.fillRate * 100)}% of seats filled
        </span>
      </div>
      <ErrorNote error={err} />
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Circle</th>
              <th scope="col">Seats</th>
              <th scope="col">Facilitator</th>
            </tr>
          </thead>
          <tbody>
            {cov.rows.map((r) => {
              const c = r.circle;
              const candidates = r.covered ? [] : eligibleFacilitators(c, data.volunteers, data.circles);
              return (
                <tr key={c.id} className={r.covered ? '' : 'row-warn'}>
                  <td className="nowrap">{fmtDayTime(c.startsAt)}</td>
                  <td>
                    <div className="cell-title">{c.title}</div>
                    <TopicChip topic={c.topic} />
                  </td>
                  <td>
                    <div className="seats compact">
                      <div className="seats-bar"><div style={{ width: `${(r.seatsFilled / c.capacity) * 100}%` }} /></div>
                      <span className="small">{r.seatsFilled}/{c.capacity}</span>
                    </div>
                  </td>
                  <td>
                    {r.covered ? (
                      <span className="status-good">✓ {data.people[c.facilitatorId]?.displayName}</span>
                    ) : candidates.length ? (
                      <div className="assign">
                        <label className="sr-only" htmlFor={`pick-${c.id}`}>Facilitator for {c.title}</label>
                        <select id={`pick-${c.id}`} value={pick[c.id] ?? ''} onChange={(e) => setPick({ ...pick, [c.id]: e.target.value })}>
                          <option value="">Choose a volunteer…</option>
                          {candidates.map((v) => (
                            <option key={v.id} value={v.id}>{v.displayName}</option>
                          ))}
                        </select>
                        <button className="btn btn-small btn-primary" disabled={!pick[c.id]} onClick={() => assign(c.id)}>Assign</button>
                      </div>
                    ) : (
                      <span className="status-critical small">✕ No trained volunteer is free. Recruit or reschedule.</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
