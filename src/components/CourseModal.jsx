import { useMemo, useState } from 'react'
import { useSchool, courseDays } from '../context/SchoolStore'
import { COURSE_TYPES, LEVELS, COURSE_SPANS, DEFAULT_COURSE_BLOCKS } from '../data/mock'
import { weekStart, formatLongDate, pluralDays } from '../lib/time'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-100'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

export default function CourseModal({ initial, editId, blockCtx, onClose }) {
  const { instructors, addCourse, updateCourse, deleteCourse, courseConflictsFor, instructorName, availabilityStatusOn } =
    useSchool()

  const [confirmDouble, setConfirmDouble] = useState(false)

  const [form, setForm] = useState(() => ({
    title: '',
    type: COURSE_TYPES[0],
    level: LEVELS[0],
    span: 'week',
    startDate: '',
    blocks: DEFAULT_COURSE_BLOCKS.map((b) => ({ ...b })),
    people: 6,
    customerName: '',
    note: '',
    instructorIds: [],
    overrides: {},
    instructorDays: {},
    ...initial,
  }))

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // Which instructor's per-day coverage picker is expanded (id) or none (null).
  const [dayPickerFor, setDayPickerFor] = useState(null)

  // Quick "move this block on this date only" editor (when opened from a block)
  const [blockTime, setBlockTime] = useState(() => {
    if (!blockCtx) return null
    const cur =
      initial?.overrides?.[blockCtx.date]?.[blockCtx.idx] ??
      initial?.blocks?.[blockCtx.idx] ?? { start: '10:00', end: '12:00' }
    return { start: cur.start, end: cur.end }
  })

  const [confirmDelBlock, setConfirmDelBlock] = useState(false)

  const moveThisBlock = () => {
    const overrides = { ...(form.overrides || {}) }
    overrides[blockCtx.date] = {
      ...(overrides[blockCtx.date] || {}),
      [blockCtx.idx]: { start: blockTime.start, end: blockTime.end },
    }
    updateCourse(editId, { overrides })
    onClose()
  }

  // Remove just this block on just this day (per-date override flag).
  const deleteThisBlock = () => {
    const overrides = { ...(form.overrides || {}) }
    overrides[blockCtx.date] = {
      ...(overrides[blockCtx.date] || {}),
      [blockCtx.idx]: { deleted: true },
    }
    updateCourse(editId, { overrides })
    onClose()
  }

  const spanDef = COURSE_SPANS.find((s) => s.id === form.span)

  // days the course will cover, for availability hints
  const days = useMemo(
    () => (form.startDate ? courseDays(form) : []),
    [form.startDate, form.span],
  )

  // "YYYY-MM-DD" -> "D.M." (compact Czech day.month)
  const shortDate = (str) => {
    const [, m, d] = str.split('-')
    return `${Number(d)}.${Number(m)}.`
  }

  const availabilityFor = (inst) => {
    if (!days.length) return { status: 'unknown' }
    const covered = days.filter((d) => availabilityStatusOn(inst.id, d))
    const tentative = days.filter((d) => availabilityStatusOn(inst.id, d) === 'tentative').length
    if (covered.length === 0) return { status: 'none' }
    if (covered.length === days.length)
      return { status: tentative ? 'full-tentative' : 'full' }
    // Partial: not available on every course day.
    return { status: 'partial', covered: covered.length, total: days.length }
  }

  const toggleInstructor = (id) => {
    if (form.instructorIds.includes(id)) {
      // Unchecking clears any per-day restriction too.
      const map = { ...(form.instructorDays || {}) }
      delete map[id]
      set({ instructorIds: form.instructorIds.filter((x) => x !== id), instructorDays: map })
      if (dayPickerFor === id) setDayPickerFor(null)
    } else {
      set({ instructorIds: [...form.instructorIds, id] })
    }
  }

  // Weekday abbrev (Po, Út…) for a "YYYY-MM-DD".
  const WEEKDAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
  const weekdayShort = (str) => {
    const [y, m, d] = str.split('-').map(Number)
    return WEEKDAYS[new Date(y, m - 1, d).getDay()]
  }

  // Dates an instructor covers: explicit list if restricted, else all course days.
  const coveredDays = (id) => form.instructorDays?.[id] ?? days

  // Toggle one day on/off for an instructor. Full coverage again drops the key.
  const toggleDay = (id, d) => {
    const cur = form.instructorDays?.[id] ?? days
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]
    const map = { ...(form.instructorDays || {}) }
    if (next.length === days.length && days.every((x) => next.includes(x))) delete map[id]
    else map[id] = days.filter((x) => next.includes(x)) // keep in course-day order
    set({ instructorDays: map })
  }

  // Compact summary of a restricted instructor's days (null = full/baseline).
  const coverageSummary = (id) => {
    const cov = form.instructorDays?.[id]
    if (!cov) return null
    if (cov.length === 0) return '0 dní'
    const idxs = cov.map((d) => days.indexOf(d)).sort((a, b) => a - b)
    const contiguous = idxs.every((v, i) => i === 0 || v === idxs[i - 1] + 1)
    if (cov.length === 1) return `${weekdayShort(cov[0])} ${shortDate(cov[0])}`
    if (contiguous) return `${weekdayShort(days[idxs[0]])}–${weekdayShort(days[idxs[idxs.length - 1]])}`
    return `${cov.length} ${pluralDays(cov.length)}`
  }

  const setBlock = (idx, patch) =>
    set({ blocks: form.blocks.map((b, i) => (i === idx ? { ...b, ...patch } : b)) })
  const addBlock = () => set({ blocks: [...form.blocks, { start: '10:00', end: '12:00' }] })
  const removeBlock = (idx) => set({ blocks: form.blocks.filter((_, i) => i !== idx) })

  const conflicts = useMemo(
    () => courseConflictsFor(form, editId),
    [form, editId, courseConflictsFor],
  )

  const save = () => {
    if (conflicts.length > 0 && !confirmDouble) {
      setConfirmDouble(true)
      return
    }
    // Prune per-day coverage: keep only current course days + selected
    // instructors, and drop entries that now equal full coverage (baseline).
    const validDays = courseDays(form)
    const instructorDays = {}
    for (const [id, ds] of Object.entries(form.instructorDays || {})) {
      if (!form.instructorIds.includes(id)) continue
      const keep = validDays.filter((d) => ds.includes(d))
      if (keep.length === validDays.length) continue
      instructorDays[id] = keep
    }
    const payload = { ...form, instructorDays }
    if (editId) updateCourse(editId, payload)
    else addCourse(payload)
    onClose()
  }

  const canSave = form.startDate && form.blocks.length > 0

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
          <div className="flex items-center gap-2">
            <span className="rounded bg-sprout-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              Kurz
            </span>
            <h3 className="text-base font-semibold text-slate-800">
              {editId ? 'Upravit kurz' : 'Nový kurz'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Zavřít"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-auto px-5 py-4">
          {blockCtx && blockTime && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
              <div className="mb-2 text-xs font-semibold text-violet-800">
                Tento blok — {formatLongDate(blockCtx.date)}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className={inputCls}
                  value={blockTime.start}
                  onChange={(e) =>
                    setBlockTime((t) => ({ ...t, start: e.target.value }))
                  }
                />
                <span className="text-slate-400">–</span>
                <input
                  type="time"
                  className={inputCls}
                  value={blockTime.end}
                  onChange={(e) =>
                    setBlockTime((t) => ({ ...t, end: e.target.value }))
                  }
                />
                <button
                  onClick={moveThisBlock}
                  className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
                >
                  Přesunout blok
                </button>
              </div>
              <p className="mt-1 text-[11px] text-violet-700/70">
                Změní čas jen tohoto bloku a jen pro tento den. Úpravy níže mění
                celý rozvrh kurzu.
              </p>
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-violet-200 pt-2">
                {confirmDelBlock ? (
                  <>
                    <span className="mr-auto text-[11px] font-medium text-red-700">
                      Smazat tento blok jen pro tento den?
                    </span>
                    <button
                      onClick={() => setConfirmDelBlock(false)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Ne
                    </button>
                    <button
                      onClick={deleteThisBlock}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Smazat
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelBlock(true)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Smazat tento blok
                  </button>
                )}
              </div>
            </div>
          )}

          <Field label="Název kurzu">
            <input
              className={inputCls}
              placeholder="např. Windsurf kemp F1"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Disciplína">
              <select className={inputCls} value={form.type} onChange={(e) => set({ type: e.target.value })}>
                {COURSE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Úroveň">
              <select className={inputCls} value={form.level} onChange={(e) => set({ level: e.target.value })}>
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Délka">
              <select className={inputCls} value={form.span} onChange={(e) => set({ span: e.target.value })}>
                {COURSE_SPANS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={form.span === 'week' ? 'Libovolný den v týdnu' : 'Datum začátku'}>
              <input
                type="date"
                className={inputCls}
                value={form.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
              />
            </Field>
            <Field label="Počet účastníků">
              <input
                type="number"
                min="1"
                className={inputCls}
                value={form.people}
                onChange={(e) => set({ people: Number(e.target.value) })}
              />
            </Field>
            <Field label="Název skupiny (nepovinné)">
              <input
                className={inputCls}
                value={form.customerName}
                onChange={(e) => set({ customerName: e.target.value })}
              />
            </Field>
          </div>

          {form.startDate && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Trvá {days.length} {pluralDays(days.length)}:{' '}
              {form.span === 'week'
                ? `týden od ${formatLongDate(weekStart(form.startDate))} (po–ne)`
                : `${formatLongDate(days[0])}${days.length > 1 ? ` – ${formatLongDate(days[days.length - 1])}` : ''}`}
            </div>
          )}

          {/* daily time blocks */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Denní bloky</span>
              <button
                onClick={addBlock}
                className="text-xs font-medium text-coral-600 hover:text-coral-700"
              >
                + Přidat blok
              </button>
            </div>
            <div className="space-y-2">
              {form.blocks.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="time"
                    className={inputCls}
                    value={b.start}
                    onChange={(e) => setBlock(idx, { start: e.target.value })}
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="time"
                    className={inputCls}
                    value={b.end}
                    onChange={(e) => setBlock(idx, { end: e.target.value })}
                  />
                  {form.blocks.length > 1 && (
                    <button
                      onClick={() => removeBlock(idx)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100"
                      aria-label="Odebrat blok"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Výchozí 10:00–12:00 a 14:00–16:00. Platí pro každý den kurzu.
            </p>
          </div>

          {/* instructors */}
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Instruktoři (nepovinné — přidejte nyní nebo později, lze více)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {instructors.map((i) => {
                const status = availabilityFor(i)
                const checked = form.instructorIds.includes(i.id)
                const summary = checked ? coverageSummary(i.id) : null
                const open = dayPickerFor === i.id
                return (
                  <div
                    key={i.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                      checked ? 'border-coral-400 bg-coral-50' : 'border-slate-200 bg-white'
                    } ${open ? 'ring-2 ring-coral-200' : ''}`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleInstructor(i.id)}
                        className="accent-coral-500"
                      />
                      <span className="truncate">{i.name}</span>
                    </label>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {status.status === 'partial' && !summary && (
                        <span className="whitespace-nowrap text-[10px] font-medium text-amber-600">
                          {status.covered}/{status.total} dní
                        </span>
                      )}
                      {status.status === 'full-tentative' && !summary && (
                        <span className="whitespace-nowrap text-[10px] font-medium text-emerald-600">
                          předb.
                        </span>
                      )}
                      {status.status === 'none' && !checked && (
                        <span className="text-[10px] font-medium text-slate-400">nedostupný</span>
                      )}
                      {checked && days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDayPickerFor(open ? null : i.id)}
                          className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                            summary ? 'bg-coral-500 text-white' : 'text-coral-600 hover:bg-coral-100'
                          }`}
                        >
                          {summary ?? 'všechny dny'} ▾
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* per-day coverage picker for the expanded instructor */}
            {dayPickerFor && form.instructorIds.includes(dayPickerFor) && days.length > 1 && (
              <div className="mt-2 rounded-xl border border-coral-200 bg-coral-50/60 px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-coral-800">
                    Dny pro {instructorName(dayPickerFor)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDayPickerFor(null)}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
                  >
                    Hotovo
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {days.map((d) => {
                    const on = coveredDays(dayPickerFor).includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(dayPickerFor, d)}
                        className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${
                          on
                            ? 'border-coral-400 bg-coral-500 text-white'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        {weekdayShort(d)} {shortDate(d)}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1 text-[10px] text-coral-700/70">
                  Zrušte dny, kdy tento instruktor kurz nevede. Ostatní dny může
                  převzít jiný instruktor.
                </p>
              </div>
            )}

            <p className="mt-1 text-[11px] text-slate-400">
              Vybraní instruktoři jsou rezervováni na dny, které vedou — různí
              instruktoři mohou pokrýt různé dny kurzu.
            </p>
          </div>

          <Field label="Poznámka (nepovinné)">
            <textarea
              rows="2"
              className={inputCls}
              value={form.note}
              onChange={(e) => set({ note: e.target.value })}
            />
          </Field>

          {conflicts.length > 0 && (
            <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
              <div className="flex items-center gap-2 text-base font-bold text-red-700">
                <span className="text-xl">⚠️</span>
                Dvojitá rezervace!
              </div>
              <p className="mt-1 font-medium">
                {conflicts.length === 1
                  ? 'Instruktor má překrývající se rezervaci:'
                  : `${conflicts.length} překrývajících se rezervací:`}
              </p>
              <ul className="mt-1 list-inside list-disc font-medium">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    {instructorName(c.instructorId)} — {c.date} {c.startTime}: {c.with}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {editId ? (
            <button
              onClick={() => {
                deleteCourse(editId)
                onClose()
              }}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Smazat
            </button>
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
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
              >
                {editId ? 'Uložit kurz' : 'Vytvořit kurz'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
