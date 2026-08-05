import { useState } from 'react'
import { useSchool } from '../context/SchoolStore'
import { LESSON_TYPES, LEVELS } from '../data/mock'
import { pluralPeople, formatLongDate } from '../lib/time'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-100'

export default function RequestsInbox({ onAssign }) {
  const { requests, addRequest, deleteRequest } = useSchool()
  const [draft, setDraft] = useState({
    type: LESSON_TYPES[0],
    level: LEVELS[0],
    people: 1,
    customerName: '',
    preferredDate: '',
    preferredTime: '',
    note: '',
  })

  const submit = (e) => {
    e.preventDefault()
    addRequest({ ...draft, people: Number(draft.people) })
    setDraft({
      type: LESSON_TYPES[0],
      level: LEVELS[0],
      people: 1,
      customerName: '',
      preferredDate: '',
      preferredTime: '',
      note: '',
    })
  }

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* intake form */}
      <form
        onSubmit={submit}
        className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white shadow-card p-5"
      >
        <h3 className="text-sm font-semibold text-slate-800">Zaznamenat poptávku</h3>
        <p className="text-xs text-slate-400">
          Rychle zaznamenejte telefonickou poptávku. Instruktora a čas přiřaďte později.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Typ</span>
            <select className={inputCls} value={draft.type} onChange={(e) => set({ type: e.target.value })}>
              {LESSON_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Úroveň</span>
            <select className={inputCls} value={draft.level} onChange={(e) => set({ level: e.target.value })}>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Počet osob</span>
            <input
              type="number"
              min="1"
              className={inputCls}
              value={draft.people}
              onChange={(e) => set({ people: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Jméno (nepovinné)</span>
            <input
              className={inputCls}
              value={draft.customerName}
              onChange={(e) => set({ customerName: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Preferované datum</span>
            <input
              type="date"
              className={inputCls}
              value={draft.preferredDate}
              onChange={(e) => set({ preferredDate: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Preferovaný čas</span>
            <input
              type="time"
              className={inputCls}
              value={draft.preferredTime}
              onChange={(e) => set({ preferredTime: e.target.value })}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Poznámka (nepovinné)</span>
          <textarea
            rows="2"
            className={inputCls}
            placeholder="Preferovaný den/čas, kontakt atd."
            value={draft.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600"
        >
          Přidat do schránky
        </button>
      </form>

      {/* pending list */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Nenaplánované poptávky</h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {requests.length}
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 px-4 py-12 text-center text-sm text-slate-400">
            Schránka je prázdná — zaznamenané poptávky se zde zobrazí, dokud nejsou naplánovány.
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white shadow-card p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{r.type}</span>
                    <span className="text-xs text-slate-500">{r.level}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {r.people} {pluralPeople(r.people)}
                    </span>
                    {r.customerName && (
                      <span className="text-xs text-slate-500">· {r.customerName}</span>
                    )}
                  </div>
                  {(r.preferredDate || r.preferredTime) && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-sea-700">
                      <span>🗓</span>
                      <span>
                        {r.preferredDate && formatLongDate(r.preferredDate)}
                        {r.preferredDate && r.preferredTime && ' · '}
                        {r.preferredTime}
                      </span>
                    </div>
                  )}
                  {r.note && <p className="mt-1 text-xs text-slate-500">{r.note}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => onAssign(r)}
                    className="rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-coral-600"
                  >
                    Přiřadit
                  </button>
                  <button
                    onClick={() => deleteRequest(r.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                  >
                    Zahodit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
