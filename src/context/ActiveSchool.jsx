import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

const ActiveSchoolContext = createContext(null)
const LS_KEY = 'f4_active_school'

/**
 * Tracks which school the app is currently operating on ("current school").
 * A signed-in user defaults to their own (first / last-chosen) school; the
 * platform owner can switch between all schools. Public routes (/den, /signup)
 * set it explicitly from the URL slug via `setActiveSchool(id, false)`.
 */
export function ActiveSchoolProvider({ children }) {
  const { user, memberships, isSuperadmin, loading: authLoading } = useAuth()
  const [allSchools, setAllSchools] = useState([]) // [{ id, name, slug }]
  // Restore the last-chosen school synchronously so a page refresh keeps it
  // (avoids a null-then-default race that would clobber the saved choice).
  const [activeSchoolId, setActiveSchoolId] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY)
    } catch {
      return null
    }
  })

  const reloadSchools = useCallback(async () => {
    const { data } = await supabase
      .from('schools')
      .select('id, name, slug')
      .order('created_at', { ascending: true })
    setAllSchools((data ?? []).map((s) => ({ id: s.id, name: s.name, slug: s.slug })))
  }, [])

  useEffect(() => {
    reloadSchools()
  }, [reloadSchools])

  // Keep the switcher fresh when schools are created / renamed elsewhere.
  useEffect(() => {
    const ch = supabase
      .channel('schools-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schools' }, reloadSchools)
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [reloadSchools])

  // Schools this user may pick between (all for the owner, else their memberships).
  const schools = useMemo(() => {
    if (isSuperadmin) return allSchools
    const mine = new Set(memberships.map((m) => m.schoolId))
    return allSchools.filter((s) => mine.has(s.id))
  }, [allSchools, memberships, isSuperadmin])

  const setActiveSchool = useCallback((id, persist = true) => {
    setActiveSchoolId(id)
    if (persist && id) {
      try {
        localStorage.setItem(LS_KEY, id)
      } catch {
        /* ignore storage errors */
      }
    }
  }, [])

  // Default the active school for a signed-in user once schools + memberships
  // resolve. Wait for the visible-schools list so we never transiently clear a
  // validly-restored id (which would revert the choice on refresh).
  useEffect(() => {
    if (authLoading || !user || !schools.length) return
    if (activeSchoolId && schools.some((s) => s.id === activeSchoolId)) return
    let stored = null
    try {
      stored = localStorage.getItem(LS_KEY)
    } catch {
      /* ignore */
    }
    const next = (stored && schools.some((s) => s.id === stored) && stored) || schools[0].id
    if (next !== activeSchoolId) setActiveSchool(next)
  }, [authLoading, user, schools, activeSchoolId, setActiveSchool])

  const resolveSlug = useCallback(
    async (slug) => {
      const cached = allSchools.find((s) => s.slug === slug)
      if (cached) return cached
      const { data } = await supabase
        .from('schools')
        .select('id, name, slug')
        .eq('slug', slug)
        .maybeSingle()
      return data ? { id: data.id, name: data.name, slug: data.slug } : null
    },
    [allSchools],
  )

  const value = useMemo(
    () => ({
      activeSchoolId,
      activeSchool:
        schools.find((s) => s.id === activeSchoolId) ??
        allSchools.find((s) => s.id === activeSchoolId) ??
        null,
      schools,
      setActiveSchool,
      reloadSchools,
      resolveSlug,
    }),
    [activeSchoolId, schools, allSchools, setActiveSchool, reloadSchools, resolveSlug],
  )

  return <ActiveSchoolContext.Provider value={value}>{children}</ActiveSchoolContext.Provider>
}

export function useActiveSchool() {
  const ctx = useContext(ActiveSchoolContext)
  if (!ctx) throw new Error('useActiveSchool must be used within ActiveSchoolProvider')
  return ctx
}
