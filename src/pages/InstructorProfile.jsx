import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthProvider'
import { useSchool } from '../context/SchoolStore'
import { todayStr, formatLongDate, dateInRange } from '../lib/time'
import { sumHours, formatHours, formatCzk, PAID_STATUS } from '../lib/hours'

/** Three-state chip for a manual log: paid / approved / pending approval. */
const logChip = (l) =>
  l.paidAt
    ? PAID_STATUS.paid
    : l.approvedAt
      ? { label: 'Schváleno', chip: 'bg-emerald-100 text-emerald-700' }
      : { label: 'Čeká na schválení', chip: 'bg-amber-100 text-amber-700' }
import CalendarHeader from '../components/CalendarHeader'
import DayView from '../components/DayView'
import WeekView from '../components/WeekView'
import MonthView from '../components/MonthView'
import Legend from '../components/Legend'

const inputCls =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-100'

export default function InstructorProfile() {
  const { user, signOut } = useAuth()
  const {
    instructorByProfile,
    workLogs,
    payouts,
    addWorkLog,
    deleteWorkLog,
    unpaidTeachingHours,
    paidHoursTotal,
    updateMyWorkWindow,
    updateMyName,
  } = useSchool()

  const me = instructorByProfile(user?.id)

  if (!me) {
    return (
      <Shell email={user?.email} onSignOut={signOut}>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 text-sm text-amber-700">
          Váš instruktorský profil se připravuje nebo čeká na schválení správcem.
          Zkuste stránku načíst znovu později.
        </div>
      </Shell>
    )
  }

  return (
    <Shell email={user?.email} onSignOut={signOut}>
      <div className="space-y-6">
        <IntroCard me={me} onRename={(name) => updateMyName(me.id, name)} />
        <ScheduleCard instructorId={me.id} />
        <AvailabilityCard me={me} onSave={updateMyWorkWindow} />
        <HoursCard
          me={me}
          logs={workLogs.filter((w) => w.instructorId === me.id)}
          payouts={payouts.filter((p) => p.instructorId === me.id)}
          teachingUnpaid={unpaidTeachingHours(me.id)}
          paidTotal={paidHoursTotal(me.id)}
          onAdd={addWorkLog}
          onDelete={deleteWorkLog}
        />
      </div>
    </Shell>
  )
}

/* ---- Layout shell ---- */

function Shell({ email, onSignOut, children }) {
  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-mist/80 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral-500 text-lg shadow-lg shadow-coral-500/30 sm:h-10 sm:w-10">
              🏄
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base font-semibold tracking-tight text-sea-900 sm:text-lg">
                Můj profil
              </h1>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <span className="hidden sm:inline">Odhlásit se</span>
            <span className="sm:hidden">🚪</span>
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  )
}

function Card({ title, sub, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

/* ---- Intro ---- */

function IntroCard({ me, onRename }) {
  const onNow = dateInRange(todayStr(), me.workFrom, me.workTo)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(me.name)
  const [busy, setBusy] = useState(false)

  // Follow external changes (admin edits, realtime) when not mid-edit.
  useEffect(() => {
    if (!editing) setName(me.name)
  }, [me.name, editing])

  const clean = name.trim()
  const invalid = clean.length === 0
  const dirty = clean !== me.name

  const save = async () => {
    if (invalid || !dirty) {
      setEditing(false)
      setName(me.name)
      return
    }
    setBusy(true)
    await onRename(clean)
    setBusy(false)
    setEditing(false)
  }
  const cancel = () => {
    setName(me.name)
    setEditing(false)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                autoFocus
                type="text"
                className={`${inputCls} min-w-0 flex-1 font-display text-lg font-semibold`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') cancel()
                }}
              />
              <button
                onClick={save}
                disabled={busy || invalid}
                className="rounded-lg bg-coral-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-50"
              >
                {busy ? 'Ukládání…' : 'Uložit'}
              </button>
              <button
                onClick={cancel}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Zrušit
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="truncate font-display text-lg font-semibold text-sea-900 sm:text-xl">{me.name}</div>
              <button
                onClick={() => setEditing(true)}
                title="Upravit jméno"
                className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                ✏️
              </button>
            </div>
          )}
          <div className="mt-0.5 text-xs text-slate-400">Instruktor</div>
        </div>
        {!editing &&
          (onNow ? (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Dnes pracuji
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
              Dnes volno
            </span>
          ))}
      </div>
    </div>
  )
}

