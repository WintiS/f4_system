import { useMemo, useState } from 'react'
import { useSchool } from '../context/SchoolStore'
import { formatLongDate } from '../lib/time'
import { formatHours, sumHours } from '../lib/hours'

/**
 * Approvals queue: manual work logged by instructors that is still unapproved.
 * Grouped by instructor + day. Admin approves a whole day with one button, or a
 * single entry. Approved logs disappear from the queue (they move on to Výkazy).
 */
export default function ApprovalsAdmin() {
  const { pendingWorkLogs, instructorName, approveDay, approveWorkLog } = useSchool()
  const [busy, setBusy] = useState(null)

  const groups = useMemo(() => {
    const byKey = new Map()
    for (const w of pendingWorkLogs) {
      const key = `${w.instructorId}::${w.workDate}`
      if (!byKey.has(key))
        byKey.set(key, { instructorId: w.instructorId, workDate: w.workDate, logs: [] })
      byKey.get(key).logs.push(w)
    }
    return [...byKey.values()].sort((a, b) =>
      a.workDate === b.workDate
        ? (instructorName(a.instructorId) || '').localeCompare(instructorName(b.instructorId) || '', 'cs')
        : a.workDate < b.workDate
          ? 1
          : -1,
    )
  }, [pendingWorkLogs, instructorName])

  const doApproveDay = async (g) => {
    setBusy(`${g.instructorId}::${g.workDate}`)
    await approveDay(g.instructorId, g.workDate)
    setBusy(null)
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-400 shadow-card">
        Vše schváleno – žádná manuální práce nečeká.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const key = `${g.instructorId}::${g.workDate}`
        return (
          <div
            key={key}
            className="rounded-2xl border border-amber-200 bg-amber-50/60 shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {instructorName(g.instructorId) || 'Neznámý instruktor'}
                </h3>
                <div className="mt-0.5 text-xs text-slate-500">
                  {formatLongDate(g.workDate)} · celkem{' '}
                  <b className="text-amber-700">{formatHours(sumHours(g.logs))}</b>
                </div>
              </div>
              <button
                onClick={() => doApproveDay(g)}
                disabled={busy === key}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
              >
                {busy === key ? 'Schvaluji…' : 'Schválit den'}
              </button>
            </div>

            <ul className="divide-y divide-amber-100/70">
              {g.logs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm sm:px-5">
                  <div className="shrink-0 font-semibold text-amber-800 sm:w-16">
                    {formatHours(l.hours)}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-slate-600">
                    {l.note || 'manuální práce'}
                  </div>
                  <button
                    onClick={() => approveWorkLog(l.id)}
                    className="shrink-0 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Schválit
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
