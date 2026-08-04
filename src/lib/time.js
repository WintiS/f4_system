// Time + date helpers. All times are 'HH:MM' 24h strings; dates are 'YYYY-MM-DD'.

export const DAY_START_MIN = 10 * 60 // 10:00
export const DAY_END_MIN = 18 * 60 // 18:00

/** 'HH:MM' -> minutes since midnight */
export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** minutes since midnight -> 'HH:MM' */
export function toHHMM(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Two [start,end) minute ranges overlap? */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

/** Is dateStr within [from,to] inclusive? All 'YYYY-MM-DD'. */
export function dateInRange(dateStr, from, to) {
  return dateStr >= from && dateStr <= to
}

/* ---- Date object helpers (local, no timezone drift) ---- */

export function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDateStr(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(dateStr, n) {
  const d = fromDateStr(dateStr)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export function todayStr() {
  return toDateStr(new Date())
}

const WEEKDAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
const MONTHS = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec',
]
const MONTHS_SHORT = [
  'led', 'úno', 'bře', 'dub', 'kvě', 'čvn',
  'čvc', 'srp', 'zář', 'říj', 'lis', 'pro',
]

/** Czech plural for counts of people: 1 osoba, 2–4 osoby, jinak osob. */
export function pluralPeople(n) {
  return n === 1 ? 'osoba' : n >= 2 && n <= 4 ? 'osoby' : 'osob'
}

/** Czech plural for counts of days: 1 den, 2–4 dny, jinak dní. */
export function pluralDays(n) {
  return n === 1 ? 'den' : n >= 2 && n <= 4 ? 'dny' : 'dní'
}

/** e.g. 'Po 3. srp 2026' */
export function formatLongDate(dateStr) {
  const d = fromDateStr(dateStr)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export function monthLabel(dateStr) {
  const d = fromDateStr(dateStr)
  const m = MONTHS[d.getMonth()]
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`
}

/**
 * Build a month grid (weeks of 7 day-strings) covering the month of dateStr,
 * padded to whole weeks starting Monday. Days outside the month included so the
 * grid is rectangular; caller can dim them.
 */
export function monthGrid(dateStr) {
  const d = fromDateStr(dateStr)
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  // Monday-first offset: JS getDay() Sun=0..Sat=6
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - offset)

  const weeks = []
  let cur = new Date(start)
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let i = 0; i < 7; i++) {
      week.push({
        dateStr: toDateStr(cur),
        inMonth: cur.getMonth() === d.getMonth(),
        isToday: toDateStr(cur) === todayStr(),
      })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
    // stop early if next week is fully past the month
    if (cur.getMonth() !== d.getMonth() && cur > d && w >= 3) {
      const anyInMonth = weeks[weeks.length - 1].some((x) => x.inMonth)
      if (!anyInMonth) {
        weeks.pop()
        break
      }
    }
  }
  return weeks
}

export const WEEKDAY_LABELS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

/** Monday-first date string for the week containing dateStr. */
export function weekStart(dateStr) {
  const d = fromDateStr(dateStr)
  const offset = (d.getDay() + 6) % 7 // Mon=0..Sun=6
  d.setDate(d.getDate() - offset)
  return toDateStr(d)
}

/** 7 day-strings Mon..Sun for the week containing dateStr. */
export function weekDays(dateStr) {
  const start = weekStart(dateStr)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** e.g. '28 Jul – 3 Aug 2026' */
export function weekRangeLabel(dateStr) {
  const days = weekDays(dateStr)
  const a = fromDateStr(days[0])
  const b = fromDateStr(days[6])
  const mon = (d) => MONTHS_SHORT[d.getMonth()]
  const left =
    a.getMonth() === b.getMonth()
      ? `${a.getDate()}`
      : `${a.getDate()} ${mon(a)}`
  return `${left} – ${b.getDate()} ${mon(b)} ${b.getFullYear()}`
}
