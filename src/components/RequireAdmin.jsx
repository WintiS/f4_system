import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import PendingAccess from '../pages/PendingAccess'

/**
 * Gate for the admin dashboard:
 *  - no session      -> /login
 *  - session, non-admin -> pending-access screen
 *  - admin           -> render children
 */
export default function RequireAdmin({ children }) {
  const { loading, session, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist text-sm text-slate-400">
        Načítání…
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <PendingAccess />
  return children
}
