import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

/**
 * Gate for an instructor's self-service profile:
 *  - no session               -> /login
 *  - admin of any school/owner -> /  (they use the full dashboard)
 *  - pure instructor           -> render children
 */
export default function RequireInstructor({ children }) {
  const { loading, session, isSuperadmin, hasAdminAnywhere } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist text-sm text-slate-400">
        Načítání…
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  if (isSuperadmin || hasAdminAnywhere) return <Navigate to="/" replace />
  return children
}
