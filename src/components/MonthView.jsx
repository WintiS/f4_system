import { lessonState, STATE_STYLES, useSchool } from '../context/SchoolStore'
import { monthGrid, WEEKDAY_LABELS, fromDateStr } from '../lib/time'

export default function MonthView({ date, onPickDay, filterId }) {
  const { itemsForDate } = useSchool()
  const weeks = monthGrid(date)

  const byDate = (dateStr) => {
    const items = itemsForDate(dateStr)
    return filterId
      ? items.filter((l) => (l.instructorIds ?? []).includes(filterId))
      : items
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flat().map((cell) => {
          const items = byDate(cell.dateStr).sort((a, b) =>
            a.startTime.localeCompare(b.startTime),
          )
          const shown = items.slice(0, 3)
          const extra = items.length - shown.length
          return (
            <button
              key={cell.dateStr}
              onClick={() => onPickDay(cell.dateStr)}
              className={`min-h-[104px] border-b border-r border-slate-100 p-1.5 text-left align-top transition hover:bg-slate-50 ${
                cell.inMonth ? 'bg-white' : 'bg-slate-50/50'
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    cell.isToday
                      ? 'bg-coral-500 font-semibold text-white'
                      : cell.inMonth
                        ? 'text-slate-600'
                        : 'text-slate-300'
                  }`}
                >
                  {fromDateStr(cell.dateStr).getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {shown.map((l) => {
                  const s = STATE_STYLES[lessonState(l)]
                  return (
                    <div
                      key={l.id}
                      className={`flex items-center gap-1 truncate rounded border px-1 py-0.5 text-[10px] ${s.chip} ${
                        l.kind === 'course' ? 'border-l-2 border-l-violet-500' : ''
                      }`}
                    >
                      <span className="font-medium">{l.startTime}</span>
                      <span className="truncate">
                        {l.kind === 'course' ? '◆ ' : ''}
                        {l.type}
                      </span>
                    </div>
                  )
                })}
                {extra > 0 && (
                  <div className="px-1 text-[10px] text-slate-400">+{extra} další</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
