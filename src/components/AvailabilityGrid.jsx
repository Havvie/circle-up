import React from 'react';
import { DAYS, DAY_NAMES, PARTS, PART_NAMES } from '../../shared/constants.js';

export default function AvailabilityGrid({ value, onChange }) {
  const set = new Set(value);
  const toggle = (slot) => {
    const next = new Set(set);
    if (next.has(slot)) next.delete(slot);
    else next.add(slot);
    onChange([...next]);
  };
  return (
    <div className="avail" role="group" aria-label="When you're usually free">
      <div />
      {DAYS.map((d) => (
        <div key={d} className="avail-day">{DAY_NAMES[d]}</div>
      ))}
      {PARTS.map((p) => (
        <React.Fragment key={p}>
          <div className="avail-part">{PART_NAMES[p]}</div>
          {DAYS.map((d) => {
            const slot = `${d}-${p}`;
            const on = set.has(slot);
            return (
              <button
                type="button"
                key={slot}
                className={on ? 'avail-cell on' : 'avail-cell'}
                aria-pressed={on}
                aria-label={`${DAY_NAMES[d]} ${PART_NAMES[p].toLowerCase()}`}
                onClick={() => toggle(slot)}
              >
                {on ? '✓' : ''}
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
