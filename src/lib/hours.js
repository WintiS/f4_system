// Work-log hour helpers. Logs carry `hours` (numeric) + `paidAt`
// (null while unpaid, timestamp once settled). Dates are 'YYYY-MM-DD'.

/** Sum `hours` across logs. */
export function sumHours(logs) {
  return logs.reduce((acc, l) => acc + (Number(l.hours) || 0), 0)
}

/** Minutes -> hours. */
export function minutesToHours(min) {
  return (Number(min) || 0) / 60
}

/** Format a number of hours for display, Czech decimal comma. e.g. 8,5 h */
export function formatHours(n) {
  const num = Number(n) || 0
  const rounded = Math.round(num * 10) / 10
  const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',')
  return `${s} h`
}

/** Czech label + tailwind chip classes for a manual log's paid state. */
export const PAID_STATUS = {
  unpaid: {
    label: 'Neproplaceno',
    chip: 'bg-amber-100 text-amber-700',
  },
  paid: {
    label: 'Proplaceno',
    chip: 'bg-emerald-100 text-emerald-700',
  },
}

/** Lesson/course `type` (Czech UI names) -> short discipline code. */
export const DISCIPLINE_CODE = {
  Wingfoil: 'wg',
  Windsurf: 'sf',
  Paddleboard: 'pb',
}

/** Bucket keys used across teaching breakdowns + payout snapshots. */
export const DISCIPLINES = ['wingfoil', 'windsurf', 'paddleboard']
/** discipline bucket -> short code for the `5.8.: wg 3h` row format. */
export const BUCKET_CODE = { wingfoil: 'wg', windsurf: 'sf', paddleboard: 'pb' }

/** Default rates (Kč/h) applied when an instructor has no override. */
export const DEFAULT_RATES = { workRate: 200, teachRate: 200, wgBonus: 50 }

/**
 * Payable amount in Kč for a set of hours + an instructor's rates.
 * Wingfoil teaching earns the teach rate plus the wingfoil bonus; windsurf and
 * paddleboard teaching earn the base teach rate; manual work earns the work rate.
 * Mirrors the server-side calc in the `record_payout` RPC.
 */
export function computeAmount({ wg = 0, sf = 0, pb = 0, manual = 0 }, rates) {
  const { workRate, teachRate, wgBonus } = { ...DEFAULT_RATES, ...(rates || {}) }
  return (
    wg * (teachRate + wgBonus) +
    (sf + pb) * teachRate +
    manual * workRate
  )
}

/** Format an amount as Czech koruna, e.g. 1 250 Kč (space thousands, no decimals). */
export function formatCzk(n) {
  const num = Math.round(Number(n) || 0)
  return `${num.toLocaleString('cs-CZ').replace(/ /g, ' ')} Kč`
}
