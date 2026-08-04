import { addDays, formatLongDate, monthLabel, weekRangeLabel, todayStr } from '../lib/time'

function IconBtn({ children, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    >
      {children}
    </button>
  )
}

const VIEW_LABELS = { day: 'Den', week: 'Týden', month: 'Měsíc' }

export default function CalendarHeader({ view, setView, date, setDate }) {
  const go = (dir) => {
    if (view === 'day') {
      setDate(addDays(date, dir))
    } else if (view === 'week') {
      setDate(addDays(date, dir * 7))
    } else {
      const d = new Date(date + 'T00:00:00')
      d.setMonth(d.getMonth() + dir)
      setDate(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`,
      )
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <IconBtn label="Předchozí" onClick={() => go(-1)}>
          &#8249;
        </IconBtn>
        <IconBtn label="Další" onClick={() => go(1)}>
          &#8250;
        </IconBtn>
        <button
          onClick={() => setDate(todayStr())}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Dnes
        </button>
        <h2 className="ml-2 font-display text-lg font-semibold tracking-tight text-sea-900">
          {view === 'month'
            ? monthLabel(date)
            : view === 'week'
              ? weekRangeLabel(date)
              : formatLongDate(date)}
        </h2>
      </div>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
        {['day', 'week', 'month'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              view === v
                ? 'bg-sea-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  )
}
