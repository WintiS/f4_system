import { useRef, useState } from 'react'
import { useSchool } from '../context/SchoolStore'
import { DAY_START_MIN, DAY_END_MIN, toMinutes, toHHMM } from '../lib/time'
import { layoutColumns } from '../lib/layout'
import LessonChip from './LessonChip'

const HOUR_HEIGHT = 68 // px per hour
const PX_PER_MIN = HOUR_HEIGHT / 60
const GUTTER = 56 // left time-label column width, px

export default function DayView({ date, onCreateAt, onEditLesson, filterId, readOnly }) {
  const { itemsForDate, updateLesson, updateCourse, conflictsFor, courses } =
    useSchool()
  const all = itemsForDate(date)
  const lessons = filterId
    ? all.filter((l) => (l.instructorIds ?? []).includes(filterId))
    : all
  const cols = layoutColumns(lessons)

  const hours = []
  for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 60) hours.push(m)

  const totalHeight = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN

  // click empty grid -> create at rounded 30-min slot
  const handleGridClick = (e) => {
    if (readOnly) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    let mins = DAY_START_MIN + Math.round(y / PX_PER_MIN / 30) * 30
    mins = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN - 30, mins))
    onCreateAt(toHHMM(mins))
  }

  // --- drag-to-reschedule (vertical, 30-min snap, keeps duration) ---
  const dragRef = useRef(null) // { id, startY, origMin, dur, newMin, moved }
  const suppressClick = useRef(false)
  const [preview, setPreview] = useState(null) // { id, deltaMin } visual offset only

  const onPointerDown = (e, l) => {
    if (readOnly || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      id: l.id,
      startY: e.clientY,
      origMin: toMinutes(l.startTime),
      dur: l.durationMin,
      newMin: toMinutes(l.startTime),
      moved: false,
    }
  }

  const onPointerMove = (e, l) => {
    const d = dragRef.current
    if (!d || d.id !== l.id) return
    const dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dy) < 4) return // below threshold = click, not drag
    d.moved = true
    const deltaMin = Math.round(dy / PX_PER_MIN / 30) * 30
    d.newMin = Math.max(
      DAY_START_MIN,
      Math.min(DAY_END_MIN - d.dur, d.origMin + deltaMin),
    )
    setPreview({ id: l.id, deltaMin: d.newMin - d.origMin })
  }

  const onPointerUp = (e, l) => {
    const d = dragRef.current
    dragRef.current = null
    setPreview(null)
    if (!d || !d.moved) return
    suppressClick.current = true // swallow the click that follows pointerup
    if (d.newMin !== d.origMin) commitMove(l, d.newMin)
  }

  const commitMove = (l, newMin) => {
    const newStart = toHHMM(newMin)
    if (l.kind === 'course') {
      const course = courses.find((c) => c.id === l.courseId)
      if (!course) return
      const idx = l.blockIdx
      // move only this block on this date -> per-date override (keeps duration)
      const overrides = { ...(course.overrides || {}) }
      overrides[date] = {
        ...(overrides[date] || {}),
        [idx]: { start: newStart, end: toHHMM(newMin + l.durationMin) },
      }
      updateCourse(l.courseId, { overrides })
    } else {
      updateLesson(l.id, { startTime: newStart })
      const conflicts = conflictsFor({
        instructorIds: l.instructorIds,
        date,
        startTime: newStart,
        durationMin: l.durationMin,
        ignoreId: l.id,
      })
      if (conflicts.length)
        window.alert(
          'Upozornění: instruktor je v tomto čase dvojitě rezervován.',
        )
    }
  }

  return (
    <div className="thin-scroll overflow-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="relative" style={{ height: totalHeight + 16, paddingTop: 8 }}>
        {/* hour grid + labels */}
        {hours.map((m) => {
          const top = (m - DAY_START_MIN) * PX_PER_MIN + 8
          return (
            <div key={m}>
              <div
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top }}
              />
              <div
                className="absolute left-0 w-14 -translate-y-2 pr-2 text-right font-display text-xs tabular-nums text-slate-400"
                style={{ top }}
              >
                {toHHMM(m)}
              </div>
            </div>
          )
        })}

        {/* clickable lesson area */}
        <div
          className={`absolute ${readOnly ? '' : 'cursor-pointer'}`}
          style={{ left: GUTTER, right: 8, top: 8, height: totalHeight }}
          onClick={handleGridClick}
          title={readOnly ? undefined : 'Klikněte pro přidání lekce v tomto čase'}
        >
          {lessons.map((l) => {
            const { col, cols: n } = cols[l.id]
            const top = (toMinutes(l.startTime) - DAY_START_MIN) * PX_PER_MIN
            const height = Math.max(l.durationMin * PX_PER_MIN - 2, 30)
            const widthPct = 100 / n
            const dragging = preview?.id === l.id
            const dragOffset = dragging ? preview.deltaMin * PX_PER_MIN : 0
            return (
              <LessonChip
                key={l.id}
                lesson={l}
                onClick={(e) => {
                  e.stopPropagation()
                  if (suppressClick.current) {
                    suppressClick.current = false
                    return
                  }
                  onEditLesson?.(l)
                }}
                onPointerDown={(e) => onPointerDown(e, l)}
                onPointerMove={(e) => onPointerMove(e, l)}
                onPointerUp={(e) => onPointerUp(e, l)}
                onPointerCancel={(e) => onPointerUp(e, l)}
                style={{
                  top: top + dragOffset,
                  height,
                  left: `calc(${col * widthPct}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                  zIndex: dragging ? 30 : undefined,
                  opacity: dragging ? 0.85 : undefined,
                  touchAction: 'none',
                }}
              />
            )
          })}

          {lessons.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300">
              {readOnly ? 'Žádné lekce v tento den' : 'Žádné lekce — klikněte kamkoli pro přidání'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
