import { useAuth } from '../context/AuthProvider'
import { AuthShell } from './Login'

export default function PendingAccess() {
  const { user, signOut, refreshProfile } = useAuth()
  return (
    <AuthShell title="Čeká na schválení" subtitle={user?.email}>
      <p className="text-sm text-slate-600">
        Váš instruktorský účet je aktivní, ale správce školy vám zatím neudělil přístup
        do administrace. Zkuste to znovu po schválení.
      </p>
      <div className="mt-6 flex gap-2">
        <button
          onClick={refreshProfile}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Zkontrolovat znovu
        </button>
        <button
          onClick={signOut}
          className="flex-1 rounded-xl bg-sea-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-800"
        >
          Odhlásit se
        </button>
      </div>
    </AuthShell>
  )
}
