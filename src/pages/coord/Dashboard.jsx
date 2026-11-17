import React from 'react';
import { useOverview } from './useOverview.js';
import { coverageReport } from '../../../shared/scheduling.js';
import { daysOpen } from '../../../shared/referrals.js';
import { fmtAgo, fmtDayTime } from '../../lib/format.js';
import { Loading } from '../../components/ui.jsx';

export default function Dashboard() {
  const { data, loading } = useOverview();
  if (loading || !data) return <Loading />;
  const cov = coverageReport(data.circles, data.volunteers);
  const openRefs = data.referrals.filter((r) => r.status !== 'closed');
  const stale = openRefs.filter((r) => r.status === 'requested' && daysOpen(r) >= 2);
  const openReports = data.reports.filter((r) => r.status === 'open');
  const crisis = openReports.filter((r) => r.kind === 'crisis');

  const tiles = [
    { label: 'Members', value: data.stats.members, foot: `${data.stats.volunteers} trained volunteers` },
    { label: 'Circles in the next 7 days', value: cov.total, foot: `${Math.round(cov.fillRate * 100)}% of seats filled` },
    { label: 'Circles without a facilitator', value: cov.needsFacilitator, foot: 'next 7 days', status: cov.needsFacilitator ? 'warning' : 'good', href: '#/coord/coverage' },
    { label: 'Open counselor referrals', value: openRefs.length, foot: stale.length ? `${stale.length} waiting 2+ days` : 'none waiting long', status: stale.length ? 'warning' : 'good', href: '#/coord/referrals' },
    { label: 'Open safety flags', value: openReports.length, foot: crisis.length ? `${crisis.length} crisis` : 'none urgent', status: crisis.length ? 'critical' : openReports.length ? 'warning' : 'good', href: '#/coord/safety' },
  ];

  const todo = [
    ...crisis.map((r) => ({ key: r.id, level: 'critical', text: `Check in with ${r.sender?.displayName ?? 'a member'}: crisis language in a message ${fmtAgo(r.createdAt)}.`, href: '#/coord/safety' })),
    ...cov.rows.filter((r) => !r.covered).map((r) => ({
      key: r.circle.id,
      level: 'warning',
      text: `${r.circle.title} (${fmtDayTime(r.circle.startsAt)}) needs a facilitator. ${r.candidates.length ? `${r.candidates.length} volunteer${r.candidates.length > 1 ? 's' : ''} available.` : 'No trained volunteer is free.'}`,
      href: '#/coord/coverage',
    })),
    ...stale.map((r) => ({ key: r.id, level: 'warning', text: `${data.people[r.memberId]?.displayName}'s counselor request has waited ${daysOpen(r)} days.`, href: '#/coord/referrals' })),
  ];

  return (
    <div>
      <h1>Program overview</h1>
      <p className="lead muted">What needs attention this week.</p>
      <div className="tiles">
        {tiles.map((t) => {
          const Tag = t.href ? 'a' : 'div';
          return (
            <Tag key={t.label} className="tile card" href={t.href}>
              <span className="tile-label">{t.label}</span>
              <span className="tile-value">{t.value}</span>
              <span className={`tile-foot ${t.status ? `status-${t.status}` : 'muted'}`}>
                {t.status && <span className="dot" aria-hidden="true">{t.status === 'good' ? '✓' : '!'}</span>}
                {t.foot}
              </span>
            </Tag>
          );
        })}
      </div>

      <div className="two-col">
        <section className="card">
          <h2>To do</h2>
          {todo.length ? (
            <ul className="todo">
              {todo.map((t) => (
                <li key={t.key} className={`todo-${t.level}`}>
                  <span className="todo-icon" aria-hidden="true">{t.level === 'critical' ? '✕' : '!'}</span>
                  <span>{t.text}</span>
                  <a href={t.href} className="small">Open</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">All caught up.</p>
          )}
        </section>
        <section className="card">
          <h2>This week's circles</h2>
          <ul className="week-list">
            {cov.rows.map((r) => (
              <li key={r.circle.id}>
                <span className="week-time">{fmtDayTime(r.circle.startsAt)}</span>
                <span className="week-title">{r.circle.title}</span>
                <span className="small muted">{r.seatsFilled}/{r.circle.capacity}</span>
                {r.covered ? <span className="status-good small">✓ Staffed</span> : <span className="status-warning small">! Needs facilitator</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
