import React, { useState } from 'react';
import { api } from '../api/index.js';
import { useAsync } from '../lib/useAsync.js';
import { go } from '../lib/router.js';
import { Avatar, Empty, ErrorNote, Loading, RoleBadge, TopicChip } from '../components/ui.jsx';

export default function Peers() {
  const { data, loading, error } = useAsync(() => api.matches());
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  const sayHello = async (peerId) => {
    setBusy(peerId);
    try {
      const conv = await api.startDirect(peerId);
      go(`messages/${conv.id}`);
    } catch (e) {
      setErr(e.message);
      setBusy(null);
    }
  };

  return (
    <div>
      <h1>Find peers</h1>
      <p className="lead muted">People who chose the same experiences you did, ranked by what you share and when you're both free.</p>
      <ErrorNote error={error ?? err} />
      {loading ? (
        <Loading />
      ) : !data.length ? (
        <Empty title="No matches yet">Add topics and times you're free in <a href="#/profile">your profile</a>.</Empty>
      ) : (
        <div className="peer-grid">
          {data.map((m) => (
            <article key={m.peer.id} className="card peer-card">
              <header className="peer-head">
                <Avatar person={m.peer} size={52} />
                <div>
                  <h2 className="peer-name">
                    {m.peer.displayName} {m.peer.pronouns && <span className="muted small">({m.peer.pronouns})</span>}
                  </h2>
                  <RoleBadge role={m.peer.role} />
                </div>
                <span className="match-score" title="Match strength, based on shared topics, shared free times and preferred format">
                  {Math.round(m.score * 100)}<span>% match</span>
                </span>
              </header>
              {m.peer.bio && <p className="peer-bio">“{m.peer.bio}”</p>}
              <div className="chips">
                {m.peer.topics.map((t) => (
                  <TopicChip key={t} topic={t} shared={m.sharedTopics.includes(t)} />
                ))}
              </div>
              <ul className="reasons">
                {m.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <button className="btn btn-primary" onClick={() => sayHello(m.peer.id)} disabled={busy === m.peer.id}>
                Say hello
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
