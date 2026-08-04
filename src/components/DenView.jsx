import { useEffect, useState } from 'react'
import { useSchool, lessonState, STATE_STYLES } from '../context/SchoolStore'
import {
  DAY_START_MIN,
  DAY_END_MIN,
  toMinutes,
  toHHMM,
  todayStr,
  formatLongDate,
  pluralPeople,
} from '../lib/time'
import { layoutColumns } from '../lib/layout'
import { useWeather, weatherInfo, windColor } from '../lib/weather'

/* Fixed portrait stage — designed at exactly 1080×1920 (school monitor),
   scaled uniformly to fit whatever viewport it runs in. */
const STAGE_W = 1080
const STAGE_H = 1920

const HEADER_H = 240
const DATEBAR_H = 100
const FOOTER_H = 320
const SCHED_H = STAGE_H - HEADER_H - DATEBAR_H - FOOTER_H // 1260

const GUTTER = 130 // time-label column width, px
const PX_PER_MIN = (SCHED_H - 40) / (DAY_END_MIN - DAY_START_MIN)

/** Uniform scale so the 1080×1920 stage fits the real screen. */
function useStageScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () =>
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

/** Live clock, refreshes each minute. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function HeaderStat({ label, value, unit, icon }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="text-xl font-medium uppercase tracking-widest text-sea-600">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2 font-display font-semibold text-white">
        {icon && <span className="text-5xl leading-none">{icon}</span>}
        <span className="text-6xl tabular-nums">{value}</span>
        <span className="text-3xl text-white/60">{unit}</span>
      </div>
    </div>
  )
}

function Header({ weather }) {
  const { loading, error, current, waterTemp } = weather
  const dash = loading ? '··' : error ? '––' : null
  const info = current ? weatherInfo(current.code) : null
  return (
    <div
      className="flex items-center bg-gradient-to-br from-sea-950 via-sea-900 to-sea-800 px-10 text-white"
      style={{ height: HEADER_H }}
    >
      <HeaderStat
        label="Počasí"
        value={dash ?? current.temp}
        unit="°C"
        icon={info?.emoji}
      />
      <div className="h-24 w-px bg-white/10" />
      {/* Water temp via Supabase edge fn (scrapes teplotavody.cz — no direct API). */}
      <HeaderStat
        label="Voda"
        value={waterTemp ?? (loading ? '··' : '––')}
        unit="°C"
        icon="🌊"
      />
      <div className="h-24 w-px bg-white/10" />
      <HeaderStat label="Vítr" value={dash ?? current.wind} unit="m/s" icon="💨" />
    </div>
  )
}

/** Hour (0–23) in Prague for a timestamp. */
function pragueHour(ts) {
  return parseInt(
    new Date(ts).toLocaleString('en-GB', {
      timeZone: 'Europe/Prague',
      hour: '2-digit',
      hour12: false,
    }),
    10,
  )
}

/** Smooth Catmull-Rom path (as cubic béziers) through {x,y} points. */
function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

/** Soft wind-gust curve drawn behind the top block. */
function GustCurve({ gusts }) {
  if (gusts.length < 2) return null
  const n = gusts.length
  const min = Math.min(...gusts)
  const max = Math.max(...gusts)
  const span = max - min || 1
  const y = (g) => 24 + (1 - (g - min) / span) * 46 // -> [24,70] in a 100 box
  const centers = gusts.map((g, i) => ({ x: ((i + 0.5) / n) * 100, y: y(g) }))
  const pts = [{ x: 0, y: centers[0].y }, ...centers, { x: 100, y: centers[n - 1].y }]
  const line = smoothPath(pts)
  const area = `${line} L100,100 L0,100 Z`
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="gustFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5fd0c0" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#8fe0b0" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#gustFill)" />
      <path d={line} fill="none" stroke="#3fae9f" strokeWidth="0.6" strokeOpacity="0.6" />
    </svg>
  )
}

