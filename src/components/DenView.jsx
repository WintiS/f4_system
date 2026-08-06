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
import { useWeather, windColor } from '../lib/weather'

/* Fixed portrait stage — designed at exactly 1080×1920 (school monitor),
   scaled uniformly to fit whatever viewport it runs in. */
const STAGE_W = 1080
const STAGE_H = 1920

const HEADER_H = 200
const DATEBAR_H = 100
const FOOTER_H = 320
const SCHED_H = STAGE_H - HEADER_H - DATEBAR_H - FOOTER_H // 1260

const GUTTER = 130 // time-label column width, px
const PX_PER_MIN = (SCHED_H - 40) / (DAY_END_MIN - DAY_START_MIN)

/* ---- Marine glyph set --------------------------------------------------
   One coherent instrument-panel icon language: a single 2px round stroke,
   drawn in currentColor so each glyph inherits the colour of its slot.
   Replaces every emoji on the board. ------------------------------------ */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const CLOUD = 'M7 18h9a4 4 0 0 0 .4-8 5 5 0 0 0-9.6-.8A3.6 3.6 0 0 0 7 18Z'

function Sun({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle {...stroke} cx="12" cy="12" r="4" />
      <path
        {...stroke}
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
      />
    </svg>
  )
}
function Moon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path {...stroke} d="M20.5 14.3A8.2 8.2 0 0 1 9.7 3.5 7.3 7.3 0 1 0 20.5 14.3Z" />
    </svg>
  )
}
function Cloud({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path {...stroke} d={CLOUD} />
    </svg>
  )
}
function SunCloud({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle {...stroke} cx="8" cy="7.5" r="3" />
      <path {...stroke} d="M8 2v1.4M2.5 7.5h1.4M4.2 3.7l1 1M11.8 3.7l-1 1" />
      <path
        {...stroke}
        d="M8.5 19h7.5a3.5 3.5 0 0 0 .4-7 4.4 4.4 0 0 0-8.2-1.1A3 3 0 0 0 8.5 19Z"
      />
    </svg>
  )
}
function Fog({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        {...stroke}
        d="M7 12h9a3.6 3.6 0 0 0 .4-7.2 4.8 4.8 0 0 0-9.2-.6A3.3 3.3 0 0 0 7 12Z"
      />
      <path {...stroke} d="M4 16h16M6.5 19.5h13" />
    </svg>
  )
}
function Rain({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        {...stroke}
        d="M7 15h9a3.6 3.6 0 0 0 .4-7.2 4.8 4.8 0 0 0-9.2-.6A3.3 3.3 0 0 0 7 15Z"
      />
      <path {...stroke} d="M8.5 18l-1 2.5M12 18l-1 2.5M15.5 18l-1 2.5" />
    </svg>
  )
}
function Snow({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        {...stroke}
        d="M7 15h9a3.6 3.6 0 0 0 .4-7.2 4.8 4.8 0 0 0-9.2-.6A3.3 3.3 0 0 0 7 15Z"
      />
      <path {...stroke} d="M8.5 19h.01M12 19h.01M15.5 19h.01M10.2 21h.01M13.7 21h.01" />
    </svg>
  )
}
function Storm({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        {...stroke}
        d="M7 15h9a3.6 3.6 0 0 0 .4-7.2 4.8 4.8 0 0 0-9.2-.6A3.3 3.3 0 0 0 7 15Z"
      />
      <path d="M12.6 15 10 19.2h2.3L11 23l3.4-4.6H12l1-3.4z" fill="currentColor" />
    </svg>
  )
}
function Wave({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        {...stroke}
        d="M2.5 9c2 0 2 1.8 4 1.8S8.5 9 10.5 9s2 1.8 4 1.8S16.5 9 18.5 9s2 1.8 3 1.8"
      />
      <path
        {...stroke}
        d="M2.5 14.5c2 0 2 1.8 4 1.8s2-1.8 4-1.8 2 1.8 4 1.8 2-1.8 4-1.8 2 1.8 3 1.8"
      />
    </svg>
  )
}
function Wind({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path {...stroke} d="M3 8h10.5A2.5 2.5 0 1 0 11 5.5" />
      <path {...stroke} d="M3 12h14A2.7 2.7 0 1 1 14.3 14.7" />
      <path {...stroke} d="M3 16h7.5A2.2 2.2 0 1 1 8.3 18.2" />
    </svg>
  )
}

