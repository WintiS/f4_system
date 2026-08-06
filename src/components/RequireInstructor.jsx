import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

/**
 * Gate for an instructor's self-service profile:
 *  - no session -> /login
 *  - admin      -> /  (admins use the full dashboard, no instructor row)
 *  - instructor -> render children
 */
export default function RequireInstructor({ children }) {
  const { loading, session, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist text-sm text-slate-400">
        Načítání…
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/" replace />
  return children
}
