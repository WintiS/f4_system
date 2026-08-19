import { useEffect, useState } from 'react'
import { useSchool } from '../context/SchoolStore'
import AvailabilityGrid from './AvailabilityGrid'

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

/**
 * One pending self-signup row: approve as a fresh instructor, or merge into an
 * existing manually-added placeholder so its work history + pay follow along.
 */
function PendingRow({ instructor, manualInstructors, onApprove, onMerge }) {
  const [mode, setMode] = useState('idle') // 'idle' | 'merge'
  const [manualId, setManualId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const doMerge = async () => {
    if (!manualId) return
    setBusy(true)
    setError('')
    const err = await onMerge(manualId)
    setBusy(false)
    // On success realtime approves the signup and this row unmounts; on failure
    // it stays put so we surface the reason.
    if (err) setError(err.message || 'Sloučení se nezdařilo.')
  }

  const chosen = manualInstructors.find((m) => m.id === manualId)

  return (
    <li className="px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">{instructor.name}</span>
        {mode === 'idle' ? (
          <div className="flex items-center gap-2">
            {manualInstructors.length > 0 && (
              <button
                onClick={() => setMode('merge')}
                className="rounded-lg border border-sea-300 bg-white px-3 py-1.5 text-xs font-semibold text-sea-700 transition hover:bg-sea-50"
              >
                Sloučit s ručně přidaným
              </button>
            )}
            <button
              onClick={onApprove}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
            >
              Schválit
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              className={`${inputCls} text-xs`}
            >
              <option value="">Vyber instruktora…</option>
              {manualInstructors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button
              onClick={doMerge}
              disabled={!manualId || busy}
              className="rounded-lg bg-sea-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sea-800 disabled:opacity-50"
            >
              {busy ? 'Slučuji…' : 'Sloučit a schválit'}
            </button>
            <button
              onClick={() => {
                setMode('idle')
                setManualId('')
                setError('')
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Zrušit
            </button>
          </div>
        )}
      </div>

      {mode === 'merge' && (
        <p className="mt-2 text-xs text-slate-500">
          {chosen ? (
            <>
              Historie i platby profilu <b className="text-slate-700">{chosen.name}</b> se
              převedou na účet <b className="text-slate-700">{instructor.name}</b> a ručně
              přidaný profil se smaže. Nelze vrátit.
            </>
          ) : (
            'Vyber ručně přidaný profil, jehož historii má nový účet převzít.'
          )}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-coral-600">{error}</p>}
    </li>
  )
}

/** Small "W" toggle marking whether an instructor also teaches wing. */
function WingToggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      title={on ? 'Učí i wing — klikni pro zrušení' : 'Označit, že učí i wing'}
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
        on ? 'bg-wingteal-500 text-white' : 'border border-slate-200 text-slate-300 hover:text-slate-500'
      }`}
    >
      W
    </button>
  )
}

export default function AvailabilityEditor() {
  const {
    instructors,
    pendingInstructors,
    updateInstructor,
    addInstructor,
    approveInstructor,
    mergeInstructor,
    deleteInstructor,
  } = useSchool()
  const manualInstructors = instructors.filter((i) => i.origin === 'manual')

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
              <PendingRow
                key={i.id}
                instructor={i}
                manualInstructors={manualInstructors}
                onApprove={() => approveInstructor(i.id)}
                onMerge={(manualId) => mergeInstructor(manualId, i.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Per-day availability grid — the primary availability tool */}
      <AvailabilityGrid />

      {/* Roster management: rename, wing flag, add & delete instructors */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-800">Správa instruktorů</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Přejmenování, označení „učí i wing" a mazání. Dostupnost jednotlivých dní
            se nastavuje v mřížce nahoře.
          </p>
        </div>

        <table className="hidden w-full text-sm sm:table">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
              <th className="px-5 py-2">Instruktor</th>
              <th className="px-5 py-2">Původ</th>
              <th className="px-5 py-2">Wing</th>
              <th className="px-5 py-2 text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {instructors.map((i) => {
              const isManual = i.origin === 'manual'
              return (
                <tr key={i.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3">
                    <NameCell name={i.name} onSave={(name) => updateInstructor(i.id, { name })} />
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
                    <WingToggle
                      on={i.teachesWing}
                      onClick={() => updateInstructor(i.id, { teachesWing: !i.teachesWing })}
                    />
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
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">
                  Zatím žádní instruktoři.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile: card list (table is unreadable on narrow screens) */}
        <ul className="divide-y divide-slate-100 sm:hidden">
          {instructors.map((i) => {
            const isManual = i.origin === 'manual'
            return (
              <li key={i.id} className="space-y-3 px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <NameCell name={i.name} onSave={(name) => updateInstructor(i.id, { name })} />
                  </div>
                  <WingToggle
                    on={i.teachesWing}
                    onClick={() => updateInstructor(i.id, { teachesWing: !i.teachesWing })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  {isManual ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Ručně přidán
                    </span>
                  ) : (
                    <span className="rounded-full bg-sea-100 px-2 py-0.5 text-xs font-medium text-sea-700">
                      Registrace
                    </span>
                  )}
                  {isManual &&
                    (confirmId === i.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-slate-500">Smazat?</span>
                        <button
                          onClick={() => {
                            deleteInstructor(i.id)
                            setConfirmId(null)
                          }}
                          className="rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-semibold text-white transition active:bg-coral-600"
                        >
                          Ano
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition active:bg-slate-50"
                        >
                          Ne
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmId(i.id)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition active:bg-slate-50"
                      >
                        Smazat
                      </button>
                    ))}
                </div>
              </li>
            )
          })}
          {instructors.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-400">
              Zatím žádní instruktoři.
            </li>
          )}
        </ul>

        {/* Manual add */}
        <form
          onSubmit={onAdd}
          className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-4 sm:px-5"
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
      </div>
    </div>
  )
}
