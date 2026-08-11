import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useActiveSchool } from '../context/ActiveSchool'

/**
 * Admin user management, scoped to the active school. Lists that school's
 * members (from `memberships`) and lets an admin promote/demote them between
 * administrator and instructor. New members join via signup or the owner's
 * Školy tab; here their in-school role is tuned.
 */
export default function UsersAdmin() {
  const { activeSchoolId } = useActiveSchool()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!activeSchoolId) return setRows([])
    const { data, error } = await supabase
      .from('memberships')
      .select('id, role, user_id, created_at, profiles ( email )')
      .eq('school_id', activeSchoolId)
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else
      setRows(
        (data ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          email: m.profiles?.email ?? m.user_id,
        })),
      )
  }, [activeSchoolId])

  useEffect(() => {
    load()
  }, [load])

  const setRole = async (id, role) => {
    setBusyId(id)
    setError('')
    const { error } = await supabase.from('memberships').update({ role }).eq('id', id)
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-semibold">Uživatel</th>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 text-right font-semibold">Přístup</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3">
                <span className="font-medium text-slate-800">{u.email}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    u.role === 'admin'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {u.role === 'admin' ? 'administrátor' : 'instruktor'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {u.role === 'admin' ? (
                  <button
                    disabled={busyId === u.id}
                    onClick={() => setRole(u.id, 'instructor')}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Odebrat práva
                  </button>
                ) : (
                  <button
                    disabled={busyId === u.id}
                    onClick={() => setRole(u.id, 'admin')}
                    className="rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-coral-600 disabled:opacity-60"
                  >
                    Udělit práva
                  </button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400">
                Tato škola zatím nemá žádné uživatele.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {error && <p className="px-4 py-3 text-sm text-coral-600">{error}</p>}
    </div>
  )
}
