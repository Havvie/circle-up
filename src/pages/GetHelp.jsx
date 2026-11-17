import React, { useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { useAsync } from '../lib/useAsync.js';
import { REFERRAL_STATUSES, TOPICS, topicLabel } from '../../shared/constants.js';
import { matchCounselors } from '../../shared/referrals.js';
import { INSURANCE } from '../../shared/sampleData.js';
import { fmtDayTime } from '../lib/format.js';
import { ErrorNote, Loading } from '../components/ui.jsx';

const LANGUAGES = ['English', 'Spanish', 'Vietnamese', 'Arabic', 'French', 'Hebrew'];

export default function GetHelp({ user }) {
  const { data, loading, reload } = useAsync(async () => {
    const [counselors, referrals] = await Promise.all([api.counselors(), api.referrals()]);
    return { counselors, referrals };
  });
  const [step, setStep] = useState('form');
  const [req, setReq] = useState({ concerns: user.topics?.slice(0, 2) ?? [], insurance: '', format: 'either', language: 'English' });
  const [chosen, setChosen] = useState(null);
  const [times, setTimes] = useState([]);
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState(null);
  const [created, setCreated] = useState(null);

  const results = useMemo(() => (data ? matchCounselors(req, data.counselors) : []), [data, req]);
  if (loading || !data) return <Loading />;
  const byId = Object.fromEntries(data.counselors.map((c) => [c.id, c]));

  const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = async () => {
    setErr(null);
    try {
      const r = await api.requestReferral({ counselorId: chosen.id, concerns: req.concerns, insurance: req.insurance, format: req.format, preferredTimes: times, notes });
      setCreated(r);
      setStep('done');
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="help">
      <h1>Talk to a professional</h1>
      <p className="lead muted">
        Peer support is not a substitute for care from a licensed professional. Tell us a little about what you're looking for and we'll
        suggest counselors and pass your request to a coordinator, who will help you book a first consult.
      </p>
      <div className="card urgent-note">
        <strong>Need help right now?</strong> Call or text <a href="tel:988">988</a> any time. In an emergency, call <a href="tel:911">911</a>.
      </div>

      <ol className="stepper" aria-label="Steps">
        {['What you need', 'Choose a counselor', 'Request sent'].map((s, i) => {
          const idx = { form: 0, pick: 1, done: 2 }[step];
          return (
            <li key={s} className={i < idx ? 'done' : i === idx ? 'current' : ''} aria-current={i === idx ? 'step' : undefined}>
              <span className="step-num">{i < idx ? '✓' : i + 1}</span> {s}
            </li>
          );
        })}
      </ol>

      {step === 'form' && (
        <section className="card form">
          <fieldset>
            <legend>What would you like support with?</legend>
            <div className="chips">
              {TOPICS.map((t) => (
                <button type="button" key={t.key} className={req.concerns.includes(t.key) ? 'chip-toggle on' : 'chip-toggle'} aria-pressed={req.concerns.includes(t.key)} onClick={() => setReq({ ...req, concerns: toggle(req.concerns, t.key) })}>
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="form-row">
            <label>
              Insurance
              <select value={req.insurance} onChange={(e) => setReq({ ...req, insurance: e.target.value })}>
                <option value="">Any</option>
                {INSURANCE.map((i) => (
                  <option key={i.key} value={i.key}>{i.label}</option>
                ))}
              </select>
            </label>
            <label>
              How would you like to meet?
              <select value={req.format} onChange={(e) => setReq({ ...req, format: e.target.value })}>
                <option value="either">Either</option>
                <option value="telehealth">Video (telehealth)</option>
                <option value="in-person">In person</option>
              </select>
            </label>
            <label>
              Language
              <select value={req.language} onChange={(e) => setReq({ ...req, language: e.target.value })}>
                {LANGUAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
          </div>
          <button className="btn btn-primary" disabled={!req.concerns.length} onClick={() => setStep('pick')}>
            See {results.length} matching counselor{results.length === 1 ? '' : 's'}
          </button>
        </section>
      )}

      {step === 'pick' && (
        <section>
          <button className="link" onClick={() => setStep('form')}>← Change what you need</button>
          {!results.length && <p className="card">No counselors match all of those choices. Try "Any" insurance or "Either" format.</p>}
          <div className="counselor-list">
            {results.map(({ counselor: c, matched, openings }) => {
              const isChosen = chosen?.id === c.id;
              return (
                <article key={c.id} className={isChosen ? 'card counselor chosen' : 'card counselor'}>
                  <div className="counselor-head">
                    <div>
                      <h3>{c.name}</h3>
                      <p className="muted small">{c.credentials} · {c.formats.map((f) => (f === 'telehealth' ? 'Video' : 'In person')).join(' or ')} · {c.languages.join(', ')}</p>
                    </div>
                    <button className={isChosen ? 'btn btn-small' : 'btn btn-small btn-primary'} onClick={() => { setChosen(isChosen ? null : c); setTimes([]); }}>
                      {isChosen ? 'Selected' : 'Choose'}
                    </button>
                  </div>
                  <p className="small">{c.approach}</p>
                  <p className="small">
                    Helps with: {c.specialties.map((s) => (
                      <span key={s} className={matched.includes(s) ? 'chip chip-shared' : 'chip'}>{matched.includes(s) && '✓ '}{topicLabel(s)}</span>
                    ))}
                  </p>
                  {isChosen && (
                    <div className="openings">
                      <p className="small"><strong>Pick times that could work for a first consult</strong> (optional):</p>
                      <div className="chips">
                        {openings.map((o) => (
                          <button key={o} type="button" className={times.includes(o) ? 'chip-toggle on' : 'chip-toggle'} aria-pressed={times.includes(o)} onClick={() => setTimes(toggle(times, o))}>
                            {fmtDayTime(o)}
                          </button>
                        ))}
                      </div>
                      <label className="small">
                        Anything you'd like the coordinator to know? (optional)
                        <textarea rows={2} value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. evenings are best, I'd prefer a counselor who has worked with caregivers" />
                      </label>
                      <ErrorNote error={err} />
                      <button className="btn btn-primary" onClick={submit}>Request a consult</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {step === 'done' && created && (
        <section className="card done-card">
          <h2>Your request is in</h2>
          <p>
            A coordinator will reach out to <strong>{byId[created.counselorId]?.name}</strong>'s office, usually within one business day, and
            let you know when your first consult is booked. You can follow along below.
          </p>
          <button className="btn" onClick={() => { setStep('form'); setChosen(null); setCreated(null); }}>Done</button>
        </section>
      )}

      <section className="section">
        <h2>Your requests</h2>
        {!data.referrals.length ? (
          <p className="muted">No requests yet.</p>
        ) : (
          <ul className="request-list">
            {data.referrals.map((r) => {
              const idx = REFERRAL_STATUSES.findIndex((s) => s.key === r.status);
              return (
                <li key={r.id} className="card">
                  <div className="request-head">
                    <strong>{byId[r.counselorId]?.name}</strong>
                    <span className="muted small">{r.concerns.map(topicLabel).join(', ')}</span>
                  </div>
                  <ol className="progress-steps">
                    {REFERRAL_STATUSES.map((s, i) => (
                      <li key={s.key} className={i < idx ? 'done' : i === idx ? 'current' : ''}>
                        <span aria-hidden="true">{i <= idx ? '●' : '○'}</span> {s.label}
                      </li>
                    ))}
                  </ol>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
