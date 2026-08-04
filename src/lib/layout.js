import { toMinutes } from './time'

/**
 * Pack overlapping lessons into side-by-side columns.
 * Returns map lessonId -> { col, cols } where cols = width of its overlap group.
 * Shared by Day and Week views.
 */
export function layoutColumns(lessons) {
  const sorted = [...lessons].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
  )
  const result = {}
  let group = []
  let groupEnd = -1

  const flush = () => {
    if (!group.length) return
    const colEnds = [] // end-minute of last lesson in each column
    for (const l of group) {
      const s = toMinutes(l.startTime)
      const e = s + l.durationMin
      let col = colEnds.findIndex((end) => end <= s)
      if (col === -1) {
        col = colEnds.length
        colEnds.push(e)
      } else {
        colEnds[col] = e
      }
      result[l.id] = { col }
    }
    const cols = colEnds.length
    for (const l of group) result[l.id].cols = cols
    group = []
    groupEnd = -1
  }

  for (const l of sorted) {
    const s = toMinutes(l.startTime)
    const e = s + l.durationMin
    if (group.length && s >= groupEnd) flush()
    group.push(l)
    groupEnd = Math.max(groupEnd, e)
  }
  flush()
  return result
}
