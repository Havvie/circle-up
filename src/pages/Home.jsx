import React from 'react';
import { api } from '../api/index.js';
import { useAsync } from '../lib/useAsync.js';
import { recommendCircles } from '../../shared/scheduling.js';
import { referralStatusLabel } from '../../shared/constants.js';
import { fmtAgo, fmtDayTime } from '../lib/format.js';
import { Avatar, Loading, TopicChip } from '../components/ui.jsx';

export default function Home({ user }) {
  const { data, loading } = useAsync(async () => {
    const [matches, circles, conversations, referrals, counselors] = await Promise.all([
      api.matches(),
      api.circles(),
      api.conversations(),
      api.referrals(),
      api.counselors(),
    ]);
    return { matches, circles, conversations, referrals, counselors };
  });
  if (loading || !data) return <Loading />;

  const mine = data.circles.filter((c) => c.members.includes(user.id));
  const next = mine[0];
  const recs = recommendCircles(user, data.circles).filter((r) => !r.circle.members.includes(user.id)).slice(0, 3);
  const counselorName = Object.fromEntries(data.counselors.map((c) => [c.id, c.name]));
  const openReferral = data.referrals.find((r) => r.status !== 'closed');
  const needsSetup = !user.topics?.length;

  return (
    <div className="home">
      <h1>Hi, {user.displayName}.</h1>
      <p className="lead muted">Glad you're here. Here's what's happening in your circles.</p>

      {needsSetup && (
        <div className="card callout">
          <strong>Tell us what you're going through</strong> so we can suggest peers and circles.{' '}
          <a href="#/profile">Set up your profile</a>
        </div>
      )}

      <div className="home-grid">
        <section className="card next-circle">
          <h2>Your next circle</h2>
          {next ? (
            <>
              <p className="big">{next.title}</p>
              <p className="muted">{fmtDayTime(next.startsAt)} · {next.durationMin} min</p>
              <div className="row">
                <a className="btn btn-primary" href={`#/messages/conv-${next.id}`}>Open group chat</a>
                <a className="btn" href="#/circles">All circles</a>
              </div>
            </>
          ) : (
            <p className="muted">You haven't saved a seat yet. <a href="#/circles">Browse circles</a></p>
          )}
        </section>

        <section className="card">
          <h2>Recent messages</h2>
          {data.conversations.length ? (
            <ul className="mini-list">
              {data.conversations.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <a href={`#/messages/${c.id}`} className="mini-convo">
                    {c.type === 'direct' ? <Avatar person={c.others[0]} size={32} /> : <span className="avatar group-avatar" style={{ width: 32, height: 32 }} aria-hidden="true">●●</span>}
                    <span className="mini-text">
                      <strong>{c.title ?? c.others[0]?.displayName}</strong>
                      <span className="muted truncate">{c.lastMessage?.text ?? 'No messages yet'}</span>
                    </span>
                    {c.lastMessage && <span className="muted small">{fmtAgo(c.lastMessage.createdAt)}</span>}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No conversations yet.</p>
          )}
        </section>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>People you might connect with</h2>
          <a href="#/peers">See all</a>
        </div>
        <div className="peer-row">
          {data.matches.slice(0, 3).map((m) => (
            <a key={m.peer.id} href="#/peers" className="card peer-mini">
              <Avatar person={m.peer} size={44} />
              <div>
                <strong>{m.peer.displayName}</strong>
                <p className="small muted">{m.reasons[0]}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Circles for you</h2>
          <a href="#/circles">See all</a>
        </div>
        <div className="circle-row">
          {recs.map(({ circle, fitsSchedule }) => (
            <a key={circle.id} href="#/circles" className="card circle-mini">
              <TopicChip topic={circle.topic} />
              <strong>{circle.title}</strong>
              <span className="muted small">{fmtDayTime(circle.startsAt)}</span>
              {fitsSchedule && <span className="fit">✓ Fits your schedule</span>}
            </a>
          ))}
        </div>
      </section>

      <section className="card help-cta">
        <div>
          <h2>Want to talk to a professional?</h2>
          <p className="muted">
            Peers can listen, but sometimes you need a licensed counselor. We'll match you by what you want help with, your insurance
            and your schedule.
          </p>
          {openReferral && (
            <p className="small">
              Your request with <strong>{counselorName[openReferral.counselorId]}</strong>: {referralStatusLabel(openReferral.status)}
            </p>
          )}
        </div>
        <a className="btn btn-primary" href="#/help">{openReferral ? 'View your requests' : 'Find a counselor'}</a>
      </section>
    </div>
  );
}
