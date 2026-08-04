import { STATE_STYLES } from '../context/SchoolStore'

const ORDER = ['unassigned', 'assigned', 'rental']

export default function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
      {ORDER.map((key) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-full ${STATE_STYLES[key].dot}`} />
          <span>{STATE_STYLES[key].label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-1.5 rounded-sm bg-violet-500" />
        <span>Kurz (◆)</span>
      </div>
    </div>
  )
}
