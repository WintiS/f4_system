import { lessonState, STATE_STYLES, useSchool } from '../context/SchoolStore'
import {
  DAY_START_MIN,
  DAY_END_MIN,
  toMinutes,
  toHHMM,
  weekDays,
  fromDateStr,
  todayStr,
  WEEKDAY_LABELS,
} from '../lib/time'
import { layoutColumns } from '../lib/layout'

const HOUR_HEIGHT = 52
const PX_PER_MIN = HOUR_HEIGHT / 60
const GUTTER = 48

function DayColumn({ date, lessons, onCreateAt, onEditLesson, totalHeight }) {
  const cols = layoutColumns(lessons)

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    let mins = DAY_START_MIN + Math.round(y / PX_PER_MIN / 30) * 30
    mins = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN - 30, mins))
    onCreateAt(date, toHHMM(mins))
  }

  return (
    <div
      className="relative cursor-pointer border-l border-slate-100"
      style={{ height: totalHeight }}
      onClick={handleClick}
      title="Klikněte pro přidání lekce"
    >
      {lessons.map((l) => {
        const { col, cols: n } = cols[l.id]
        const top = (toMinutes(l.startTime) - DAY_START_MIN) * PX_PER_MIN
        const height = Math.max(l.durationMin * PX_PER_MIN - 2, 22)
        const widthPct = 100 / n
        const styles = STATE_STYLES[lessonState(l)]
        return (
          <button
            key={l.id}
            onClick={(e) => {
              e.stopPropagation()
              onEditLesson(l)
            }}
            style={{
              top,
              height,
              left: `calc(${col * widthPct}% + 1px)`,
              width: `calc(${widthPct}% - 2px)`,
            }}
            className={`absolute overflow-hidden rounded-md border px-1 py-0.5 text-left text-[10px] leading-tight shadow-sm ${styles.chip} ${
              l.kind === 'course' ? 'border-l-4 border-l-violet-500' : ''
            }`}
          >
            <div className="truncate font-semibold">
              {l.kind === 'course' ? '◆ ' : ''}
              {l.type}
            </div>
            <div className="truncate opacity-80">{l.startTime}</div>
          </button>
        )
      })}
    </div>
  )
}

export default function WeekView({ date, onCreateAt, onEditLesson, onPickDay }) {
  const { itemsForDate } = useSchool()
  const days = weekDays(date)
  const today = todayStr()

  const hours = []
  for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 60) hours.push(m)
  const totalHeight = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN

  const byDate = Object.fromEntries(days.map((d) => [d, itemsForDate(d)]))

  return (
    <div className="thin-scroll overflow-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      {/* day header row */}
      <div
        className="sticky top-0 z-10 grid border-b border-slate-200 bg-white"
        style={{ gridTemplateColumns: `${GUTTER}px repeat(7, minmax(90px, 1fr))` }}
      >
        <div />
        {days.map((d, i) => {
          const isToday = d === today
          const dd = fromDateStr(d)
          return (
            <button
              key={d}
              onClick={() => onPickDay(d)}
              className="border-l border-slate-100 px-1 py-2 text-center hover:bg-slate-50"
            >
              <div className="text-[11px] font-medium text-slate-400">
                {WEEKDAY_LABELS[i]}
              </div>
              <div
                className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday ? 'bg-coral-500 font-semibold text-white' : 'text-slate-700'
                }`}
              >
                {dd.getDate()}
              </div>
            </button>
          )
        })}
      </div>

      {/* body: time gutter + 7 columns */}
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `${GUTTER}px repeat(7, minmax(90px, 1fr))` }}
      >
        {/* hour lines across whole grid */}
        {hours.map((m) => {
          const top = (m - DAY_START_MIN) * PX_PER_MIN
          return (
            <div
              key={m}
              className="pointer-events-none absolute left-0 right-0 border-t border-slate-100"
              style={{ top }}
            />
          )
        })}

        {/* time gutter */}
        <div className="relative" style={{ height: totalHeight }}>
          {hours.map((m) => (
            <div
              key={m}
              className="absolute right-1 -translate-y-2 font-display text-[10px] tabular-nums text-slate-400"
              style={{ top: (m - DAY_START_MIN) * PX_PER_MIN }}
            >
              {toHHMM(m)}
            </div>
          ))}
        </div>

        {days.map((d) => (
          <DayColumn
            key={d}
            date={d}
            lessons={byDate[d] || []}
            onCreateAt={onCreateAt}
            onEditLesson={onEditLesson}
            totalHeight={totalHeight}
          />
        ))}
      </div>
    </div>
  )
}
