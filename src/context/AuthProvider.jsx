import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

/**
 * Holds the current auth session and the caller's profile row (role gate).
 * Exposes signIn / signUp / signOut. `loading` covers the initial session +
 * profile fetch so guards can avoid flashing the login screen.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [memberships, setMemberships] = useState([]) // [{ schoolId, role }]
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      setMemberships([])
      return
    }
    // Profile (incl. platform-owner flag) + this user's per-school memberships.
    const [{ data: prof }, { data: mems }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, role, is_primary, is_superadmin')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('memberships')
        .select('school_id, role')
        .eq('user_id', userId),
    ])
    setProfile(prof ?? null)
    setMemberships((mems ?? []).map((m) => ({ schoolId: m.school_id, role: m.role })))
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next)
      await loadProfile(next?.user?.id)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password, firstName, lastName, schoolId) =>
    supabase.auth.signUp({
      email,
      password,
      // school_id lands in raw_user_meta_data; the handle_new_user trigger reads
      // it to file the new instructor + membership under the right school.
      options: { data: { first_name: firstName, last_name: lastName, school_id: schoolId ?? null } },
    })

  const signOut = () => supabase.auth.signOut()

  const isSuperadmin = !!profile?.is_superadmin

  /** This user's role in a given school. Superadmin acts as admin everywhere. */
  const roleAt = useCallback(
    (schoolId) => {
      if (isSuperadmin) return 'admin'
      if (!schoolId) return null
      return memberships.find((m) => m.schoolId === schoolId)?.role ?? null
    },
    [isSuperadmin, memberships],
  )

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    memberships,
    isSuperadmin,
    roleAt,
    // True once the session + profile + memberships have loaded, so it's an
    // instructor-only account exactly when it has memberships but no admin role
    // anywhere and isn't the platform owner.
    hasAdminAnywhere: isSuperadmin || memberships.some((m) => m.role === 'admin'),
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile: () => loadProfile(session?.user?.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