/** Solid wind-direction arrow, pointing where the wind blows TO. */
function WindArrow({ dir }) {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${(dir + 180) % 360}deg)` }}
    >
      <path
        d="M12 3 L18 13 L13.5 13 L13.5 21 L10.5 21 L10.5 13 L6 13 Z"
        fill="#5f7d9c"
      />
    </svg>
  )
}

function Footer({ weather }) {
  const rows = weather.windy
  const n = rows.length
  const cols = `repeat(${n || 8}, 1fr)`

  // continuous horizontal gradient for the gust strip, blended between columns
  const gustGradient =
    n > 0
      ? `linear-gradient(to right, ${rows
          .map((r, i) => `${windColor(r.gust)} ${(((i + 0.5) / n) * 100).toFixed(1)}%`)
          .join(', ')})`
      : 'transparent'

  return (
    <div
      className="flex flex-col border-t border-slate-200 bg-white"
      style={{ height: FOOTER_H }}
    >
      {n === 0 ? (
        <div className="flex h-full items-center justify-center text-3xl text-slate-300">
          Načítání předpovědi…
        </div>
      ) : (
        <>
          {/* ---- temperatures ---- */}
          <div className="relative flex-[1.05]">
            <GustCurve gusts={rows.map((r) => r.gust)} />
            <div
              className="relative grid h-full items-center"
              style={{ gridTemplateColumns: cols }}
            >
              {rows.map((r) => {
                const h = pragueHour(r.ts)
                const day = h >= 6 && h < 21
                return (
                  <div
                    key={`t${r.ts}`}
                    className="flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-2xl font-medium tabular-nums text-slate-400">
                      {h}
                    </span>
                    <span className="text-3xl leading-none">{day ? '☀️' : '🌙'}</span>
                    <span className="font-display text-4xl font-bold tabular-nums text-sea-900">
                      {r.temp}°
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ---- wind ---- */}
          <div className="flex-[1.6]">
            {/* wind speed */}
            <div className="grid h-1/3 items-center" style={{ gridTemplateColumns: cols }}>
              {rows.map((r) => (
                <div
                  key={`w${r.ts}`}
                  className="text-center font-display text-3xl font-bold tabular-nums text-sea-900"
                >
                  {Math.round(r.wind)}
                </div>
              ))}
            </div>

            {/* gust — numbers over a blended colour strip */}
            <div
              className="grid h-1/3 items-center"
              style={{ gridTemplateColumns: cols, background: gustGradient }}
            >
              {rows.map((r) => (
                <div
                  key={`g${r.ts}`}
                  className="text-center font-display text-3xl font-bold tabular-nums text-sea-900"
                >
                  {r.gust}
                </div>
              ))}
            </div>

            {/* direction arrows */}
            <div className="grid h-1/3 items-center" style={{ gridTemplateColumns: cols }}>
              {rows.map((r) => (
                <div key={`d${r.ts}`} className="flex items-center justify-center">
                  <WindArrow dir={r.dir} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DenChip({ item, top, height, left, width }) {
  const { instructorName } = useSchool()
  const styles = STATE_STYLES[lessonState(item)]
  const isCourse = item.kind === 'course'
  const endTime = toHHMM(toMinutes(item.startTime) + item.durationMin)
  const who = isCourse
    ? item.instructorIds?.length
      ? item.instructorIds.map(instructorName).join(', ')
      : 'Bez instruktora'
    : item.kind === 'rental'
      ? 'Půjčovné'
      : item.instructorId
        ? instructorName(item.instructorId)
        : 'Nepřiřazeno'

  return (
    <div
      className={`absolute overflow-hidden rounded-2xl border-2 px-6 py-4 shadow-card ${styles.chip} ${
        isCourse ? 'border-l-[10px] border-l-violet-500' : ''
      }`}
      style={{ top, height, left, width }}
    >
      <div className="flex items-center gap-3 font-display text-4xl font-bold leading-none">
        {isCourse && (
          <span className="rounded-md bg-violet-500 px-2 py-1 text-lg font-bold uppercase text-white">
            Kurz
          </span>
        )}
        <span className="truncate">{item.type}</span>
        {item.level && (
          <span className="truncate text-3xl font-medium opacity-70">
            · {item.level}
          </span>
        )}
      </div>
      <div className="mt-2 truncate text-3xl font-semibold tabular-nums opacity-90">
        {item.startTime}–{endTime}
      </div>
      <div className="mt-1 truncate text-2xl opacity-80">
        {who}
        {' · '}
        {item.customerName ? item.customerName + ' · ' : ''}
        {item.people} {pluralPeople(item.people)}
      </div>
    </div>
  )
}

function Schedule({ date }) {
  const { itemsForDate } = useSchool()
  const items = itemsForDate(date)
  const cols = layoutColumns(items)

  const hours = []
  for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 60) hours.push(m)

  return (
    <div className="relative bg-white" style={{ height: SCHED_H }}>
      <div className="relative" style={{ height: SCHED_H, paddingTop: 20 }}>
        {/* hour lines + labels */}
        {hours.map((m) => {
          const top = (m - DAY_START_MIN) * PX_PER_MIN + 20
          return (
            <div key={m}>
              <div
                className="absolute left-0 right-0 border-t-2 border-slate-100"
                style={{ top }}
              />
              <div
                className="absolute left-0 -translate-y-1/2 pr-4 text-right font-display text-4xl font-semibold tabular-nums text-slate-400"
                style={{ top, width: GUTTER - 16 }}
              >
                {toHHMM(m)}
              </div>
            </div>
          )
        })}

        {/* lesson blocks */}
        <div
          className="absolute"
          style={{
            left: GUTTER,
            right: 24,
            top: 20,
            height: (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN,
          }}
        >
          {items.map((l) => {
            const { col, cols: n } = cols[l.id]
            const top = (toMinutes(l.startTime) - DAY_START_MIN) * PX_PER_MIN
            const height = Math.max(l.durationMin * PX_PER_MIN - 6, 70)
            const widthPct = 100 / n
            return (
              <DenChip
                key={l.id}
                item={l}
                top={top}
                height={height}
                left={`calc(${col * widthPct}% + 4px)`}
                width={`calc(${widthPct}% - 8px)`}
              />
            )
          })}

          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-4xl text-slate-300">
              Dnes nejsou naplánovány žádné lekce
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DenView() {
  const scale = useStageScale()
  const now = useNow()
  const weather = useWeather()
  const date = todayStr()

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      <div
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="flex flex-col overflow-hidden bg-mist"
      >
        <Header weather={weather} />

        {/* date bar */}
        <div
          className="flex items-center justify-between bg-white px-10"
          style={{ height: DATEBAR_H }}
        >
          <div className="font-display text-5xl font-bold tracking-tight text-sea-900">
            {formatLongDate(date)}
          </div>
          <div className="font-display text-5xl font-semibold tabular-nums text-coral-500">
            {String(now.getHours()).padStart(2, '0')}:
            {String(now.getMinutes()).padStart(2, '0')}
          </div>
        </div>

        <Schedule date={date} />

        <Footer weather={weather} />
      </div>
    </div>
  )
}
