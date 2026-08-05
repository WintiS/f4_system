import { useEffect, useState } from 'react'
import { useSchool } from '../context/SchoolStore'
import { formatLongDate, todayStr, dateInRange } from '../lib/time'

const inputCls =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-100'

/** Inline-editable instructor name. Commits on blur/Enter only if changed. */
function NameCell({ name, onSave }) {
  const [draft, setDraft] = useState(name)

  // Keep local draft in sync when the underlying name changes elsewhere.
  useEffect(() => setDraft(name), [name])

  const commit = () => {
    const next = draft.trim()
    if (!next || next === name) {
      setDraft(name)
      return
    }
    onSave(next)
  }

  return (
    <input
      type="text"
      className={`${inputCls} w-full font-medium text-slate-800`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(name)
      }}
    />
  )
}

export default function AvailabilityEditor() {
  const {
    instructors,
    pendingInstructors,
    updateInstructor,
    addInstructor,
    approveInstructor,
    deleteInstructor,
  } = useSchool()
  const today = todayStr()

  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  const onAdd = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    await addInstructor({ name })
    setAdding(false)
    setNewName('')
  }

  return (
    <div className="space-y-6">
      {/* Pending self-signups awaiting approval */}
      {pendingInstructors.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 shadow-card">
          <div className="border-b border-amber-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-amber-800">
              Čekající na schválení
            </h3>
            <p className="mt-0.5 text-xs text-amber-600">
              Instruktoři, kteří se zaregistrovali. Po schválení se objeví v seznamu níže.
            </p>
          </div>
          <ul className="divide-y divide-amber-100">
            {pendingInstructors.map((i) => (
              <li key={i.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium text-slate-800">{i.name}</span>
                <button
                  onClick={() => approveInstructor(i.id)}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                >
                  Schválit
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Roster + manual add */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-800">Dostupnost instruktorů</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Nastavte období, kdy každý instruktor pracuje. Lekce lze přiřadit jen
            instruktorům, jejichž období daný den pokrývá.
          </p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
              <th className="px-5 py-2">Instruktor</th>
              <th className="px-5 py-2">Původ</th>
              <th className="px-5 py-2">Pracuje od</th>
              <th className="px-5 py-2">Pracuje do</th>
              <th className="px-5 py-2">Stav dnes</th>
              <th className="px-5 py-2 text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {instructors.map((i) => {
              const onNow = dateInRange(today, i.workFrom, i.workTo)
              const isManual = i.origin === 'manual'
              return (
                <tr key={i.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3">
                    <NameCell
                      name={i.name}
                      onSave={(name) => updateInstructor(i.id, { name })}
                    />
                  </td>
                  <td className="px-5 py-3">
                    {isManual ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Ručně přidán
                      </span>
                    ) : (
                      <span className="rounded-full bg-sea-100 px-2 py-0.5 text-xs font-medium text-sea-700">
                        Registrace
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="date"
                      className={inputCls}
                      value={i.workFrom}
                      onChange={(e) => updateInstructor(i.id, { workFrom: e.target.value })}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="date"
                      className={inputCls}
                      value={i.workTo}
                      onChange={(e) => updateInstructor(i.id, { workTo: e.target.value })}
                    />
                  </td>
                  <td className="px-5 py-3">
                    {onNow ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Pracuje
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Volno
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {isManual &&
                      (confirmId === i.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-slate-500">Smazat?</span>
                          <button
                            onClick={() => {
                              deleteInstructor(i.id)
                              setConfirmId(null)
                            }}
                            className="rounded-lg bg-coral-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-coral-600"
                          >
                            Ano
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Ne
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(i.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Smazat
                        </button>
                      ))}
                  </td>
                </tr>
              )
            })}
            {instructors.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                  Zatím žádní instruktoři.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Manual add */}
        <form
          onSubmit={onAdd}
          className="flex items-center gap-2 border-t border-slate-100 px-5 py-4"
        >
          <input
            type="text"
            placeholder="Jméno instruktora"
            className={`${inputCls} flex-1`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-coral-600 disabled:opacity-60"
          >
            Přidat instruktora
          </button>
        </form>

        <div className="px-5 py-3 text-xs text-slate-400">
          Dnes je {formatLongDate(today)}.
        </div>
      </div>
    </div>
  )
}
