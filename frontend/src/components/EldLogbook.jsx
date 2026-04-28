import React from 'react';
import html2canvas from 'html2canvas';

const STATUS_ROWS = ['Off Duty', 'Sleeper Berth', 'Driving', 'On Duty (not driving)'];

const normalizeStatus = (s) => {
  if (s === 'On Duty (Not Driving)') return 'On Duty (not driving)';
  return s;
};

const ROW_H = 32;
const GRID_H = ROW_H * STATUS_ROWS.length;

const pad = n => String(n).padStart(2, '0');

const fmtTime12 = (mins) => {
  const totalMins = Math.round(mins) % 1440;
  const h24 = Math.floor(totalMins / 60);
  const m   = totalMins % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12  = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${pad(m)} ${ampm}`;
};

const fmtHours = (mins) => (mins / 60).toFixed(2);

const getDateSplit = (dayIndex) => {
  const d = new Date();
  d.setDate(d.getDate() + dayIndex);
  return {
    month: pad(d.getMonth() + 1),
    day:   pad(d.getDate()),
    year:  String(d.getFullYear()),
  };
};

const GraphGrid = ({ dayEvents }) => {
  const totalW = 960;

  const ticks = [];
  for (let row = 0; row < STATUS_ROWS.length; row++) {
    const rowTop = row * ROW_H;
    for (let i = 0; i <= 96; i++) {       
      const x = (i / 96) * totalW;
      const isHour  = i % 4 === 0;
      const isHalf  = i % 2 === 0 && !isHour;
      const tickH   = isHour ? ROW_H : isHalf ? ROW_H * 0.5 : ROW_H * 0.25;

      ticks.push(
        <line
          key={`tt-${row}-${i}`}
          x1={x} y1={rowTop}
          x2={x} y2={rowTop + tickH}
          stroke={isHour ? '#444' : '#aaa'}
          strokeWidth={isHour ? 1.5 : 0.8}
        />
      );
      ticks.push(
        <line
          key={`tb-${row}-${i}`}
          x1={x} y1={rowTop + ROW_H}
          x2={x} y2={rowTop + ROW_H - tickH}
          stroke={isHour ? '#444' : '#aaa'}
          strokeWidth={isHour ? 1.5 : 0.8}
        />
      );
    }
    if (row < STATUS_ROWS.length - 1) {
      ticks.push(
        <line
          key={`rsep-${row}`}
          x1={0} y1={(row + 1) * ROW_H}
          x2={totalW} y2={(row + 1) * ROW_H}
          stroke="#888" strokeWidth={1}
        />
      );
    }
  }

  // Draw status lines
  const lines = [];
  let prevX = null;
  let prevRowIdx = null;

  dayEvents.forEach((ev, i) => {
    const rowIdx = STATUS_ROWS.indexOf(ev.status);
    if (rowIdx < 0) return;

    const x1 = (ev.start_time / 1440) * totalW;
    const x2 = (ev.end_time   / 1440) * totalW;
    const cy  = rowIdx * ROW_H + ROW_H / 2;

    if (prevRowIdx !== null && prevRowIdx !== rowIdx) {
      const prevCy = prevRowIdx * ROW_H + ROW_H / 2;
      lines.push(
        <line
          key={`v${i}`}
          x1={x1} y1={prevCy}
          x2={x1} y2={cy}
          stroke="#000" strokeWidth={2.5}
        />
      );
    }

    // Horizontal line for this period
    lines.push(
      <line
        key={`h${i}`}
        x1={x1} y1={cy}
        x2={x2} y2={cy}
        stroke="#000" strokeWidth={3}
        strokeLinecap="butt"
      />
    );

    prevX = x2;
    prevRowIdx = rowIdx;
  });

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Hour labels above grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(25, 1fr)',
          background: '#000',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          textAlign: 'center',
          padding: '2px 0',
          userSelect: 'none',
        }}
      >
        {['Mid-\nnight',1,2,3,4,5,6,7,8,9,10,11,'Noon',1,2,3,4,5,6,7,8,9,10,11,'Mid-\nnight'].map((h, i) => (
          <span key={i} style={{ whiteSpace: 'pre-line', lineHeight: 1.1 }}>{h}</span>
        ))}
      </div>

      {/* SVG grid */}
      <svg
        viewBox={`0 0 ${totalW} ${GRID_H}`}
        style={{ width: '100%', height: GRID_H, display: 'block', background: '#fff' }}
        preserveAspectRatio="none"
      >
        {/* outer border */}
        <rect x={0} y={0} width={totalW} height={GRID_H} fill="none" stroke="#000" strokeWidth={2} />
        {ticks}
        {lines}
      </svg>
    </div>
  );
};

// ─────────────────────────── main component ────────────────────────────────
const EldLogbook = ({ events, totalMiles, unit = 'miles', locations }) => {
  if (!events || events.length === 0) return null;

  const handleDownload = async (dayIdx) => {
    const element = document.getElementById(`logbook-day-${dayIdx}`);
    if (!element) return;
    try {
      // Capture with a forced "desktop" width even on mobile
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById(`logbook-day-${dayIdx}`);
          if (clonedEl) {
            clonedEl.style.width = '960px';
            clonedEl.style.maxWidth = '960px';
            clonedEl.style.minWidth = '960px';
            // Ensure no responsive scaling or wrapping occurs in the export
            const wrappers = clonedEl.querySelectorAll('[style*="flex-wrap: wrap"]');
            wrappers.forEach(w => {
              w.style.flexWrap = 'nowrap';
            });
          }
        }
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Driver_Daily_Log_Day_${dayIdx + 1}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    }
  };

  const distFactor = unit === 'miles' ? 1 : 1.60934;
  const unitLabel  = unit === 'miles' ? 'mi' : 'km';

  // Normalize statuses and split into days
  const normed = events.map(ev => ({ ...ev, status: normalizeStatus(ev.status) }));

  const days = [];
  normed.forEach(ev => {
    let start = ev.start_time;
    const end = ev.end_time;
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

  // Cumulative on-duty per day (for recap)
  const cumulativeOnDutyByDay = [];
  let running = 0;
  days.forEach((dayEvs) => {
    const todayOnDuty = dayEvs.reduce((s, e) => {
      if (e.status === 'Driving' || e.status === 'On Duty (not driving)') return s + e.duration;
      return s;
    }, 0);
    running += todayOnDuty;
    cumulativeOnDutyByDay.push(running);
  });

  const totalDriveMins = normed.filter(e => e.status === 'Driving').reduce((s, e) => s + e.duration, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center', width: '100%', paddingBottom: 16 }}>
      <h2 style={{ color: 'var(--text-main)', fontSize: 22, fontWeight: 800, alignSelf: 'flex-start' }}>
        ELD Daily Log Sheets
      </h2>

      {days.map((dayEvents, dayIdx) => {
        const date = getDateSplit(dayIdx);

        // Per-day stats
        const driveToday = dayEvents.filter(e => e.status === 'Driving').reduce((s, e) => s + e.duration, 0);
        const milesApprox = ((driveToday / (totalDriveMins || 1)) * totalMiles * distFactor).toFixed(1);

        const hoursPerRow = {};
        STATUS_ROWS.forEach(r => {
          hoursPerRow[r] = dayEvents.filter(e => e.status === r).reduce((s, e) => s + e.duration, 0);
        });
        const totalAccountedMins = Object.values(hoursPerRow).reduce((a, b) => a + b, 0);
        // Off duty fills any unaccounted minutes (should sum to 1440 if we include overnight off)
        const displayedTotal = totalAccountedMins;

        // Recap calculations (cumulative hours for 70hr/8day)
        const cumOnDutyToday = cumulativeOnDutyByDay[dayIdx]; // minutes cumulative
        const last8DaysStart = Math.max(0, dayIdx - 7);
        const last8Days = cumulativeOnDutyByDay[dayIdx] - (last8DaysStart > 0 ? cumulativeOnDutyByDay[last8DaysStart - 1] : 0);
        const avail70    = Math.max(0, 70 * 60 - last8Days);

        const last7DaysStart = Math.max(0, dayIdx - 6);
        const last7Days = cumulativeOnDutyByDay[dayIdx] - (last7DaysStart > 0 ? cumulativeOnDutyByDay[last7DaysStart - 1] : 0);
        const avail60    = Math.max(0, 60 * 60 - last7Days);

        // Remarks: all status changes (every event)
        const remarksEvents = dayEvents.filter((ev, i) => {
          // Show start of each status block
          return true;
        });

        // From / To
        const fromDesc = locations?.current || dayEvents[0]?.description || '—';
        const toDesc   = locations?.dropoff || dayEvents[dayEvents.length - 1]?.description || '—';

        return (
          <div
            id={`logbook-day-${dayIdx}`}
            key={dayIdx}
            style={{
              background: '#fff',
              color: '#000',
              width: '100%',
              maxWidth: 960,
              padding: 'clamp(12px, 4vw, 28px)',
              fontFamily: 'Arial, Helvetica, sans-serif',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              flexShrink: 0,
              borderRadius: 4,
              position: 'relative',
            }}
          >
            {/* Download Button */}
            <button 
              data-html2canvas-ignore
              onClick={() => handleDownload(dayIdx)}
              style={{
                position: 'absolute',
                top: 24,
                right: 28,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              
            </button>

            {/* ─── TITLE ROW ─────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontSize: 'clamp(18px, 5vw, 22px)', fontWeight: 900, letterSpacing: -0.5 }}>Drivers Daily Log</div>
                <div style={{ fontSize: 10, marginTop: 1 }}>(24 hours)</div>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', fontSize: 16, fontWeight: 700 }}>
                  <div style={{ borderBottom: '2px solid #000', minWidth: 36, textAlign: 'center', paddingBottom: 2 }}>{date.month}</div>
                  <span>/</span>
                  <div style={{ borderBottom: '2px solid #000', minWidth: 36, textAlign: 'center', paddingBottom: 2 }}>{date.day}</div>
                  <span>/</span>
                  <div style={{ borderBottom: '2px solid #000', minWidth: 50, textAlign: 'center', paddingBottom: 2 }}>{date.year}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 9, marginTop: 2, justifyContent: 'center', opacity: 0.8 }}>
                  <span>(month)</span><span>(day)</span><span>(year)</span>
                </div>
              </div>
              <div style={{ fontSize: 9, lineHeight: 1.4, opacity: 0.8 }}>
                Original – File at home terminal.<br />
                Duplicate – Driver retains for 8 days.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6, flex: '1 1 200px', alignItems: 'flex-end' }}>
                <span style={{ fontWeight: 700, fontSize: 11 }}>From:</span>
                <div style={{ borderBottom: '2px solid #000', flex: 1, paddingBottom: 2, fontSize: 11 }}>{fromDesc}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flex: '1 1 200px', alignItems: 'flex-end' }}>
                <span style={{ fontWeight: 700, fontSize: 11 }}>To:</span>
                <div style={{ borderBottom: '2px solid #000', flex: 1, paddingBottom: 2, fontSize: 11 }}>{toDesc}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 14 }}>
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                  <div style={{ border: '2px solid #000', flex: 1, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                    {milesApprox} {unitLabel}
                  </div>
                  <div style={{ border: '2px solid #000', flex: 1, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                    {milesApprox} {unitLabel}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 8, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>Total Miles Driving Today</div>
                  <div style={{ flex: 1 }}>Total Mileage Today</div>
                </div>
                <div style={{ border: '2px solid #000', height: 36, marginBottom: 2 }} />
                <div style={{ fontSize: 8, fontWeight: 700, textAlign: 'center' }}>
                  Truck/Tractor and Trailer Numbers or License Plate(s)/State (show each unit)
                </div>
              </div>
              {/* Right column */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                  <div style={{ borderBottom: '2px solid #000', height: 24 }} />
                  <div style={{ fontSize: 8, fontWeight: 700, textAlign: 'center' }}>Name of Carrier or Carriers</div>
                </div>
                <div>
                  <div style={{ borderBottom: '2px solid #000', height: 24 }} />
                  <div style={{ fontSize: 8, fontWeight: 700, textAlign: 'center' }}>Main Office Address</div>
                </div>
                <div>
                  <div style={{ borderBottom: '2px solid #000', height: 24 }} />
                  <div style={{ fontSize: 8, fontWeight: 700, textAlign: 'center' }}>Home Terminal Address</div>
                </div>
              </div>
            </div>

            {/* ─── GRAPH GRID ─────────────────────────────────────── */}
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <div style={{ display: 'flex', border: '3px solid #000', minWidth: 600 }}>
                {/* Row labels */}
                <div style={{ width: 110, flexShrink: 0, borderRight: '3px solid #000', background: '#fff' }}>
                  <div style={{ height: 22, background: '#000' }} /> {/* spacer matching header */}
                  {STATUS_ROWS.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        height: ROW_H,
                        display: 'flex',
                        alignItems: 'center',
                        paddingRight: 6,
                        paddingLeft: 4,
                        fontSize: 9,
                        fontWeight: 700,
                        borderBottom: i < STATUS_ROWS.length - 1 ? '1px solid #888' : 'none',
                        lineHeight: 1.1,
                      }}
                    >
                      {i + 1}. {r}
                    </div>
                  ))}
                </div>

                {/* Grid area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <GraphGrid dayEvents={dayEvents} />
                </div>

                {/* Total Hours column */}
                <div style={{ width: 50, flexShrink: 0, borderLeft: '3px solid #000', background: '#fff' }}>
                  <div style={{ height: 22, background: '#000', color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.1 }}>
                    Total<br />Hours
                  </div>
                  {STATUS_ROWS.map((s, i) => {
                    const mins = hoursPerRow[s] || 0;
                    return (
                      <div
                        key={i}
                        style={{
                          height: ROW_H,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          borderBottom: i < STATUS_ROWS.length - 1 ? '1px solid #888' : 'none',
                        }}
                      >
                        {mins > 0 ? fmtHours(mins) : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── REMARKS ────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              {/* Left block */}
              <div style={{ width: 160, flexShrink: 0, borderLeft: '4px solid #000', paddingLeft: 8 }}>
                <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Remarks</div>
                <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 2 }}>Shipping<br />Documents:</div>
                <div style={{ borderBottom: '2px solid #000', height: 22, marginBottom: 2 }} />
                <div style={{ fontSize: 8, fontWeight: 700, marginBottom: 6 }}>B/L or Manifest No.<br />or</div>
                <div style={{ borderBottom: '2px solid #000', height: 22, marginBottom: 2 }} />
                <div style={{ fontSize: 8, fontWeight: 700 }}>Shipper &amp; Commodity</div>
              </div>

              {/* Right block: remarks text */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 8, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>
                  Enter name of place you reported and where released from work and when and where each change of duty occurred.<br />
                  Use time standard of home terminal.
                </div>
                <div style={{ borderTop: '3px solid #000', paddingTop: 6, flex: 1, columns: window.innerWidth < 640 ? 1 : 2, columnGap: 24, fontSize: 9 }}>
                  {dayEvents.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, breakInside: 'avoid' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap', fontSize: 9 }}>
                        {fmtTime12(ev.start_time)}
                      </span>
                      <span style={{ borderBottom: '1px solid #ccc', flex: 1, fontSize: 9 }}>
                        {ev.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── RECAP ──────────────────────────────────────────── */}
            <div style={{ borderTop: '3px solid #000', paddingTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.4, minWidth: 70 }}>
                Recap:<br />Complete at<br />end of day
              </div>

              {/* On duty today box */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
                <div style={{ border: '2px solid #000', width: '100%', height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, marginBottom: 2 }}>
                  {fmtHours(hoursPerRow['Driving'] + hoursPerRow['On Duty (not driving)'])}
                </div>
                <div style={{ fontSize: 7, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
                  On duty<br />today
                </div>
              </div>

              {/* 70 hr / 8-day */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', minWidth: 48, lineHeight: 1.2 }}>
                  70 Hour/<br />8 Day
                </div>
                {[
                  { label: 'A. Last 7 days', val: fmtHours(last8Days) },
                  { label: 'B. Avail tomorrow',  val: fmtHours(avail70) },
                ].map(({ label, val }, i) => (
                  <div key={i} style={{ minWidth: 54, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ border: '2px solid #000', width: '100%', height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, marginBottom: 2 }}>
                      {val}
                    </div>
                    <div style={{ fontSize: 7, textAlign: 'center', fontWeight: 700, lineHeight: 1.2 }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 8, lineHeight: 1.3, minWidth: 80, marginLeft: 'auto', opacity: 0.7 }}>
                *If you took 34 consecutive hours off duty you have 60/70 hours available
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};

export default EldLogbook;
