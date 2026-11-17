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

  return (
    <div>
      <h1>Circle coverage</h1>
      <p className="lead muted">
        Every circle needs a trained peer facilitator. Only volunteers trained on the topic, free at that time and not already leading
        another circle are offered.
      </p>
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
