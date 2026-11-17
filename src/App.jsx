import React, { useEffect, useState } from 'react';
import { api } from './api/index.js';
import { useRoute } from './lib/router.js';
import { CrisisBar, Loading } from './components/ui.jsx';
import Welcome from './pages/Welcome.jsx';
import Home from './pages/Home.jsx';
import Peers from './pages/Peers.jsx';
import Circles from './pages/Circles.jsx';
import Messages from './pages/Messages.jsx';
import GetHelp from './pages/GetHelp.jsx';
import Profile from './pages/Profile.jsx';
import CoordDashboard from './pages/coord/Dashboard.jsx';
import Coverage from './pages/coord/Coverage.jsx';
import Referrals from './pages/coord/Referrals.jsx';
import SafetyQueue from './pages/coord/SafetyQueue.jsx';

const MEMBER_NAV = [
  { to: 'home', label: 'Home' },
  { to: 'peers', label: 'Find peers' },
  { to: 'circles', label: 'Circles' },
  { to: 'messages', label: 'Messages' },
  { to: 'help', label: 'Get help' },
];
const COORD_NAV = [
  { to: 'coord', label: 'Overview' },
  { to: 'coord/coverage', label: 'Circle coverage' },
  { to: 'coord/referrals', label: 'Referrals' },
  { to: 'coord/safety', label: 'Safety queue' },
];

export default function App() {
  const [user, setUser] = useState(undefined);
  const path = useRoute();

  useEffect(() => {
    api.session().then(setUser);
  }, []);

  const signOut = async () => {
    await api.logout();
    setUser(null);
    window.location.hash = '';
  };

  if (user === undefined) {
    return (
      <>
        <CrisisBar />
        <main className="page"><Loading /></main>
      </>
    );
  }
  if (!user) {
    return (
      <>
        <CrisisBar />
        <Welcome
          onSignedIn={(u) => {
            setUser(u);
            window.location.hash = u.role === 'coordinator' ? '#/coord' : '#/home';
          }}
        />
        <Footer />
      </>
    );
  }

  const isCoord = user.role === 'coordinator';
  const nav = isCoord ? COORD_NAV : MEMBER_NAV;
  const route = path.join('/') || (isCoord ? 'coord' : 'home');
  const active = nav.filter((n) => route === n.to || route.startsWith(`${n.to}/`)).sort((a, b) => b.to.length - a.to.length)[0]?.to;

  let page;
  if (isCoord) {
    if (route === 'coord/coverage') page = <Coverage />;
    else if (route === 'coord/referrals') page = <Referrals />;
    else if (route === 'coord/safety') page = <SafetyQueue />;
    else page = <CoordDashboard />;
  } else if (path[0] === 'peers') page = <Peers />;
  else if (path[0] === 'circles') page = <Circles user={user} />;
  else if (path[0] === 'messages') page = <Messages user={user} conversationId={path[1]} />;
  else if (path[0] === 'help') page = <GetHelp user={user} />;
  else if (path[0] === 'profile') page = <Profile user={user} onSaved={setUser} />;
  else page = <Home user={user} />;

  return (
    <>
      <CrisisBar />
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href={isCoord ? '#/coord' : '#/home'}>
            <Logo />
            <span>Circle Up</span>
          </a>
          <nav className="nav" aria-label="Main">
            {nav.map((n) => (
              <a key={n.to} href={`#/${n.to}`} className={active === n.to ? 'nav-link active' : 'nav-link'} aria-current={active === n.to ? 'page' : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="account">
            {!isCoord && (
              <a href="#/profile" className={route === 'profile' ? 'nav-link active' : 'nav-link'}>
                {user.displayName}
              </a>
            )}
            {isCoord && <span className="muted small">{user.displayName} · Coordinator</span>}
            <button className="btn btn-small btn-ghost" onClick={signOut}>
              {api.isDemo ? 'Switch view' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>
      <main className="page">{page}</main>
      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>
        <strong>Circle Up is peer support, not therapy or emergency care.</strong> Peers and facilitators share lived experience; they are not
        clinicians. If you or someone you know is in crisis, call or text 988, or call 911 in an emergency.
      </p>
      <p className="muted">
        {api.isDemo && 'Portfolio demo: every person, counselor and message here is made up, and your changes stay in this browser. '}
        Built by Hav · <a href="https://github.com/Havvie/circle-up">Source on GitHub</a>
      </p>
    </footer>
  );
}

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="logo" aria-hidden="true">
      <circle cx="16" cy="16" r="15" className="logo-bg" />
      <circle cx="12.5" cy="16" r="6" className="logo-line" />
      <circle cx="19.5" cy="16" r="6" className="logo-line" />
    </svg>
  );
}
