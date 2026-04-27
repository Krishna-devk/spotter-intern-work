import React from 'react';

const STATUS_ROWS = ['Off Duty', 'Sleeper Berth', 'Driving', 'On Duty (Not Driving)'];

const STATUS_COLOR = {
  'Driving':               '#3b82f6',
  'Off Duty':              '#6b7280',
  'On Duty (Not Driving)': '#f59e0b',
  'Sleeper Berth':         '#8b5cf6',
};

const STATUS_BADGE = {
  'Driving':               'bg-blue-900 text-blue-200',
  'Off Duty':              'bg-gray-700 text-gray-200',
  'On Duty (Not Driving)': 'bg-amber-900 text-amber-200',
  'Sleeper Berth':         'bg-purple-900 text-purple-200',
};

const pad = n => String(n).padStart(2, '0');

const fmtTime = (mins) => {
  const totalMins = Math.round(mins);
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${pad(h)}:${pad(m)}`;
};

const fmtDur = (mins) =>
  mins >= 60 ? `${(mins / 60).toFixed(2)} hr` : `${Math.round(mins)} min`;

// Build today's real date offset by day index
const getDate = (dayIndex) => {
  const d = new Date();
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const EldLogbook = ({ events, totalMiles, unit = 'miles' }) => {
  if (!events || events.length === 0) return null;

  const unitLabel = unit === 'miles' ? 'mi' : 'km';
  const distFactor = unit === 'miles' ? 1 : 1.60934;

  // Group events into 1440-minute (24-hour) days
  const days = [];
  events.forEach(ev => {
    let start = ev.start_time;
    const end   = ev.end_time;
    while (start < end) {
      const dayIdx  = Math.floor(start / 1440);
      if (!days[dayIdx]) days[dayIdx] = [];
      const dayEnd  = (dayIdx + 1) * 1440;
      const chunkEnd = Math.min(end, dayEnd);
      days[dayIdx].push({
        ...ev,
        start_time: start - dayIdx * 1440,
        end_time:   chunkEnd - dayIdx * 1440,
        duration:   chunkEnd - start,
      });
      start = chunkEnd;
    }
  });

  return (
    <div className="flex flex-col gap-10">
      <h2 className="text-2xl font-extrabold text-white">ELD Daily Log Sheets</h2>

      {days.map((dayEvents, dayIdx) => {
        const driveToday = dayEvents
          .filter(e => e.status === 'Driving')
          .reduce((s, e) => s + e.duration, 0);
        const onDutyToday = dayEvents.reduce((s, e) => s + e.duration, 0);
        const milesApprox = ((driveToday / (events.reduce((s,e)=>e.status==='Driving'?s+e.duration:s,0)||1)) * totalMiles * distFactor).toFixed(1);

        return (
          <div
            key={dayIdx}
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
          >
            {/* ── RODS Form Header ─────────────────────────────────────── */}
            <div className="px-6 py-4" style={{ background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black tracking-[0.2em] text-blue-400 uppercase">U.S. DOT · Driver's Daily Log</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Original – submit within 13 days</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {[
                  { label: 'Date',               value: getDate(dayIdx) },
                  { label: `${unitLabel.toUpperCase()} DRIVEN TODAY`, value: `${milesApprox} ${unitLabel}` },
                  { label: 'Total On-Duty Hours', value: fmtDur(onDutyToday) },
                  { label: 'Driving Hours Today', value: fmtDur(driveToday) },
                  { label: 'Driver Name',         value: '________________________' },
                  { label: 'Name of Carrier',     value: '________________________' },
                  { label: 'Main Office Address', value: '________________________' },
                  { label: 'Truck / Tractor #',  value: '________________________' },
                  { label: 'Co-Driver',           value: '________________________' },
                  { label: 'Shipping Doc #',      value: '________________________' },
                  { label: '24-hr Period Starts', value: '12:00 AM (Midnight)' },
                  { label: 'Signature',           value: 'I certify these entries are true and correct' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="text-white text-xs font-medium truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Graph Grid ───────────────────────────────────────────── */}
            <div className="px-6 py-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="relative" style={{ paddingLeft: 140 }}>

                {/* Hours ruler */}
                <div className="relative h-6 mb-1">
                  {[0,2,4,6,8,10,12,14,16,18,20,22,24].map(h => (
                    <span
                      key={h}
                      className="absolute text-xs font-mono text-gray-400 transform -translate-x-1/2"
                      style={{ left: `${(h / 24) * 100}%`, top: 0 }}
                    >
                      {h === 0 ? 'M' : h === 12 ? 'N' : h === 24 ? 'M' : h}
                    </span>
                  ))}
                </div>

                {/* Grid body */}
                <div
                  className="relative border border-gray-600"
                  style={{
                    height: 160,
                    backgroundImage:
                      'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),' +
                      'linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
                    backgroundSize: `${100 / 24}% 40px`,
                  }}
                >
                  {/* Row labels */}
                  <div className="absolute top-0 h-full flex flex-col" style={{ left: -140, width: 134 }}>
                    {STATUS_ROWS.map((row, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-end pr-2 text-xs font-semibold border-b border-gray-700 last:border-0"
                        style={{ height: 40, color: STATUS_COLOR[row] || '#9ca3af' }}
                      >
                        {row}
                      </div>
                    ))}
                  </div>

                  {/* SVG lines */}
                  <svg
                    className="absolute inset-0 w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    {(() => {
                      const els = [];
                      let prevX = null, prevY = null;
                      dayEvents.forEach((ev, i) => {
                        const x1 = (ev.start_time / 1440) * 100;
                        const x2 = (ev.end_time   / 1440) * 100;
                        const rowIdx = STATUS_ROWS.indexOf(ev.status);
                        if (rowIdx < 0) return;
                        const y  = rowIdx * 40 + 20;
                        const c  = STATUS_COLOR[ev.status] || '#9ca3af';

                        if (prevY !== null && prevY !== y) {
                          els.push(<line key={`v${i}`} x1={`${x1}%`} y1={prevY} x2={`${x1}%`} y2={y} stroke={c} strokeWidth="2.5" />);
                        }
                        els.push(<line key={`h${i}`} x1={`${x1}%`} y1={y} x2={`${x2}%`} y2={y} stroke={c} strokeWidth="3" strokeLinecap="round" />);
                        els.push(<circle key={`c${i}`} cx={`${x1}%`} cy={y} r="3.5" fill={c} />);
                        prevX = x2; prevY = y;
                      });
                      if (prevX !== null) {
                        els.push(<circle key="cend" cx={`${prevX}%`} cy={prevY} r="3.5" fill={STATUS_COLOR[dayEvents[dayEvents.length-1]?.status] || '#9ca3af'} />);
                      }
                      return els;
                    })()}
                  </svg>
                </div>

                {/* Half-hour tick marks below grid */}
                <div className="relative h-3 mt-0.5">
                  {[...Array(49)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute border-l"
                      style={{
                        left:   `${(i / 48) * 100}%`,
                        top:    0,
                        height: i % 2 === 0 ? 10 : 6,
                        borderColor: 'rgba(255,255,255,0.2)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4">
                {STATUS_ROWS.map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className="w-4 h-1 rounded" style={{ background: STATUS_COLOR[s] }} />
                    <span className="text-xs text-gray-400">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Remarks / Event Table ────────────────────────────────── */}
            <div className="px-6 pb-6">
              <h3 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wide">Remarks / Event Log</h3>
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <table className="min-w-full text-xs">
                  <thead style={{ background: 'rgba(15,23,42,0.6)' }}>
                    <tr>
                      {['Start', 'End', 'Duration', 'Status', 'Event'].map(col => (
                        <th key={col} className="py-2 px-3 text-left font-semibold text-gray-400">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dayEvents.map((ev, i) => (
                      <tr
                        key={i}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                        className="hover:bg-white hover:bg-opacity-5 transition-colors"
                      >
                        <td className="py-2 px-3 font-mono text-gray-300">{fmtTime(ev.start_time)}</td>
                        <td className="py-2 px-3 font-mono text-gray-300">{fmtTime(ev.end_time)}</td>
                        <td className="py-2 px-3 text-gray-300">{fmtDur(ev.duration)}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[ev.status] || 'bg-gray-700 text-gray-300'}`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-white">{ev.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Total hours footer */}
              <div className="flex justify-end mt-3 gap-6 text-xs text-gray-400">
                {STATUS_ROWS.map(s => {
                  const total = dayEvents.filter(e=>e.status===s).reduce((a,e)=>a+e.duration,0);
                  if (!total) return null;
                  return (
                    <span key={s}>
                      <span style={{ color: STATUS_COLOR[s] }}>{s}:</span>{' '}
                      <strong className="text-gray-200">{fmtDur(total)}</strong>
                    </span>
                  );
                })}
                <span>
                  <span className="text-gray-500">Total:</span>{' '}
                  <strong className="text-gray-200">
                    {fmtDur(dayEvents.reduce((a,e)=>a+e.duration,0))}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EldLogbook;
