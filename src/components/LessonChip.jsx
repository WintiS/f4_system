import { chipBucket, CHIP_STYLES, useSchool } from '../context/SchoolStore'
import { toMinutes, toHHMM, pluralPeople } from '../lib/time'

export default function LessonChip({
  lesson,
  onClick,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) {
  const { instructorName } = useSchool()
  const styles = CHIP_STYLES[chipBucket(lesson)]
  const isCourse = lesson.kind === 'course'
  const endTime = toHHMM(toMinutes(lesson.startTime) + lesson.durationMin)
  const who = isCourse
    ? lesson.instructorIds?.length
      ? lesson.instructorIds.map(instructorName).join(', ')
      : 'Bez instruktora'
    : lesson.kind === 'rental'
      ? 'Půjčovné'
      : lesson.instructorIds?.length
        ? lesson.instructorIds.map(instructorName).join(', ')
        : 'Nepřiřazeno'

  return (
    <button
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={style}
      className={`group absolute cursor-grab overflow-hidden rounded-lg border px-2 py-1 text-left text-xs shadow-sm transition active:cursor-grabbing ${styles.chip}`}
    >
      <div className="flex items-center gap-1 font-semibold">
        {isCourse && (
          <span className="rounded bg-white/60 px-1 text-[9px] font-bold uppercase">
            Kurz
          </span>
        )}
        <span className="truncate">{lesson.type}</span>
        {lesson.level && (
          <span className="truncate font-normal opacity-70">· {lesson.level}</span>
        )}
      </div>
      <div className="truncate opacity-80">
        {lesson.startTime}–{endTime} · {who}
      </div>
      <div className="truncate opacity-70">
        {lesson.customerName ? lesson.customerName + ' · ' : ''}
        {lesson.people} {pluralPeople(lesson.people)}
      </div>
    </button>
  )
}
