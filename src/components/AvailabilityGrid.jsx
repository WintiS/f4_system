import { useEffect, useMemo, useRef, useState } from 'react'
import { useSchool } from '../context/SchoolStore'
import { weekStart, addDays, todayStr, fromDateStr, monthLabel, isoWeek } from '../lib/time'

const WINDOW_DAYS = 56 // eight weeks visible at a time
const WD = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']

// Availability squares. Green = tentative (instructor offered), yellow =
// confirmed (admin locked it in). Emerald/amber are the app's semantic palette.
const CELL = {
  none: 'bg-white hover:bg-slate-100',
  tentative: 'bg-emerald-400 hover:bg-emerald-500',
  confirmed: 'bg-amber-300 hover:bg-amber-400',
}
// Left-click cycles empty -> tentative -> confirmed -> empty.
const NEXT = { none: 'tentative', tentative: 'confirmed', confirmed: null }

const isWeekend = (dateStr) => {
  const g = fromDateStr(dateStr).getDay()
  return g === 0 || g === 6
}

export default function AvailabilityGrid() {
  const {
    instructors,
    availability,
    availabilityCountsByDate,
    setAvailabilityCell,
    paintAvailability,
  } = useSchool()

  const today = todayStr()
  const [start, setStart] = useState(() => weekStart(today))
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState('name') // 'name' | 'avail'
  const [hideEmpty, setHideEmpty] = useState(false)

  const days = useMemo(
    () => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(start, i)),
    [start],
  )

  // Fast status lookup: "instructorId:date" -> 'tentative' | 'confirmed'.
  const index = useMemo(() => {
    const m = new Map()
    for (const a of availability) m.set(`${a.instructorId}:${a.date}`, a.status)
    return m
  }, [availability])
  const statusOf = (id, date) => index.get(`${id}:${date}`) ?? 'none'

  // Available today? (offered or confirmed) — drives the name highlight.
  const availToday = (id) => statusOf(id, today) !== 'none'

  // # of days an instructor is available within the visible window.
  const availCount = (id) => days.reduce((n, d) => n + (index.has(`${id}:${d}`) ? 1 : 0), 0)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = instructors
    if (needle) list = list.filter((i) => i.name.toLowerCase().includes(needle))
    if (hideEmpty) list = list.filter((i) => availCount(i.id) > 0)
    const sorted = [...list]
    if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'cs'))
    else sorted.sort((a, b) => availCount(b.id) - availCount(a.id) || a.name.localeCompare(b.name, 'cs'))
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructors, q, hideEmpty, sortBy, index, days])

  // Total tentative offers in the window awaiting a decision.
  const pendingTotal = useMemo(
    () => rows.reduce((n, i) => n + days.filter((d) => statusOf(i.id, d) === 'tentative').length, 0),
    [rows, days, index],
  )

  /* ---- Drag-to-paint ---- */
  // A drag paints one status across the cells it touches (all in one row). The
  // start cell's *next* status is what gets painted, so a plain click still
  // three-state cycles, and a drag repeats that choice down the row.
  const drag = useRef(null) // { instructorId, status, cells: Set<date> }
  const [dragTick, setDragTick] = useState(0) // re-render during a drag

  const beginDrag = (instructorId, date) => {
    const status = NEXT[statusOf(instructorId, date)]
    drag.current = { instructorId, status, cells: new Set([date]) }
    setDragTick((t) => t + 1)
  }
  const extendDrag = (instructorId, date) => {
    const d = drag.current
    if (!d || d.instructorId !== instructorId) return
    if (!d.cells.has(date)) {
      d.cells.add(date)
      setDragTick((t) => t + 1)
    }
  }
  useEffect(() => {
    const up = () => {
      const d = drag.current
      drag.current = null
      if (!d) return
      const cells = [...d.cells].map((date) => ({ instructorId: d.instructorId, date }))
      if (cells.length === 1) setAvailabilityCell(d.instructorId, cells[0].date, d.status)
      else paintAvailability(cells, d.status)
      setDragTick((t) => t + 1)
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [setAvailabilityCell, paintAvailability])

  // Effective status of a cell, factoring in the in-progress drag preview.
  const shownStatus = (id, date) => {
    const d = drag.current
    if (d && d.instructorId === id && d.cells.has(date)) return d.status ?? 'none'
    return statusOf(id, date)
  }

  // Confirm every tentative offer on a given day (visible instructors).
  const confirmDay = (date) => {
    const cells = rows
      .filter((i) => statusOf(i.id, date) === 'tentative')
      .map((i) => ({ instructorId: i.id, date }))
    if (cells.length) paintAvailability(cells, 'confirmed')
  }

  // Contiguous month / ISO-week header bands (label + column span).
  const bands = (labeler) => {
    const out = []
    for (const d of days) {
      const label = labeler(d)
      const last = out[out.length - 1]
      if (last && last.label === label) last.span += 1
      else out.push({ label, span: 1 })
    }
    return out
  }
  const monthBands = useMemo(() => bands(monthLabel), [days])
  const weekBands = useMemo(() => bands((d) => `týden ${isoWeek(d)}`), [days])

  const COL = 40 // px per day column
  const NAME_W = 176 // px sticky name column

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="mr-auto">
          <h3 className="text-sm font-semibold text-slate-800">Dostupnost instruktorů</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Klikni do čtverečku: prázdné → <span className="text-emerald-600">zelená (navrženo)</span> →{' '}
            <span className="text-amber-600">žlutá (potvrzeno)</span> → prázdné. Táhni myší přes více dní.
          </p>
        </div>
        {pendingTotal > 0 && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {pendingTotal} čeká na potvrzení
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setStart(addDays(start, -7))}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            aria-label="Předchozí týden"
          >
            ‹
          </button>
          <button
            onClick={() => setStart(weekStart(today))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Dnes
          </button>
          <button
            onClick={() => setStart(addDays(start, 7))}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            aria-label="Další týden"
          >
            ›
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
        <input
          type="text"
          placeholder="Hledat instruktora…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-100"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-600 focus:border-coral-400 focus:outline-none"
        >
          <option value="name">Řadit dle jména</option>
          <option value="avail">Řadit dle dostupnosti</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="accent-coral-500"
          />
          Skrýt bez dostupnosti
        </label>
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <Legend swatch="bg-emerald-400" label="navrženo" />
          <Legend swatch="bg-amber-300" label="potvrzeno" />
          <span className="inline-flex items-center gap-1">
            <span className="rounded bg-wingteal-500 px-1 text-[10px] font-bold text-white">W</span>
            wing
          </span>
        </div>
      </div>

      {/* grid */}
      <div className="overflow-x-auto">
        <div style={{ width: NAME_W + days.length * COL }} className="select-none text-xs">
          {/* month band */}
          <Row nameW={NAME_W}>
            <div style={{ width: NAME_W }} className="sticky left-0 z-10 bg-white" />
            {monthBands.map((b, i) => (
              <div
                key={i}
                style={{ width: b.span * COL }}
                className="border-l border-slate-100 py-1 text-center font-semibold text-slate-500"
              >
                {b.label}
              </div>
            ))}
          </Row>
          {/* week band */}
          <Row nameW={NAME_W}>
            <div style={{ width: NAME_W }} className="sticky left-0 z-10 bg-white" />
            {weekBands.map((b, i) => (
              <div
                key={i}
                style={{ width: b.span * COL }}
                className="border-l border-slate-100 py-1 text-center text-[11px] font-medium text-slate-400"
              >
                {b.label}
              </div>
            ))}
          </Row>
          {/* day numbers */}
          <Row nameW={NAME_W}>
            <div
              style={{ width: NAME_W }}
              className="sticky left-0 z-10 flex items-center bg-white px-3 font-semibold text-slate-600"
            >
              Instruktoři
            </div>
            {days.map((d) => {
              const dd = fromDateStr(d)
              const wknd = isWeekend(d)
              const isToday = d === today
              return (
                <div
                  key={d}
                  style={{ width: COL }}
                  className={`py-1 text-center leading-tight ${wknd ? 'bg-slate-50' : ''} ${
                    isToday ? 'bg-coral-50 font-bold text-coral-600' : 'text-slate-500'
                  }`}
                >
                  <div className="text-[10px] uppercase">{WD[dd.getDay()]}</div>
                  <div className="text-[13px]">{dd.getDate()}</div>
                </div>
              )
            })}
          </Row>
          {/* capacity heat row */}
          <Row nameW={NAME_W}>
            <div
              style={{ width: NAME_W }}
              className="sticky left-0 z-10 flex items-center bg-white px-3 font-medium text-slate-500"
            >
              K dispozici
            </div>
            {days.map((d) => {
              const c = availabilityCountsByDate(d)
              const heat =
                c.confirmed === 0
                  ? 'bg-rose-50 text-rose-600'
                  : c.confirmed <= 2
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
              return (
                <div
                  key={d}
                  style={{ width: COL }}
                  className={`group relative border-l border-slate-100 py-1 text-center ${heat}`}
                  title={`${c.confirmed} potvrzeno · ${c.tentative} navrženo · ${c.wing} wing`}
                >
                  <div className="text-[13px] font-bold leading-none">{c.confirmed}</div>
                  {c.tentative > 0 && (
                    <div className="text-[9px] font-semibold text-emerald-600">+{c.tentative}</div>
                  )}
                  {c.tentative > 0 && (
                    <button
                      onClick={() => confirmDay(d)}
                      title="Potvrdit všechny navržené v tento den"
                      className="absolute inset-x-0 -bottom-0.5 mx-auto hidden text-[9px] font-bold text-emerald-700 group-hover:block"
                    >
                      ✓ vše
                    </button>
                  )}
                </div>
              )
            })}
          </Row>

          {/* instructor rows */}
          {rows.map((i) => (
            <Row key={i.id} nameW={NAME_W} className="border-t border-slate-100">
              <div
                style={{ width: NAME_W }}
                className="sticky left-0 z-10 flex items-center gap-1.5 bg-white px-3 py-1.5"
              >
                <span
                  title={availToday(i.id) ? 'Dnes k dispozici' : undefined}
                  className={`min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-[13px] font-medium ${
                    availToday(i.id) ? 'bg-amber-200 text-amber-900' : 'text-slate-700'
                  }`}
                >
                  {i.name}
                </span>
                {i.teachesWing && (
                  <span
                    title="Učí i wing"
                    className="shrink-0 rounded bg-wingteal-500 px-1 text-[10px] font-bold text-white"
                  >
                    W
                  </span>
                )}
              </div>
              {days.map((d) => {
                const st = shownStatus(i.id, d)
                const wknd = isWeekend(d)
                return (
                  <div
                    key={d}
                    style={{ width: COL }}
                    className={`border-l border-slate-100 ${wknd ? 'bg-slate-50/60' : ''}`}
                  >
                    <button
                      onMouseDown={() => beginDrag(i.id, d)}
                      onMouseEnter={() => extendDrag(i.id, d)}
                      className={`h-7 w-full border border-transparent transition-colors ${CELL[st]}`}
                      aria-label={`${i.name} ${d}: ${st}`}
                    />
                  </div>
                )
              })}
            </Row>
          ))}

          {rows.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Žádní instruktoři neodpovídají filtru.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ children, nameW, className = '' }) {
  return <div className={`flex items-stretch ${className}`}>{children}</div>
}

function Legend({ swatch, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-3 w-3 rounded-sm ${swatch}`} />
      {label}
    </span>
  )
}
