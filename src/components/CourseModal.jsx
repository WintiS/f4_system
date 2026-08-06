import { useMemo, useState } from 'react'
import { useSchool, courseDays } from '../context/SchoolStore'
import { COURSE_TYPES, LEVELS, COURSE_SPANS, DEFAULT_COURSE_BLOCKS } from '../data/mock'
import { dateInRange, weekStart, formatLongDate, pluralDays } from '../lib/time'

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
  const { instructors, addCourse, updateCourse, deleteCourse, courseConflictsFor, instructorName } =
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
    ...initial,
  }))

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // Quick "move this block on this date only" editor (when opened from a block)
  const [blockTime, setBlockTime] = useState(() => {
    if (!blockCtx) return null
    const cur =
      initial?.overrides?.[blockCtx.date]?.[blockCtx.idx] ??
      initial?.blocks?.[blockCtx.idx] ?? { start: '10:00', end: '12:00' }
    return { start: cur.start, end: cur.end }
  })

  const moveThisBlock = () => {
    const overrides = { ...(form.overrides || {}) }
    overrides[blockCtx.date] = {
      ...(overrides[blockCtx.date] || {}),
      [blockCtx.idx]: { start: blockTime.start, end: blockTime.end },
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
    const covered = days.filter((d) => dateInRange(d, inst.workFrom, inst.workTo))
    if (covered.length === 0) return { status: 'none' }
    if (covered.length === days.length) return { status: 'full' }
    // Partial: report the days they're actually available so the admin sees
    // from/until when (whichever end cuts into the course window).
    const first = days[0]
    const last = days[days.length - 1]
    return {
      status: 'partial',
      startsLate: inst.workFrom > first ? covered[0] : null,
      endsEarly: inst.workTo < last ? covered[covered.length - 1] : null,
    }
  }

  const toggleInstructor = (id) =>
    set({
      instructorIds: form.instructorIds.includes(id)
        ? form.instructorIds.filter((x) => x !== id)
        : [...form.instructorIds, id],
    })

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
    if (editId) updateCourse(editId, form)
    else addCourse(form)
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
                return (
                  <label
                    key={i.id}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                      checked ? 'border-coral-400 bg-coral-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleInstructor(i.id)}
                        className="accent-coral-500"
                      />
                      {i.name}
                    </span>
                    {status.status === 'partial' && (
                      <span className="whitespace-nowrap text-right text-[10px] font-medium text-amber-600">
                        {[
                          status.startsLate && `od ${shortDate(status.startsLate)}`,
                          status.endsEarly && `do ${shortDate(status.endsEarly)}`,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      </span>
                    )}
                    {status.status === 'none' && (
                      <span className="text-[10px] font-medium text-slate-400">volno</span>
                    )}
                  </label>
                )
              })}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Vybraní instruktoři jsou rezervováni na tyto bloky po všechny dny kurzu,
              i když nemají naplánovanou celou dobu.
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
