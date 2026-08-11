import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

/**
 * Gate for the admin dashboard:
 *  - no session               -> /login
 *  - not admin/owner anywhere  -> /profil (instructor self-service)
 *  - admin of any school / owner -> render children (school picked inside)
 */
export default function RequireAdmin({ children }) {
  const { loading, session, isSuperadmin, hasAdminAnywhere } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist text-sm text-slate-400">
        Načítání…
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  if (!(isSuperadmin || hasAdminAnywhere)) return <Navigate to="/profil" replace />
  return children
}
