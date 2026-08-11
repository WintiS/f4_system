import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useActiveSchool } from '../context/ActiveSchool'

/** name -> url-safe slug (strips Czech diacritics). */
function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Platform-owner surface: create schools (new locations) and manage each
 * school's members (assign school admins / instructors). Only rendered for the
 * superadmin; the create/membership writes are guarded server-side too.
 */
export default function SchoolsAdmin() {
  const { schools, activeSchoolId, setActiveSchool, reloadSchools } = useActiveSchool()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null) // schoolId whose members are open

  const onName = (v) => {
    setName(v)
    if (!slugEdited) setSlug(slugify(v))
  }

  const createSchool = async (e) => {
    e.preventDefault()
    setError('')
    const cleanName = name.trim()
    const cleanSlug = slugify(slug || cleanName)
    if (!cleanName || !cleanSlug) return setError('Vyplňte název i adresu (slug).')
    setBusy(true)
    const { data, error } = await supabase.rpc('create_school', {
      p_name: cleanName,
      p_slug: cleanSlug,
    })
    setBusy(false)
    if (error) return setError(error.message)
    setName(''); setSlug(''); setSlugEdited(false)
    await reloadSchools()
    if (data?.id) setActiveSchool(data.id)
  }

  return (
    <div className="space-y-6">
      {/* create */}
      <form
        onSubmit={createSchool}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 font-display text-base font-semibold text-sea-900">Nová škola</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-slate-600">Název lokality</span>
            <input
              value={name}
              onChange={(e) => onName(e.target.value)}
              placeholder="např. Brno – Přehrada"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sea-400 focus:outline-none"
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-slate-600">Adresa (slug)</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugEdited(true)
              }}
              placeholder="brno-prehrada"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm focus:border-sea-400 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-coral-600 disabled:opacity-60"
          >
            {busy ? 'Vytváření…' : 'Vytvořit'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Registrace instruktorů poběží na <span className="font-mono">/signup/{slug || 'slug'}</span>,
          nástěnka na <span className="font-mono">/den/{slug || 'slug'}</span>.
        </p>
        {error && <p className="mt-2 text-sm text-coral-600">{error}</p>}
      </form>

      {/* list */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Škola</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 text-right font-semibold">Akce</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <SchoolRow
                key={s.id}
                school={s}
                isActive={s.id === activeSchoolId}
                isOpen={expanded === s.id}
                onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                onSwitch={() => setActiveSchool(s.id)}
              />
            ))}
            {schools.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400">
                  Zatím žádné školy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SchoolRow({ school, isActive, isOpen, onToggle, onSwitch }) {
  return (
    <>
      <tr className="border-b border-slate-100">
        <td className="px-4 py-3">
          <span className="font-medium text-slate-800">{school.name}</span>
          {isActive && (
            <span className="ml-2 rounded-full bg-sea-100 px-2 py-0.5 text-[10px] font-semibold text-sea-700">
              Aktivní
            </span>
          )}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-slate-500">{school.slug}</td>
        <td className="px-4 py-3 text-right">
          <div className="inline-flex gap-2">
            {!isActive && (
              <button
                onClick={onSwitch}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Přepnout
              </button>
            )}
            <button
              onClick={onToggle}
              className="rounded-lg bg-sea-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sea-800"
            >
              {isOpen ? 'Zavřít' : 'Uživatelé'}
            </button>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-slate-50/60">
          <td colSpan={3} className="px-4 py-4">
            <MembersEditor schoolId={school.id} />
          </td>
        </tr>
      )}
    </>
  )
}

/** Members of one school: list, add by e-mail, change role, remove. */
function MembersEditor({ schoolId }) {
  const [rows, setRows] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('instructor')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('memberships')
      .select('id, role, user_id, profiles ( email )')
      .eq('school_id', schoolId)
    setRows(
      (data ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        userId: m.user_id,
        email: m.profiles?.email ?? m.user_id,
      })),
    )
  }, [schoolId])

  useEffect(() => {
    load()
  }, [load])

  const addMember = async (e) => {
    e.preventDefault()
    setError('')
    const clean = email.trim().toLowerCase()
    if (!clean) return
    setBusy(true)
    const { data: prof } = await supabase
      .from('profiles').select('id').eq('email', clean).maybeSingle()
    if (!prof) {
      setBusy(false)
      return setError('Uživatel s tímto e-mailem nemá účet.')
    }
    const { error } = await supabase
      .from('memberships')
      .upsert({ user_id: prof.id, school_id: schoolId, role }, { onConflict: 'user_id,school_id' })
    setBusy(false)
    if (error) return setError(error.message)
    setEmail('')
    load()
  }

  const changeRole = async (id, nextRole) => {
    await supabase.from('memberships').update({ role: nextRole }).eq('id', id)
    load()
  }
  const removeMember = async (id) => {
    await supabase.from('memberships').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {rows.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
          >
            <span className="font-medium text-slate-700">{m.email}</span>
            <select
              value={m.role}
              onChange={(e) => changeRole(m.id, e.target.value)}
              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
            >
              <option value="instructor">instruktor</option>
              <option value="admin">administrátor</option>
            </select>
            <button
              onClick={() => removeMember(m.id)}
              title="Odebrat ze školy"
              className="text-slate-400 transition hover:text-coral-600"
            >
              ✕
            </button>
          </span>
        ))}
        {rows.length === 0 && <span className="text-xs text-slate-400">Zatím žádní členové.</span>}
      </div>

      <form onSubmit={addMember} className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          <span className="mb-1 block font-medium text-slate-500">E-mail existujícího účtu</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jan@example.cz"
            className="w-64 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-sea-400 focus:outline-none"
          />
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="instructor">instruktor</option>
          <option value="admin">administrátor</option>
        </select>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-coral-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-60"
        >
          Přidat
        </button>
      </form>
      {error && <p className="text-xs text-coral-600">{error}</p>}
    </div>
  )
}
