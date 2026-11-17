import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/index.js';
import { useAsync } from '../lib/useAsync.js';
import { go } from '../lib/router.js';
import { fmtAgo, fmtTime } from '../lib/format.js';
import { MAX_MESSAGE_LENGTH } from '../../shared/safety.js';
import { Avatar, Empty, ErrorNote, Loading, RoleBadge, SafetyPanel } from '../components/ui.jsx';

const titleOf = (c) => c.title ?? c.others.map((o) => o.displayName).join(', ');

export default function Messages({ user, conversationId }) {
  const convs = useAsync(() => api.conversations());
  const list = convs.data ?? [];
  const current = list.find((c) => c.id === conversationId) ?? (conversationId ? null : list[0]);

  useEffect(() => api.subscribe(() => convs.reload()), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (convs.loading) return <Loading />;
  return (
    <div>
      <h1 className="sr-only">Messages</h1>
      <div className={conversationId ? 'chat-layout has-thread' : 'chat-layout'}>
        <aside className="convo-list" aria-label="Conversations">
          <h2 className="convo-list-head">Messages</h2>
          {!list.length && <Empty title="No conversations yet">Say hello to someone on <a href="#/peers">Find peers</a>.</Empty>}
          <ul>
            {list.map((c) => (
              <li key={c.id}>
                <a href={`#/messages/${c.id}`} className={current?.id === c.id ? 'convo-item active' : 'convo-item'} aria-current={current?.id === c.id}>
                  {c.type === 'direct' ? <Avatar person={c.others[0]} size={38} /> : <span className="avatar group-avatar" style={{ width: 38, height: 38 }} aria-hidden="true">●●</span>}
                  <span className="convo-text">
                    <span className="convo-title">{titleOf(c)}</span>
                    <span className="muted small truncate">{c.lastMessage?.text ?? 'No messages yet'}</span>
                  </span>
                  {c.lastMessage && <span className="muted tiny">{fmtAgo(c.lastMessage.createdAt)}</span>}
                </a>
              </li>
            ))}
          </ul>
        </aside>
        {current ? (
          <Thread key={current.id} user={user} conv={current} onChanged={convs.reload} />
        ) : conversationId ? (
          <section className="thread"><Empty title="Conversation not found" /></section>
        ) : null}
      </div>
    </div>
  );
}

function Thread({ user, conv, onChanged }) {
  const { data: messages, loading, error, setData } = useAsync(() => api.messages(conv.id), [conv.id]);
  const [text, setText] = useState('');
  const [crisis, setCrisis] = useState(false);
  const [err, setErr] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [notice, setNotice] = useState(null);
  const endRef = useRef(null);
  const people = Object.fromEntries([[user.id, user], ...conv.others.map((o) => [o.id, o])]);
  const other = conv.type === 'direct' ? conv.others[0] : null;

  useEffect(
    () =>
      api.subscribe((m) => {
        if (m.conversationId !== conv.id) return;
        setData((prev) => (prev?.some((x) => x.id === m.id) ? prev : [...(prev ?? []), m]));
      }),
    [conv.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages?.length, crisis]);

  const send = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      const res = await api.send(conv.id, text);
      setText('');
      if (res.crisis) setCrisis(true);
      setData((prev) => (prev?.some((x) => x.id === res.message.id) ? prev : [...(prev ?? []), res.message]));
      onChanged();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const block = async () => {
    if (!window.confirm(`Block ${other.displayName}? They won't be able to message you, and you won't see each other in matches.`)) return;
    await api.block(other.id);
    go('messages');
    onChanged();
  };

  return (
    <section className="thread" aria-label={`Conversation with ${titleOf(conv)}`}>
      <header className="thread-head">
        <a href="#/messages" className="back-link" aria-label="Back to conversations">←</a>
        {other ? <Avatar person={other} size={36} /> : <span className="avatar group-avatar" style={{ width: 36, height: 36 }} aria-hidden="true">●●</span>}
        <div className="thread-title">
          <strong>{titleOf(conv)}</strong>
          {other ? <RoleBadge role={other.role} /> : <span className="muted small">Circle group chat · {conv.participants.length} people</span>}
        </div>
        {other && <button className="btn btn-small btn-ghost" onClick={block}>Block</button>}
      </header>

      <div className="thread-body">
        <p className="thread-note">
          Be kind, keep what's shared here private, and don't give medical advice. <a href="#/help">Need a professional?</a>
        </p>
        <ErrorNote error={error} />
        {loading ? (
          <Loading />
        ) : (
          (messages ?? []).map((m, i) => {
            const mine = m.senderId === user.id;
            const sender = people[m.senderId];
            const showName = !mine && conv.type !== 'direct' && messages[i - 1]?.senderId !== m.senderId;
            return (
              <div key={m.id} className={mine ? 'msg mine' : 'msg'}>
                {showName && <span className="msg-name">{sender?.displayName ?? 'Someone'}</span>}
                <div className="bubble">{m.text}</div>
                <div className="msg-meta">
                  <span>{fmtTime(m.createdAt)}</span>
                  {!mine && (
                    <button className="link tiny" onClick={() => setReporting(m.id)}>Report</button>
                  )}
                </div>
                {reporting === m.id && (
                  <ReportForm
                    onCancel={() => setReporting(null)}
                    onSubmit={async (reason) => {
                      await api.report(m.id, reason);
                      setReporting(null);
                      setNotice('Thanks. A coordinator will review this message.');
                    }}
                  />
                )}
              </div>
            );
          })
        )}
        {crisis && <SafetyPanel onClose={() => setCrisis(false)} />}
        <div ref={endRef} />
      </div>

      {notice && <p className="notice" role="status">{notice}</p>}
      <form className="composer" onSubmit={send}>
        <label htmlFor="composer" className="sr-only">Message</label>
        <textarea
          id="composer"
          rows={2}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Write a message…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
        />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()}>Send</button>
      </form>
      <ErrorNote error={err} />
    </section>
  );
}

function ReportForm({ onSubmit, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <form
      className="report-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (reason.trim().length >= 3) onSubmit(reason);
      }}
    >
      <label>
        What's wrong with this message?
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. spam, harassment, unsafe advice" autoFocus />
      </label>
      <div className="row">
        <button className="btn btn-small btn-primary" type="submit" disabled={reason.trim().length < 3}>Send report</button>
        <button className="btn btn-small btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
