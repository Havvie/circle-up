import React, { useState } from 'react';
import { api } from '../api/index.js';
import { ErrorNote } from '../components/ui.jsx';
import { Logo } from '../App.jsx';

const FEATURES = [
  { title: 'Find your people', text: 'Get matched with peers who chose the same experiences, from caregiving to career change, and who are free when you are.' },
  { title: 'Join a circle', text: 'Small group sessions led by trained volunteer facilitators. Save a seat in a click.' },
  { title: 'Talk it through', text: 'Private one-on-one and group chat, with report and block built in.' },
  { title: 'Get professional help', text: 'When peer support is not enough, request a consult with a licensed counselor who fits your needs and insurance.' },
];

export default function Welcome({ onSignedIn }) {
  return (
    <main className="welcome">
      <section className="hero">
        <div className="hero-brand">
          <Logo />
          <span>Circle Up</span>
        </div>
        <h1>Support from people who have been there.</h1>
        <p className="lead">
          Circle Up connects people going through similar things for peer support, in small groups and one-on-one, and makes it easy to
          reach a licensed counselor when you need more.
        </p>
        <ul className="feature-list">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <strong>{f.title}</strong>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="signin card">{api.isDemo ? <DemoChooser onSignedIn={onSignedIn} /> : <SignIn onSignedIn={onSignedIn} />}</section>
    </main>
  );
}

function DemoChooser({ onSignedIn }) {
  const [busy, setBusy] = useState(false);
  const pick = async (id) => {
    setBusy(true);
    onSignedIn(await api.demoLogin(id));
  };
  return (
    <>
      <h2>Try the demo</h2>
      <p className="muted">No sign-up needed. Everyone you'll meet is made up, and anything you do stays in this browser.</p>
      <button className="role-card" onClick={() => pick('u-jordan')} disabled={busy}>
        <span className="role-title">Explore as a member</span>
        <span className="role-text">You're Jordan, caring for a parent while changing careers. Find peers, join circles, chat, and request a counselor.</span>
      </button>
      <button className="role-card" onClick={() => pick('u-sam')} disabled={busy}>
        <span className="role-title">Explore as a coordinator</span>
        <span className="role-text">You're Sam, who runs the program. Staff circles with volunteers, move counselor referrals along, and review safety flags.</span>
      </button>
      <button
        className="link small"
        onClick={async () => {
          await api.resetDemo();
          window.location.reload();
        }}
      >
        Reset demo data
      </button>
    </>
  );
}

function SignIn({ onSignedIn }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const user = mode === 'login' ? await api.login(form.email, form.password) : await api.register(form.displayName, form.email, form.password);
      onSignedIn(user);
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form onSubmit={submit} className="form">
      <h2>{mode === 'login' ? 'Sign in' : 'Create an account'}</h2>
      {mode === 'register' && (
        <label>
          Display name <span className="muted small">(first name or a nickname is fine)</span>
          <input value={form.displayName} onChange={set('displayName')} required maxLength={40} autoComplete="nickname" />
        </label>
      )}
      <label>
        Email
        <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
      </label>
      <label>
        Password
        <input type="password" value={form.password} onChange={set('password')} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      </label>
      <ErrorNote error={error} />
      <button className="btn btn-primary" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}