/* ---- Availability window ---- */

function AvailabilityCard({ me, onSave }) {
  const [from, setFrom] = useState(me.workFrom)
  const [to, setTo] = useState(me.workTo)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  // Follow external changes (admin edits, realtime) when not mid-edit.
  useEffect(() => setFrom(me.workFrom), [me.workFrom])
  useEffect(() => setTo(me.workTo), [me.workTo])

  const dirty = from !== me.workFrom || to !== me.workTo
  const invalid = to < from

  const save = async () => {
    if (invalid) return
    setBusy(true)
    await onSave(from, to)
    setBusy(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card
      title="Moje dostupnost"
      sub="Období, kdy pracuješ. Správce podle něj přiřazuje lekce."
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:px-5">
        <label className="block sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-slate-500">Pracuji od</span>
          <input type="date" className={`${inputCls} w-full sm:w-auto`} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block sm:w-auto">
          <span className="mb-1 block text-xs font-medium text-slate-500">Pracuji do</span>
          <input type="date" className={`${inputCls} w-full sm:w-auto`} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button
          onClick={save}
          disabled={!dirty || invalid || busy}
          className="w-full rounded-lg bg-coral-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-50 sm:w-auto"
        >
          {busy ? 'Ukládání…' : 'Uložit'}
        </button>
        {saved && <span className="text-xs font-medium text-emerald-600 sm:self-center">Uloženo ✓</span>}
        {invalid && <span className="text-xs font-medium text-coral-600 sm:self-center">Konec je před začátkem.</span>}
      </div>
    </Card>
  )
}

/* ---- Hours (odpracované hodiny) ---- */

function HoursCard({ logs, payouts, teachingUnpaid, paidTotal, onAdd, onDelete, me }) {
  const [date, setDate] = useState(todayStr())
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const unpaidLogs = useMemo(() => logs.filter((l) => !l.paidAt), [logs])
  const manualUnpaid = useMemo(() => sumHours(unpaidLogs), [unpaidLogs])
  const sorted = useMemo(
    () => [...logs].sort((a, b) => (a.workDate < b.workDate ? 1 : -1)),
    [logs],
  )
  const sortedPayouts = useMemo(
    () => [...payouts].sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1)),
    [payouts],
  )

  const submit = async (e) => {
    e.preventDefault()
    const h = Number(String(hours).replace(',', '.'))
    if (!date || !(h > 0)) return
    setBusy(true)
    await onAdd({ instructorId: me.id, workDate: date, hours: h, note: note.trim() })
    setBusy(false)
    setHours('')
    setNote('')
  }

  return (
    <Card
      title="Odpracované hodiny"
      sub="Výuka se počítá automaticky. Manuální práci (mimo výuku) zapiš níže."
    >
      {/* summary */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 border-b border-slate-100 px-4 py-3 text-sm sm:px-5">
        <Stat label="Odučeno" value={formatHours(teachingUnpaid)} tone="text-sea-800" />
        <Stat label="Manuální práce" value={formatHours(manualUnpaid)} tone="text-sea-800" />
        <Stat label="Neproplaceno celkem" value={formatHours(teachingUnpaid + manualUnpaid)} tone="text-amber-600" />
        <Stat label="Proplaceno celkem" value={formatHours(paidTotal)} tone="text-emerald-600" />
      </div>

      {/* manual add form */}
      <form onSubmit={submit} className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:px-5">
        <div className="flex gap-3">
          <label className="block flex-1 sm:flex-none">
            <span className="mb-1 block text-xs font-medium text-slate-500">Datum</span>
            <input type="date" className={`${inputCls} w-full sm:w-auto`} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Hodiny</span>
            <input
              type="number" min="0" step="0.5" inputMode="decimal" placeholder="2"
              className={`${inputCls} w-20 sm:w-24`}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </label>
        </div>
        <label className="block sm:flex-1">
          <span className="mb-1 block text-xs font-medium text-slate-500">Poznámka (nepovinné)</span>
          <input
            type="text" placeholder="např. servis vybavení"
            className={`${inputCls} w-full`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !(Number(String(hours).replace(',', '.')) > 0)}
          className="w-full rounded-lg bg-coral-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-50 sm:w-auto"
        >
          Přidat manuální práci
        </button>
      </form>

      {/* manual log list */}
      <ul className="divide-y divide-slate-50">
        {sorted.map((l) => {
          const st = logChip(l)
          return (
            <li key={l.id} className="px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="shrink-0 text-sm font-medium text-slate-700 sm:w-32">
                  {formatLongDate(l.workDate)}
                </div>
                <div className="shrink-0 text-sm font-semibold text-sea-800 sm:w-16">
                  {formatHours(l.hours)}
                </div>
                <div className="hidden min-w-0 flex-1 truncate text-sm text-slate-500 sm:block">
                  {l.note || '—'}
                </div>
                <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:ml-0 ${st.chip}`}>
                  {st.label}
                </span>
                {!l.paidAt && !l.approvedAt ? (
                  <button
                    onClick={() => onDelete(l.id)}
                    className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                  >
                    Smazat
                  </button>
                ) : (
                  <span className="hidden shrink-0 sm:block sm:w-[52px]" />
                )}
              </div>
              {l.note && (
                <div className="mt-1 truncate text-sm text-slate-500 sm:hidden">{l.note}</div>
              )}
            </li>
          )
        })}
        {sorted.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400 sm:px-5">
            Zatím žádná manuální práce.
          </li>
        )}
      </ul>

      {/* payout history */}
      {sortedPayouts.length > 0 && (
        <div className="border-t border-slate-100">
          <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:px-5">
            Historie plateb
          </div>
          <ul className="divide-y divide-slate-50">
            {sortedPayouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm sm:px-5">
                <div className="shrink-0 font-medium text-slate-700 sm:w-32">
                  {formatLongDate(p.paidAt.slice(0, 10))}
                </div>
                {p.isReset ? (
                  <div className="ml-auto font-semibold text-rose-600">Vynulováno</div>
                ) : (
                  <>
                    <div className="text-slate-500">
                      výuka {formatHours(p.teachingHours)} · manuální {formatHours(p.manualHours)}
                    </div>
                    <div className="ml-auto font-semibold text-emerald-600">
                      {formatCzk(p.amount)}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div>
      <div className={`font-display text-lg font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

/* ---- Schedule (calendar of own lessons) ---- */

function ScheduleCard({ instructorId }) {
  const [view, setView] = useState('day') // 'day' | 'week' | 'month'
  const [date, setDate] = useState(todayStr())

  return (
    <Card title="Můj rozvrh" sub="Jen lekce a kurzy přiřazené tobě.">
      <div className="space-y-4 px-3 py-4 sm:px-5">
        <CalendarHeader view={view} setView={setView} date={date} setDate={setDate} />
        <Legend />
        {view === 'day' && <DayView date={date} filterId={instructorId} readOnly />}
        {view === 'week' && (
          <WeekView
            date={date}
            filterId={instructorId}
            readOnly
            onPickDay={(d) => {
              setDate(d)
              setView('day')
            }}
          />
        )}
        {view === 'month' && (
          <MonthView
            date={date}
            filterId={instructorId}
            onPickDay={(d) => {
              setDate(d)
              setView('day')
            }}
          />
        )}
      </div>
    </Card>
  )
}
