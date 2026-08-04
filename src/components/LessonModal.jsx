import { useMemo, useState } from 'react'
import { useSchool } from '../context/SchoolStore'
import { LESSON_TYPES, LEVELS, DURATIONS } from '../data/mock'
import { DAY_START_MIN, DAY_END_MIN, toHHMM } from '../lib/time'

const TIME_OPTIONS = (() => {
  const out = []
  for (let m = DAY_START_MIN; m <= DAY_END_MIN - 30; m += 30) out.push(toHHMM(m))
  return out
})()

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-100'

export default function LessonModal({ initial, editId, requestId, onClose }) {
  const {
    availableInstructors,
    conflictsFor,
    instructorName,
    addLesson,
    updateLesson,
    deleteLesson,
    scheduleRequest,
  } = useSchool()

  const [form, setForm] = useState(() => ({
    kind: 'lesson',
    type: LESSON_TYPES[0],
    level: LEVELS[0],
    durationMin: 90,
    people: 1,
    customerName: '',
    date: initial?.date ?? '',
    startTime: initial?.startTime ?? '10:00',
    instructorId: null,
    ...initial,
  }))

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDouble, setConfirmDouble] = useState(false)

  const isRental = form.kind === 'rental'

  const avail = useMemo(
    () => (form.date ? availableInstructors(form.date) : []),
    [form.date, availableInstructors],
  )

  // if selected instructor is not available on the chosen date, flag it
  const instructorUnavailable =
    form.instructorId && !avail.some((i) => i.id === form.instructorId)

  const conflicts = useMemo(
    () =>
      isRental
        ? []
        : conflictsFor({
            instructorId: form.instructorId,
            date: form.date,
            startTime: form.startTime,
            durationMin: Number(form.durationMin),
            ignoreId: editId,
          }),
    [isRental, form.instructorId, form.date, form.startTime, form.durationMin, editId, conflictsFor],
  )

  const save = () => {
    // double booking requires explicit confirmation
    if (conflicts.length > 0 && !confirmDouble) {
      setConfirmDouble(true)
      return
    }
    const payload = {
      kind: form.kind,
      type: form.type,
      level: isRental ? '' : form.level,
      durationMin: Number(form.durationMin),
      people: Number(form.people),
      customerName: form.customerName,
      date: form.date,
      startTime: form.startTime,
      instructorId: isRental ? null : form.instructorId || null,
    }
    if (requestId) {
      scheduleRequest(requestId, payload)
    } else if (editId) {
      updateLesson(editId, payload)
    } else {
      addLesson(payload)
    }
    onClose()
  }

  const canSave = form.date && form.startTime

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">
            {requestId ? 'Naplánovat poptávku' : editId ? 'Upravit rezervaci' : 'Nová rezervace'}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Zavřít"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-auto px-5 py-4">
          {/* kind toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
            {[
              ['lesson', 'Lekce'],
              ['rental', 'Půjčovné'],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => set({ kind: k })}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  form.kind === k
                    ? 'bg-coral-500 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={isRental ? 'Vybavení' : 'Typ lekce'}>
              <select
                className={inputCls}
                value={form.type}
                onChange={(e) => set({ type: e.target.value })}
              >
                {LESSON_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>

            {!isRental && (
              <Field label="Úroveň">
                <select
                  className={inputCls}
                  value={form.level}
                  onChange={(e) => set({ level: e.target.value })}
                >
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Délka">
              <select
                className={inputCls}
                value={form.durationMin}
                onChange={(e) => set({ durationMin: Number(e.target.value) })}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d === 60 ? '1 h' : d === 90 ? '1,5 h' : d === 120 ? '2 h' : `${d / 60} h`}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Počet osob">
              <input
                type="number"
                min="1"
                className={inputCls}
                value={form.people}
                onChange={(e) => set({ people: e.target.value })}
              />
            </Field>

            <Field label="Datum">
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={(e) => set({ date: e.target.value, instructorId: null })}
              />
            </Field>

            <Field label="Začátek">
              <select
                className={inputCls}
                value={form.startTime}
                onChange={(e) => set({ startTime: e.target.value })}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field label="Jméno zákazníka (nepovinné)">
              <input
                className={inputCls}
                placeholder="např. Ferreira"
                value={form.customerName}
                onChange={(e) => set({ customerName: e.target.value })}
              />
            </Field>

            {!isRental && (
              <Field label="Instruktor">
                <select
                  className={inputCls}
                  value={form.instructorId ?? ''}
                  onChange={(e) => set({ instructorId: e.target.value || null })}
                >
                  <option value="">— Nepřiřazeno —</option>
                  {avail.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                  {instructorUnavailable && (
                    <option value={form.instructorId}>
                      {instructorName(form.instructorId)} (tento den nepracuje)
                    </option>
                  )}
                </select>
              </Field>
            )}
          </div>

          {!form.date && (
            <p className="text-xs text-slate-400">
              Vyberte datum pro zobrazení dostupných instruktorů.
            </p>
          )}

          {!isRental && form.date && avail.length === 0 && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              V tento den nepracuje žádný instruktor. Můžete přesto uložit bez
              přiřazení.
            </div>
          )}

          {instructorUnavailable && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠ {instructorName(form.instructorId)} v tento den nepracuje.
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
              <div className="flex items-center gap-2 text-base font-bold text-red-700">
                <span className="text-xl">⚠️</span>
                Dvojitá rezervace!
              </div>
              <p className="mt-1 font-medium">
                {instructorName(form.instructorId)} už má{' '}
                {conflicts.length === 1
                  ? 'překrývající se lekci'
                  : `${conflicts.length} překrývajících se lekcí`}
                :
              </p>
              <ul className="mt-1 list-inside list-disc font-medium">
                {conflicts.map((c) => (
                  <li key={c.id}>
                    {c.type} v {c.startTime} ({c.durationMin} min)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {editId ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-600">Opravdu smazat?</span>
                <button
                  onClick={() => {
                    deleteLesson(editId)
                    onClose()
                  }}
                  className="font-medium text-red-600 hover:text-red-700"
                >
                  Ano
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="font-medium text-slate-500 hover:text-slate-700"
                >
                  Ne
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Smazat
              </button>
            )
          ) : (
            <span />
          )}
          {confirmDouble && conflicts.length > 0 ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-red-700">
                Uložit i přes dvojitou rezervaci?
              </span>
              <button
                onClick={() => setConfirmDouble(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Zpět
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Uložit i tak
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Zrušit
              </button>
              <button
                onClick={save}
                disabled={!canSave}
                className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600 disabled:opacity-40"
              >
                {requestId ? 'Naplánovat' : editId ? 'Uložit' : 'Vytvořit'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
