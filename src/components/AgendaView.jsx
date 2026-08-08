import { chipBucket, useSchool } from '../context/SchoolStore'
import {
  toMinutes,
  toHHMM,
  pluralPeople,
  weekDays,
  fromDateStr,
  todayStr,
  WEEKDAY_LABELS,
} from '../lib/time'

// Left-rail accent per content bucket (mirrors CHIP_STYLES colors).
const ACCENT = {
  lessonAssigned: { bar: 'border-l-mint-500', dot: 'bg-mint-500' },
  lessonUnassigned: { bar: 'border-l-salmon-500', dot: 'bg-salmon-500' },
  courseAssigned: { bar: 'border-l-sprout-500', dot: 'bg-sprout-500' },
  courseUnassigned: { bar: 'border-l-sand-500', dot: 'bg-sand-500' },
  rental: { bar: 'border-l-lilac-500', dot: 'bg-lilac-500' },
}

function whoLabel(lesson, instructorName) {
  if (lesson.kind === 'rental') return 'Půjčovné'
  const names = lesson.instructorIds?.length
    ? lesson.instructorIds.map(instructorName).join(', ')
    : null
  if (names) return names
  return lesson.kind === 'course' ? 'Bez instruktora' : 'Nepřiřazeno'
}

function ItemCard({ lesson, isLast, onEdit, instructorName }) {
  const bucket = chipBucket(lesson)
  const accent = ACCENT[bucket]
  const isCourse = lesson.kind === 'course'
  const start = toMinutes(lesson.startTime)
  const end = toHHMM(start + lesson.durationMin)
  const who = whoLabel(lesson, instructorName)

  return (
    <li className="relative flex gap-3">
      {/* time rail */}
      <div className="relative flex w-3 shrink-0 flex-col items-center pt-2">
        <span
          className={`z-10 h-3 w-3 rounded-full ring-4 ring-mist ${accent.dot}`}
        />
        {!isLast && (
          <span className="absolute top-2 h-full w-px bg-slate-200" />
        )}
      </div>

      {/* card */}
      <button
        onClick={() => onEdit?.(lesson)}
        className={`mb-3 flex-1 rounded-2xl border border-slate-200 border-l-4 bg-white px-4 py-3 text-left shadow-card transition active:scale-[0.99] active:bg-slate-50 ${accent.bar}`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-base font-semibold tabular-nums text-sea-900">
            {lesson.startTime}
            <span className="text-slate-400">–{end}</span>
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500">
            {lesson.durationMin} min
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 font-medium text-slate-800">
          {isCourse && (
            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              Kurz
            </span>
          )}
          <span className="truncate">{lesson.type}</span>
          {lesson.level && (
            <span className="truncate text-sm font-normal text-slate-400">
              · {lesson.level}
            </span>
          )}
        </div>

        <div className="mt-0.5 text-sm text-slate-500">{who}</div>
        {(lesson.customerName || lesson.people) && (
          <div className="mt-0.5 text-sm text-slate-400">
            {lesson.customerName ? lesson.customerName + ' · ' : ''}
            {lesson.people} {pluralPeople(lesson.people)}
          </div>
        )}
      </button>
    </li>
  )
}

function DaySection({ date, items, showHeader, onPickDay, onEdit, instructorName }) {
  const dd = fromDateStr(date)
  const isToday = date === todayStr()
  const weekday = WEEKDAY_LABELS[(dd.getDay() + 6) % 7]

  return (
    <section>
      {showHeader && (
        <button
          onClick={() => onPickDay?.(date)}
          className="mb-2 flex w-full items-center gap-2 px-1 text-left"
        >
          <span
            className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-semibold tabular-nums ${
              isToday ? 'bg-coral-500 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {dd.getDate()}
          </span>
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-slate-500">
            {weekday}
          </span>
          <span className="ml-auto text-xs text-slate-400">
            {items.length ? `${items.length}` : ''}
          </span>
        </button>
      )}

      {items.length === 0 ? (
        <div className="mb-3 rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-300">
          Volno
        </div>
      ) : (
        <ul className="relative">
          {items.map((l, i) => (
            <ItemCard
              key={l.id}
              lesson={l}
              isLast={i === items.length - 1}
              onEdit={onEdit}
              instructorName={instructorName}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Mobile agenda replacement for the time-grid calendar.
 * No pointer/drag handlers by design — tap a card to edit, nothing moves by accident.
 * mode 'day' -> single date; mode 'week' -> 7 day sections.
 */
export default function AgendaView({
  date,
  mode = 'day',
  filterId,
  onEditLesson,
  onCreateAt,
  onPickDay,
}) {
  const { itemsForDate, instructorName } = useSchool()

  const forDate = (d) => {
    const items = itemsForDate(d)
    const filtered = filterId
      ? items.filter((l) => (l.instructorIds ?? []).includes(filterId))
      : items
    return [...filtered].sort(
      (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
    )
  }

  if (mode === 'week') {
    const days = weekDays(date)
    return (
      <div className="space-y-5">
        {days.map((d) => (
          <DaySection
            key={d}
            date={d}
            items={forDate(d)}
            showHeader
            onPickDay={onPickDay}
            onEdit={onEditLesson}
            instructorName={instructorName}
          />
        ))}
      </div>
    )
  }

  const items = forDate(date)
  return (
    <div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
          Žádné lekce v tento den
        </div>
      ) : (
        <DaySection
          date={date}
          items={items}
          showHeader={false}
          onEdit={onEditLesson}
          instructorName={instructorName}
        />
      )}

      {onCreateAt && (
        <button
          onClick={() => onCreateAt('10:00')}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-coral-300 bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-600 transition active:bg-coral-100"
        >
          <span className="text-base leading-none">+</span> Přidat lekci
        </button>
      )}
    </div>
  )
}
