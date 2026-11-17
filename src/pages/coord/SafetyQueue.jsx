import React from 'react';
import { api } from '../../api/index.js';
import { useOverview } from './useOverview.js';
import { fmtAgo } from '../../lib/format.js';
import { Loading } from '../../components/ui.jsx';

export default function SafetyQueue() {
  const { data, loading, reload } = useOverview();
  if (loading || !data) return <Loading />;

  return (
    <div>
      <h1>Safety queue</h1>
      <p className="lead muted">Messages flagged automatically for crisis language, and messages members reported.</p>
      <div className="card protocol">
        <h2>When a crisis flag comes in</h2>
        <ol>
          <li>Reach out to the member within the hour. Ask directly and kindly how they're doing.</li>
          <li>Share 988 (call, text or chat). If there's immediate danger, call 911.</li>
          <li>Offer a counselor referral, and note what you did before resolving the flag.</li>
        </ol>
        <p className="small muted">The automatic check matches common phrases. It will miss some messages and flag some harmless ones, so it supports human judgment and never replaces it.</p>
      </div>
      <ul className="report-list">
        {data.reports.map((r) => (
          <li key={r.id} className={`card report ${r.status === 'open' ? `open ${r.kind}` : 'resolved'}`}>
            <div className="report-top">
              {r.kind === 'crisis' ? <span className="status-critical"><span className="dot" aria-hidden="true">✕</span> Crisis language</span> : <span className="status-warning"><span className="dot" aria-hidden="true">!</span> Member report</span>}
              <span className="muted small">{fmtAgo(r.createdAt)}</span>
              {r.status === 'resolved' && <span className="status-good small">✓ Resolved</span>}
            </div>
            {r.message && (
              <blockquote>
                <span className="muted small">{r.sender?.displayName ?? 'Someone'} wrote:</span>
                <br />
                {r.message.text}
              </blockquote>
            )}
            <p className="small">{r.reason}</p>
            {r.status === 'open' && (
              <button className="btn btn-small" onClick={async () => { await api.resolveReport(r.id); reload(); }}>
                Mark resolved
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
