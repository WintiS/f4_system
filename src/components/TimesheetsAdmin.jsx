import { useMemo, useState } from 'react'
import { useSchool } from '../context/SchoolStore'
import { formatLongDate, todayStr } from '../lib/time'
import {
  sumHours,
  formatHours,
  formatCzk,
  computeAmount,
  PAID_STATUS,
} from '../lib/hours'

const FILTERS = [
  { id: 'due', label: 'K proplacení' },
  { id: 'all', label: 'Vše' },
]

/** Approved + unpaid manual hours (only these are payable). */
const approvedManualUnpaid = (workLogs, id) =>
  sumHours(workLogs.filter((w) => w.instructorId === id && !w.paidAt && w.approvedAt))

export default function TimesheetsAdmin() {
  const school = useSchool()
  const {
    instructors, workLogs, payouts,
    unpaidTeachingHours, teachingBreakdownForInstructor, lastPayoutThrough, ratesFor,
    resetAllHours,
  } = school
  const [filter, setFilter] = useState('due')
  const [openId, setOpenId] = useState(null)

  const rows = useMemo(() => {
    return instructors
      .map((i) => {
        const teachingUnpaid = unpaidTeachingHours(i.id)
        const manualApproved = approvedManualUnpaid(workLogs, i.id)
        const pendingCount = workLogs.filter(
          (w) => w.instructorId === i.id && !w.paidAt && !w.approvedAt,
        ).length
        const b = teachingBreakdownForInstructor(i.id, lastPayoutThrough(i.id))
        const amount = computeAmount({ ...b, manual: manualApproved }, ratesFor(i.id))
        return {
          id: i.id, name: i.name,
          teachingUnpaid, manualApproved, pendingCount,
          payable: teachingUnpaid + manualApproved,
          amount,
        }
      })
      .filter((g) => (filter === 'due' ? g.payable > 0 || g.pendingCount > 0 : true))
      .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
  }, [instructors, workLogs, payouts, unpaidTeachingHours, teachingBreakdownForInstructor, lastPayoutThrough, ratesFor, filter])

  const dueCount = useMemo(
    () => instructors.filter((i) => unpaidTeachingHours(i.id) + approvedManualUnpaid(workLogs, i.id) > 0).length,
    [instructors, workLogs, payouts, unpaidTeachingHours],
  )

  const open = instructors.find((i) => i.id === openId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              filter === f.id
                ? 'bg-sea-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
            {f.id === 'due' && dueCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] text-white">
                {dueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <ul className="divide-y divide-slate-100">
          {rows.map((g) => (
            <li key={g.id}>
              <button
                onClick={() => setOpenId(g.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 sm:px-5"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">{g.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Odučeno <b className="text-sea-800">{formatHours(g.teachingUnpaid)}</b></span>
                    <span>Manuální <b className="text-sea-800">{formatHours(g.manualApproved)}</b></span>
                    {g.pendingCount > 0 && (
                      <span className="text-amber-600">{g.pendingCount}× čeká na schválení</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-emerald-600">{formatCzk(g.amount)}</div>
                  <div className="text-[11px] text-slate-400">k proplacení →</div>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {rows.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            {filter === 'due' ? 'Nic k proplacení.' : 'Zatím žádní instruktoři.'}
          </div>
        )}
      </div>

      <DangerReset onReset={resetAllHours} />

      {open && <InstructorHoursModal instructor={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

/* ------- dangerous: reset all worked hours ------- */
const RESET_WORD = 'VYNULOVAT'

function DangerReset({ onReset }) {
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (word !== RESET_WORD) return
    setBusy(true)
    await onReset()
    setBusy(false)
    setOpen(false)
    setWord('')
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-rose-800">Vynulovat odpracované hodiny</h3>
          <p className="mt-0.5 text-xs text-rose-600/80">
            Vynuluje výuku i manuální práci VŠECH instruktorů. Počítání začne znovu od zítřka. Nelze vrátit.
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            Vynulovat vše
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-rose-300 bg-white p-3">
          <p className="text-xs text-slate-600">
            Pro potvrzení napiš <b className="font-mono text-rose-700">{RESET_WORD}</b>:
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder={RESET_WORD}
              className="w-40 rounded-lg border border-rose-300 px-2 py-1.5 text-sm focus:border-rose-500 focus:outline-none"
            />
            <button
              onClick={run}
              disabled={word !== RESET_WORD || busy}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-40"
            >
              {busy ? 'Nuluji…' : 'Nenávratně vynulovat'}
            </button>
            <button
              onClick={() => { setOpen(false); setWord('') }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

const PAGE = 14

function InstructorHoursModal({ instructor, onClose }) {
  const {
    workLogs, payouts,
    daysForInstructor, teachingBreakdownForInstructor, unpaidTeachingHours,
    lastPayoutThrough, ratesFor,
    approveDay, approveWorkLog, updateWorkLog, adminAddWorkLog, setTeachingOverride,
    updateInstructorRates, recordPayout,
  } = useSchool()

  const id = instructor.id
  const [limit, setLimit] = useState(PAGE)
  const [busy, setBusy] = useState(false)
  const [confirmPay, setConfirmPay] = useState(false)

  const rates = ratesFor(id)
  const cutoff = lastPayoutThrough(id)
  const days = daysForInstructor(id, { limit })
  const hasMore = daysForInstructor(id, { limit: limit + 1 }).length > days.length

  const teachingUnpaid = unpaidTeachingHours(id)
  const manualApproved = sumHours(workLogs.filter((w) => w.instructorId === id && !w.paidAt && w.approvedAt))
  const breakdown = teachingBreakdownForInstructor(id, cutoff)
  const amount = computeAmount({ ...breakdown, manual: manualApproved }, rates)
  const payable = teachingUnpaid + manualApproved

  const history = payouts
    .filter((p) => p.instructorId === id)
    .sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1))

  const pay = async () => {
    setBusy(true)
    await recordPayout(id)
    setBusy(false)
    setConfirmPay(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-sea-900">{instructor.name}</h2>
            <p className="text-xs text-slate-500">Odpracované hodiny po dnech</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
          <RateEditor rates={rates} onSave={(r) => updateInstructorRates(id, r)} />

          {/* payable summary + pay */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="text-sm text-slate-600">
              <div>
                Výuka <b className="text-sea-800">{formatHours(teachingUnpaid)}</b> · schválená manuální{' '}
                <b className="text-sea-800">{formatHours(manualApproved)}</b>
              </div>
              <div className="mt-0.5 text-lg font-bold text-emerald-700">{formatCzk(amount)}</div>
            </div>
            {payable > 0 &&
              (confirmPay ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-xs text-slate-500">Zaplatit {formatCzk(amount)}?</span>
                  <button onClick={pay} disabled={busy} className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50">
                    {busy ? 'Ukládání…' : 'Ano'}
                  </button>
                  <button onClick={() => setConfirmPay(false)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Ne</button>
                </span>
              ) : (
                <button onClick={() => setConfirmPay(true)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600">
                  Označit jako zaplaceno
                </button>
              ))}
          </div>

          <AddManualForm onAdd={(d) => adminAddWorkLog({ instructorId: id, ...d })} />

          {/* per-day rows */}
          <div className="space-y-2">
            {days.map((d) => (
              <DayRow
                key={d.date}
                day={d}
                settled={cutoff && d.date <= cutoff}
                onApproveDay={() => approveDay(id, d.date)}
                onApproveLog={approveWorkLog}
                onEditLog={updateWorkLog}
                onEditTaught={(discipline, hours) => setTeachingOverride({ instructorId: id, workDate: d.date, discipline, hours })}
              />
            ))}
            {days.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">Žádné odpracované dny.</div>
            )}
            {hasMore && (
              <button
                onClick={() => setLimit((l) => l + PAGE)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Načíst starší
              </button>
            )}
          </div>

          {/* payout history */}
          {history.length > 0 && (
            <div>
              <div className="pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Historie plateb</div>
              <ul className="divide-y divide-slate-50 rounded-xl border border-slate-100">
                {history.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                    <div className="shrink-0 font-medium text-slate-700 sm:w-28">{formatLongDate(p.paidAt.slice(0, 10))}</div>
                    {p.isReset ? (
                      <div className="ml-auto text-xs font-semibold text-rose-600">Vynulováno</div>
                    ) : (
                      <>
                        <div className="text-xs text-slate-500">
                          výuka {formatHours(p.teachingHours)} · manuální {formatHours(p.manualHours)}
                        </div>
                        <div className="ml-auto font-semibold text-emerald-600">{formatCzk(p.amount)}</div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------- rate editor ------- */
function RateEditor({ rates, onSave }) {
  const [edit, setEdit] = useState(false)
  const [work, setWork] = useState(rates.workRate)
  const [teach, setTeach] = useState(rates.teachRate)
  const [wg, setWg] = useState(rates.wgBonus)

  const save = () => {
    onSave({ workRate: Number(work) || 0, teachRate: Number(teach) || 0, wgBonus: Number(wg) || 0 })
    setEdit(false)
  }

  if (!edit) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        <span>
          Sazby: práce <b>{rates.workRate} Kč/h</b> · výuka <b>{rates.teachRate} Kč/h</b> · wingfoil bonus <b>+{rates.wgBonus} Kč/h</b>
        </span>
        <button onClick={() => setEdit(true)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 transition hover:bg-slate-50">
          Upravit sazby
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-sea-200 bg-sea-50/50 px-4 py-3">
      <RateField label="Práce (Kč/h)" value={work} onChange={setWork} />
      <RateField label="Výuka (Kč/h)" value={teach} onChange={setTeach} />
      <RateField label="Wingfoil bonus" value={wg} onChange={setWg} />
      <div className="flex gap-2">
        <button onClick={save} className="rounded-lg bg-sea-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sea-800">Uložit</button>
        <button onClick={() => setEdit(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Zrušit</button>
      </div>
    </div>
  )
}

function RateField({ label, value, onChange }) {
  return (
    <label className="text-xs text-slate-500">
      <span className="mb-1 block">{label}</span>
      <input
        type="number" min="0" step="10" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-sea-500 focus:outline-none"
      />
    </label>
  )
}

/* ------- add manual work (admin, any day) ------- */
function AddManualForm({ onAdd }) {
  const [date, setDate] = useState(todayStr())
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const h = Number(String(hours).replace(',', '.'))
    if (!date || !h) return
    onAdd({ workDate: date, hours: h, note })
    setHours('')
    setNote('')
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <label className="text-xs text-slate-500">
        <span className="mb-1 block">Datum</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-sea-500 focus:outline-none" />
      </label>
      <label className="text-xs text-slate-500">
        <span className="mb-1 block">Hodiny (práce)</span>
        <input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="např. 2" className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-sea-500 focus:outline-none" />
      </label>
      <label className="min-w-[8rem] flex-1 text-xs text-slate-500">
        <span className="mb-1 block">Poznámka</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="volitelné" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-sea-500 focus:outline-none" />
      </label>
      <button type="submit" className="rounded-lg bg-sea-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sea-800">
        + Přidat práci
      </button>
    </form>
  )
}

/* ------- one day ------- */
const TAUGHT = [
  { key: 'wg', discipline: 'wingfoil', label: 'wg' },
  { key: 'sf', discipline: 'windsurf', label: 'sf' },
  { key: 'pb', discipline: 'paddleboard', label: 'pb' },
]

function DayRow({ day, settled, onApproveDay, onApproveLog, onEditLog, onEditTaught }) {
  const hasPending = day.manual.some((m) => !m.approvedAt && !m.paidAt)

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${hasPending ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="w-28 shrink-0 text-sm font-semibold text-slate-700">{formatLongDate(day.date)}</div>

        {/* taught hours by discipline (editable) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {TAUGHT.map((t) => (
            <TaughtCell key={t.key} label={t.label} hours={day[t.key]} onSave={(h) => onEditTaught(t.discipline, h)} />
          ))}
        </div>

        {hasPending && (
          <button onClick={onApproveDay} className="ml-auto rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600">
            Schválit den
          </button>
        )}
        {settled && !hasPending && (
          <span className="ml-auto text-[11px] text-slate-400">proplaceno</span>
        )}
      </div>

      {/* manual entries */}
      {day.manual.length > 0 && (
        <ul className="mt-2 space-y-1">
          {day.manual.map((m) => (
            <ManualEntry key={m.id} entry={m} onApprove={() => onApproveLog(m.id)} onEdit={onEditLog} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TaughtCell({ label, hours, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')

  if (editing) {
    const commit = () => {
      const h = Number(String(val).replace(',', '.'))
      if (!Number.isNaN(h)) onSave(h)
      setEditing(false)
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-white px-1 ring-1 ring-sea-300">
        <span className="text-xs text-slate-400">{label}</span>
        <input
          autoFocus value={val} onChange={(e) => setVal(e.target.value)}
          onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-12 rounded border-0 px-1 py-0.5 text-xs focus:outline-none" inputMode="decimal"
        />
      </span>
    )
  }

  const active = hours > 0
  return (
    <button
      onClick={() => { setVal(hours ? String(hours) : ''); setEditing(true) }}
      title="Upravit odučené hodiny"
      className={`rounded-md px-1.5 py-0.5 text-xs font-medium transition ${
        active ? 'bg-sea-100 text-sea-800 hover:bg-sea-200' : 'text-slate-300 hover:bg-slate-100'
      }`}
    >
      {label} {formatHours(hours)}
    </button>
  )
}

function ManualEntry({ entry, onApprove, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState(String(entry.hours))
  const [note, setNote] = useState(entry.note || '')

  const state = entry.paidAt ? 'paid' : entry.approvedAt ? 'approved' : 'pending'
  const style = {
    paid: 'bg-slate-50 text-slate-500',
    approved: 'bg-emerald-50 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
  }[state]
  const label = { paid: PAID_STATUS.paid.label, approved: 'Schváleno', pending: 'Čeká' }[state]

  if (editing) {
    const commit = () => {
      const h = Number(String(hours).replace(',', '.'))
      onEdit(entry.id, { hours: Number.isNaN(h) ? entry.hours : h, note })
      setEditing(false)
    }
    return (
      <li className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-sea-300">
        <input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal" className="w-16 rounded border border-slate-300 px-1.5 py-1 text-xs focus:outline-none" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="poznámka" className="min-w-[6rem] flex-1 rounded border border-slate-300 px-1.5 py-1 text-xs focus:outline-none" />
        <button onClick={commit} className="rounded bg-sea-900 px-2 py-1 text-xs font-semibold text-white">Uložit</button>
        <button onClick={() => setEditing(false)} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500">Zrušit</button>
      </li>
    )
  }

  return (
    <li className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${style}`}>
      <span className="font-semibold">p {formatHours(entry.hours)}</span>
      <span className="min-w-0 flex-1 truncate opacity-80">{entry.note || 'manuální práce'}</span>
      <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium">{label}</span>
      {!entry.paidAt && (
        <>
          <button onClick={() => setEditing(true)} className="shrink-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">Upravit</button>
          {!entry.approvedAt && (
            <button onClick={onApprove} className="shrink-0 rounded border border-emerald-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-50">Schválit</button>
          )}
        </>
      )}
    </li>
  )
}
