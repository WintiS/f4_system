import { CHIP_STYLES } from '../context/SchoolStore'

const ORDER = [
  'lessonAssigned',
  'wingLessonAssigned',
  'lessonUnassigned',
  'courseAssigned',
  'wingCourseAssigned',
  'courseUnassigned',
  'rental',
]

export default function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
      {ORDER.map((key) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-full ${CHIP_STYLES[key].dot}`} />
          <span>{CHIP_STYLES[key].label}</span>
        </div>
      ))}
    </div>
  )
}