const RAIN_CODES = [51, 53, 55, 61, 63, 65, 80, 81, 82]
/** WMO weather code -> marine glyph component. */
function WeatherGlyph({ code, className }) {
  const Icon =
    code === 0
      ? Sun
      : code === 1 || code === 2
        ? SunCloud
        : code === 3
          ? Cloud
          : code === 45 || code === 48
            ? Fog
            : RAIN_CODES.includes(code)
              ? Rain
              : code === 71 || code === 73 || code === 75
                ? Snow
                : code === 95 || code === 96 || code === 99
                  ? Storm
                  : Cloud
  return <Icon className={className} />
}

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
      <div className="text-lg font-semibold uppercase tracking-[0.28em] text-white/45">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-4 font-display font-semibold text-white">
        {icon && (
          <span className="flex h-14 w-14 items-center justify-center text-white/85">
            {icon}
          </span>
        )}
        <span className="text-7xl leading-none tabular-nums">{value}</span>
        <span className="self-end pb-2 text-3xl font-medium text-white/45">{unit}</span>
      </div>
    </div>
  )
}

function Header({ weather }) {
  const { loading, error, current, waterTemp } = weather
  const dash = loading ? '··' : error ? '––' : null
  return (
    <div
      className="flex items-center border-b border-white/10 bg-gradient-to-br from-sea-950 via-sea-900 to-sea-800 px-10 text-white"
      style={{ height: HEADER_H }}
    >
      <HeaderStat
        label="Teplota"
        value={dash ?? current.temp}
        unit="°C"
        icon={current && <WeatherGlyph code={current.code} className="h-full w-full" />}
      />
      <div className="h-24 w-px bg-white/10" />
      {/* Water temp via Supabase edge fn (scrapes teplotavody.cz — no direct API). */}
      <HeaderStat
        label="Voda"
        value={waterTemp ?? (loading ? '··' : '––')}
        unit="°C"
        icon={<Wave className="h-full w-full" />}
      />
      <div className="h-24 w-px bg-white/10" />
      <HeaderStat
        label="Vítr"
        value={dash ?? current.wind}
        unit="m/s"
        icon={<Wind className="h-full w-full" />}
      />
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
      width="44"
      height="44"
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${(dir + 180) % 360}deg)` }}
    >
      <path
        d="M12 3 L18 13 L13.5 13 L13.5 21 L10.5 21 L10.5 13 L6 13 Z"
        fill="#0F3A4E"
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

  // same blended gradient for the stable wind-speed strip
  const windGradient =
    n > 0
      ? `linear-gradient(to right, ${rows
          .map((r, i) => `${windColor(r.wind)} ${(((i + 0.5) / n) * 100).toFixed(1)}%`)
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
                    <span
                      className={`inline-flex h-8 w-8 ${day ? 'text-amber-400' : 'text-slate-300'}`}
                    >
                      {day ? (
                        <Sun className="h-full w-full" />
                      ) : (
                        <Moon className="h-full w-full" />
                      )}
                    </span>
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
            <div
              className="grid h-1/3 items-center"
              style={{ gridTemplateColumns: cols, background: windGradient }}
            >
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

/* Text scales down as lessons crowd side by side. `n` = parallel columns
   from layoutColumns; each extra column halves the chip's real width, so a
   fixed type size overflows fast. Short chips also drop a size and hide the
   secondary line. */
const CHIP_TIERS = {
  lg: {
    box: 'rounded-2xl px-5 py-3.5',
    row: 'gap-3 text-3xl',
    badge: 'rounded-md px-2 py-1 text-base',
    level: 'text-2xl',
    time: 'mt-2 text-2xl',
    who: 'mt-1.5 text-xl',
    border: 'border-l-[10px]',
  },
  md: {
    box: 'rounded-2xl px-4 py-2.5',
    row: 'gap-2 text-2xl',
    badge: 'rounded px-1.5 py-0.5 text-sm',
    level: 'text-xl',
    time: 'mt-1.5 text-xl',
    who: 'mt-1 text-lg',
    border: 'border-l-8',
  },
  sm: {
    box: 'rounded-xl px-3 py-2',
    row: 'gap-1.5 text-xl',
    badge: 'rounded px-1.5 py-0.5 text-xs',
    level: 'text-base',
    time: 'mt-1 text-lg',
    who: 'mt-0.5 text-base',
    border: 'border-l-[6px]',
  },
  xs: {
    box: 'rounded-lg px-2.5 py-1.5',
    row: 'gap-1 text-base',
    badge: 'rounded px-1 py-0.5 text-[10px]',
    level: 'text-sm',
    time: 'mt-0.5 text-sm',
    who: 'mt-0.5 text-xs',
    border: 'border-l-4',
  },
}

function chipTier(n) {
  if (n >= 4) return 'xs'
  if (n === 3) return 'sm'
  if (n === 2) return 'md'
  return 'lg'
}

function DenChip({ item, phase, top, height, left, width, cols }) {
  const { instructorName } = useSchool()
  const styles = STATE_STYLES[lessonState(item)]
  const isCourse = item.kind === 'course'
  const endTime = toHHMM(toMinutes(item.startTime) + item.durationMin)
  const t = CHIP_TIERS[chipTier(cols)]
  const showWho = height >= 96 // too short to fit a third line legibly
  const who = isCourse
    ? item.instructorIds?.length
      ? item.instructorIds.map(instructorName).join(', ')
      : 'Bez instruktora'
    : item.kind === 'rental'
      ? 'Půjčovné'
      : item.instructorIds?.length
        ? item.instructorIds.map(instructorName).join(', ')
        : 'Nepřiřazeno'

  // Time phase drives emphasis: done lessons recede, the live one is ringed
  // and lifted, upcoming ones sit at full strength.
  const phaseCls =
    phase === 'past'
      ? 'opacity-40 saturate-50'
      : phase === 'live'
        ? 'z-10 shadow-[0_16px_40px_-12px_rgba(6,32,43,0.5)]'
        : ''

  return (
    <div
      className={`absolute overflow-hidden border-2 shadow-card ${t.box} ${styles.chip} ${
        isCourse ? `${t.border} border-l-violet-500` : ''
      } ${phaseCls}`}
      style={{ top, height, left, width }}
    >
      <div className={`flex items-center font-display font-bold leading-none ${t.row}`}>
        {isCourse && (
          <span className={`shrink-0 bg-violet-500 font-bold uppercase text-white ${t.badge}`}>
            Kurz
          </span>
        )}
        <span className="truncate">{item.type}</span>
        {item.level && (
          <span className={`truncate font-medium opacity-70 ${t.level}`}>
            · {item.level}
          </span>
        )}
      </div>
      <div className={`truncate font-semibold tabular-nums opacity-90 ${t.time}`}>
        {item.startTime}–{endTime}
      </div>
      {showWho && (
        <div className={`truncate opacity-80 ${t.who}`}>
          {who}
          {' · '}
          {item.customerName ? item.customerName + ' · ' : ''}
          {item.people} {pluralPeople(item.people)}
        </div>
      )}
    </div>
  )
}

function Schedule({ date, nowMin }) {
  const { itemsForDate } = useSchool()
  const items = itemsForDate(date)
  const cols = layoutColumns(items)

  const hours = []
  for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 60) hours.push(m)

  const nowInDay = nowMin >= DAY_START_MIN && nowMin <= DAY_END_MIN
  const nowTop = (nowMin - DAY_START_MIN) * PX_PER_MIN + 20

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

        {/* live NOW sweep — the one thing on the board that means "right now" */}
        {nowInDay && (
          <>
            <div
              className="absolute left-0 right-0 z-20 h-[3px] -translate-y-1/2 bg-coral-500 shadow-[0_0_18px_rgba(251,93,59,0.85)]"
              style={{ top: nowTop }}
            />
            <div
              className="absolute z-30 -translate-y-1/2 rounded-full bg-coral-500 px-2.5 py-0.5 font-display text-2xl font-bold tabular-nums text-white shadow-lg"
              style={{ top: nowTop, left: 6 }}
            >
              {toHHMM(nowMin)}
            </div>
          </>
        )}

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
            const startMin = toMinutes(l.startTime)
            const endMin = startMin + l.durationMin
            const phase =
              nowMin >= endMin ? 'past' : nowMin >= startMin ? 'live' : 'future'
            const top = (startMin - DAY_START_MIN) * PX_PER_MIN
            const height = Math.max(l.durationMin * PX_PER_MIN - 6, 70)
            const widthPct = 100 / n
            return (
              <DenChip
                key={l.id}
                item={l}
                phase={phase}
                top={top}
                height={height}
                cols={n}
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
  const nowMin = now.getHours() * 60 + now.getMinutes()

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
          <div className="flex items-center gap-4">
            <span className="h-3.5 w-3.5 rounded-full bg-coral-500 shadow-[0_0_12px_rgba(251,93,59,0.9)] animate-pulse" />
            <div className="font-display text-5xl font-semibold tabular-nums text-coral-500">
              {String(now.getHours()).padStart(2, '0')}:
              {String(now.getMinutes()).padStart(2, '0')}
            </div>
          </div>
        </div>

        <Schedule date={date} nowMin={nowMin} />

        <Footer weather={weather} />
      </div>
    </div>
  )
}
