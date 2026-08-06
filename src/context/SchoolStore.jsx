import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { COURSE_SPANS, isEfoil, EFOIL_CHARGE_FACTOR } from '../data/mock'
import { supabase } from '../lib/supabase'
import {
  toMinutes,
  rangesOverlap,
  dateInRange,
  weekStart,
  addDays,
  todayStr,
} from '../lib/time'

const SchoolContext = createContext(null)

/* ---- Row <-> camelCase mappers (DB is snake_case) ---- */

const rowToInstructor = (r) => ({
  id: r.id, name: r.name, workFrom: r.work_from, workTo: r.work_to,
  origin: r.origin, status: r.status, profileId: r.profile_id,
})
const instructorToRow = (d) => {
  const r = {}
  if ('name' in d) r.name = d.name
  if ('workFrom' in d) r.work_from = d.workFrom
  if ('workTo' in d) r.work_to = d.workTo
  if ('origin' in d) r.origin = d.origin
  if ('status' in d) r.status = d.status
  if ('profileId' in d) r.profile_id = d.profileId
  return r
}

const rowToLesson = (r) => ({
  id: r.id, kind: r.kind, type: r.type, level: r.level,
  durationMin: r.duration_min, people: r.people, customerName: r.customer_name,
  date: r.date, startTime: r.start_time,
  // Lessons carry a uuid[] of instructors (may be empty). Legacy single
  // instructor_id rows are covered by the DB backfill into instructor_ids.
  instructorIds: r.instructor_ids ?? [],
})
const lessonToRow = (d) => {
  const r = {}
  if ('kind' in d) r.kind = d.kind
  if ('type' in d) r.type = d.type
  if ('level' in d) r.level = d.level ?? ''
  if ('durationMin' in d) r.duration_min = d.durationMin
  if ('people' in d) r.people = d.people
  if ('customerName' in d) r.customer_name = d.customerName ?? ''
  if ('date' in d) r.date = d.date
  if ('startTime' in d) r.start_time = d.startTime
  if ('instructorIds' in d) r.instructor_ids = d.instructorIds ?? []
  return r
}

const rowToCourse = (r) => ({
  id: r.id, title: r.title, type: r.type, level: r.level, span: r.span,
  startDate: r.start_date, blocks: r.blocks, people: r.people,
  customerName: r.customer_name, note: r.note, instructorIds: r.instructor_ids ?? [],
  overrides: r.overrides ?? {},
})
const courseToRow = (d) => {
  const r = {}
  if ('title' in d) r.title = d.title ?? ''
  if ('type' in d) r.type = d.type
  if ('level' in d) r.level = d.level ?? ''
  if ('span' in d) r.span = d.span
  if ('startDate' in d) r.start_date = d.startDate
  if ('blocks' in d) r.blocks = d.blocks
  if ('people' in d) r.people = d.people
  if ('customerName' in d) r.customer_name = d.customerName ?? ''
  if ('note' in d) r.note = d.note ?? ''
  if ('instructorIds' in d) r.instructor_ids = d.instructorIds ?? []
  if ('overrides' in d) r.overrides = d.overrides ?? {}
  return r
}

const rowToWorkLog = (r) => ({
  id: r.id, instructorId: r.instructor_id, workDate: r.work_date,
  hours: Number(r.hours), note: r.note, paidAt: r.paid_at, payoutId: r.payout_id,
})
const workLogToRow = (d) => {
  const r = {}
  if ('instructorId' in d) r.instructor_id = d.instructorId
  if ('workDate' in d) r.work_date = d.workDate
  if ('hours' in d) r.hours = d.hours
  if ('note' in d) r.note = d.note ?? ''
  return r
}

const rowToPayout = (r) => ({
  id: r.id, instructorId: r.instructor_id, paidAt: r.paid_at,
  paidThrough: r.paid_through, teachingHours: Number(r.teaching_hours),
  manualHours: Number(r.manual_hours), totalHours: Number(r.total_hours),
})

const rowToRequest = (r) => ({
  id: r.id, type: r.type, level: r.level, people: r.people,
  customerName: r.customer_name, note: r.note,
  preferredDate: r.preferred_date, preferredTime: r.preferred_time,
})
const requestToRow = (d) => {
  const r = {}
  if ('type' in d) r.type = d.type
  if ('level' in d) r.level = d.level ?? ''
  if ('people' in d) r.people = d.people
  if ('customerName' in d) r.customer_name = d.customerName ?? ''
  if ('note' in d) r.note = d.note ?? ''
  if ('preferredDate' in d) r.preferred_date = d.preferredDate || null
  if ('preferredTime' in d) r.preferred_time = d.preferredTime || null
  return r
}

/** Replace item with same id, or append. Keeps optimistic + realtime idempotent. */
const upsertById = (setter, item) =>
  setter((prev) =>
    prev.some((x) => x.id === item.id)
      ? prev.map((x) => (x.id === item.id ? item : x))
      : [...prev, item],
  )
const removeById = (setter, id) =>
  setter((prev) => prev.filter((x) => x.id !== id))

/** Dates a course spans, as 'YYYY-MM-DD' array. Week span starts on Monday. */
export function courseDays(course) {
  const spanDays = COURSE_SPANS.find((s) => s.id === course.span)?.days ?? 1
  const start = course.span === 'week' ? weekStart(course.startDate) : course.startDate
  return Array.from({ length: spanDays }, (_, i) => addDays(start, i))
}

export function SchoolStoreProvider({ children }) {
  const [instructors, setInstructors] = useState([])
  const [lessons, setLessons] = useState([])
  const [requests, setRequests] = useState([])
  const [courses, setCourses] = useState([])
  const [workLogs, setWorkLogs] = useState([])
  const [payouts, setPayouts] = useState([])

  // Initial load. RLS decides what each viewer can read (admins: all;
  // anon /den: today's lessons + instructors + courses). Failures per table
  // (e.g. anon has no access to requests) are ignored so the app still renders.
  useEffect(() => {
    let active = true
    const load = async (table, mapper, setter) => {
      const { data, error } = await supabase.from(table).select('*')
      if (!active || error || !data) return
      setter(data.map(mapper))
    }
    load('instructors', rowToInstructor, setInstructors)
    load('lessons', rowToLesson, setLessons)
    load('courses', rowToCourse, setCourses)
    load('requests', rowToRequest, setRequests)
    // work_logs + payouts: admins read all; an instructor reads only own (RLS).
    load('work_logs', rowToWorkLog, setWorkLogs)
    load('payouts', rowToPayout, setPayouts)
    return () => {
      active = false
    }
  }, [])

  // Realtime: keep local arrays in sync with DB changes (own + other devices).
  useEffect(() => {
    const sync = (mapper, setter) => (payload) => {
      if (payload.eventType === 'DELETE') removeById(setter, payload.old.id)
      else upsertById(setter, mapper(payload.new))
    }
    const channel = supabase
      .channel('school-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instructors' }, sync(rowToInstructor, setInstructors))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, sync(rowToLesson, setLessons))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, sync(rowToCourse, setCourses))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, sync(rowToRequest, setRequests))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_logs' }, sync(rowToWorkLog, setWorkLogs))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payouts' }, sync(rowToPayout, setPayouts))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const api = useMemo(() => {
    // Only approved instructors are schedulable / publicly visible. Pending rows
    // (self-signups awaiting admin approval) are surfaced separately for the queue.
    const approved = instructors.filter((i) => i.status !== 'pending')
    const pendingInstructors = instructors.filter((i) => i.status === 'pending')

    /** Instructors available on a given date (their range covers it). */
    const availableInstructors = (dateStr) =>
      approved.filter((i) => dateInRange(dateStr, i.workFrom, i.workTo))

    /** Instructor name lookup (across all rows so assigned names always resolve). */
    const instructorName = (id) =>
      instructors.find((i) => i.id === id)?.name ?? null

    /**
     * Lessons that overlap any of `instructorIds` at the given date/time,
     * excluding lesson `ignoreId` (when editing). Empty array = no conflict.
     */
    const conflictsFor = ({ instructorIds, date, startTime, durationMin, ignoreId }) => {
      const ids = instructorIds ?? []
      if (!ids.length) return []
      const start = toMinutes(startTime)
      const end = start + durationMin
      return lessons.filter(
        (l) =>
          l.id !== ignoreId &&
          l.date === date &&
          (l.instructorIds ?? []).some((iid) => ids.includes(iid)) &&
          rangesOverlap(start, end, toMinutes(l.startTime), toMinutes(l.startTime) + l.durationMin),
      )
    }

    /**
     * Charging conflicts for an efoil rental. Each efoil booking occupies its
     * rental time plus a charging cooldown of `EFOIL_CHARGE_FACTOR ×` its
     * length, so the blocked window is [start, start + durationMin × (1+factor)].
     * Two bookings of the *same* efoil conflict if their windows overlap. Red
     * and brown are independent (matched by exact `type`). Empty = free.
     */
    const efoilConflictFor = ({ type, date, startTime, durationMin, ignoreId }) => {
      if (!isEfoil(type) || !date || !startTime || !durationMin) return []
      const span = (min) => min * (1 + EFOIL_CHARGE_FACTOR)
      const start = toMinutes(startTime)
      const end = start + span(durationMin)
      return lessons.filter(
        (l) =>
          l.id !== ignoreId &&
          l.kind === 'rental' &&
          l.type === type &&
          l.date === date &&
          rangesOverlap(start, end, toMinutes(l.startTime), toMinutes(l.startTime) + span(l.durationMin)),
      )
    }

    /**
     * Conflicts for a course's selected instructors across all its days/blocks.
     * Checks against existing lessons and other courses. Pass `ignoreId` so a
     * course being edited doesn't collide with itself. Empty array = no conflict.
     */
    const courseConflictsFor = (course, ignoreId) => {
      const ids = course.instructorIds ?? []
      if (!ids.length || !course.startDate || !course.blocks?.length) return []
      const out = []
      for (const date of courseDays(course)) {
        course.blocks.forEach((b, idx) => {
          const ov = course.overrides?.[date]?.[idx]
          const startStr = ov?.start ?? b.start
          const start = toMinutes(startStr)
          const end = toMinutes(ov?.end ?? b.end)
          if (end <= start) return
          for (const instId of ids) {
            lessons.forEach((l) => {
              if (
                (l.instructorIds ?? []).includes(instId) &&
                l.date === date &&
                rangesOverlap(start, end, toMinutes(l.startTime), toMinutes(l.startTime) + l.durationMin)
              )
                out.push({ instructorId: instId, date, startTime: startStr, with: `${l.type} v ${l.startTime}` })
            })
            courses.forEach((c) => {
              if (c.id === ignoreId || !c.instructorIds?.includes(instId)) return
              if (!courseDays(c).includes(date)) return
              c.blocks.forEach((cb, cidx) => {
                const cov = c.overrides?.[date]?.[cidx]
                const cStart = cov?.start ?? cb.start
                if (rangesOverlap(start, end, toMinutes(cStart), toMinutes(cov?.end ?? cb.end)))
                  out.push({
                    instructorId: instId, date, startTime: startStr,
                    with: `kurz ${c.title || c.type} v ${cStart}`,
                  })
              })
            })
          }
        })
      }
      return out
    }

    const addLesson = async (data) => {
      const { data: row } = await supabase
        .from('lessons').insert(lessonToRow(data)).select().single()
      if (row) upsertById(setLessons, rowToLesson(row))
      return row?.id
    }
    const updateLesson = async (id, data) => {
      const existing = lessons.find((l) => l.id === id)
      if (existing) upsertById(setLessons, { ...existing, ...data }) // optimistic
      const { data: row } = await supabase
        .from('lessons').update(lessonToRow(data)).eq('id', id).select().single()
      if (row) upsertById(setLessons, rowToLesson(row))
    }
    const deleteLesson = async (id) => {
      removeById(setLessons, id)
      await supabase.from('lessons').delete().eq('id', id)
    }

    const addRequest = async (data) => {
      const { data: row } = await supabase
        .from('requests').insert(requestToRow(data)).select().single()
      if (row) upsertById(setRequests, rowToRequest(row))
      return row?.id
    }
    const deleteRequest = async (id) => {
      removeById(setRequests, id)
      await supabase.from('requests').delete().eq('id', id)
    }

    /** Schedule a request into a lesson, removing it from the inbox. */
    const scheduleRequest = async (requestId, lessonData) => {
      await addLesson(lessonData)
      await deleteRequest(requestId)
    }

    const updateInstructor = async (id, data) => {
      const { data: row } = await supabase
        .from('instructors').update(instructorToRow(data)).eq('id', id).select().single()
      if (row) upsertById(setInstructors, rowToInstructor(row))
    }

    /** Admin adds an instructor with no auth account (name only). Approved instantly. */
    const addInstructor = async ({ name }) => {
      const today = todayStr()
      const { data: row } = await supabase
        .from('instructors')
        .insert(instructorToRow({
          name, origin: 'manual', status: 'approved', workFrom: today, workTo: today,
        }))
        .select().single()
      if (row) upsertById(setInstructors, rowToInstructor(row))
      return row?.id
    }

    /** Move a pending self-signup into the schedulable roster. */
    const approveInstructor = async (id) => {
      const existing = instructors.find((i) => i.id === id)
      if (existing) upsertById(setInstructors, { ...existing, status: 'approved' }) // optimistic
      const { data: row } = await supabase
        .from('instructors').update({ status: 'approved' }).eq('id', id).select().single()
      if (row) upsertById(setInstructors, rowToInstructor(row))
    }

    /** Delete an instructor. Only manually-added rows may be removed. */
    const deleteInstructor = async (id) => {
      const existing = instructors.find((i) => i.id === id)
      if (existing && existing.origin !== 'manual') return

      // Pull the id from every referencing row so calendar status/color flips
      // back to "unassigned" immediately. Both lessons and courses store
      // instructor_ids as a uuid[] with no FK, so remove explicitly in DB + local.
      const affectedLessons = lessons.filter((l) => l.instructorIds?.includes(id))
      affectedLessons.forEach((l) =>
        upsertById(setLessons, {
          ...l,
          instructorIds: l.instructorIds.filter((x) => x !== id),
        }),
      )

      const affectedCourses = courses.filter((c) => c.instructorIds?.includes(id))
      affectedCourses.forEach((c) =>
        upsertById(setCourses, {
          ...c,
          instructorIds: c.instructorIds.filter((x) => x !== id),
        }),
      )

      removeById(setInstructors, id)

      for (const l of affectedLessons) {
        await supabase
          .from('lessons')
          .update({ instructor_ids: l.instructorIds.filter((x) => x !== id) })
          .eq('id', l.id)
      }
      for (const c of affectedCourses) {
        await supabase
          .from('courses')
          .update({ instructor_ids: c.instructorIds.filter((x) => x !== id) })
          .eq('id', c.id)
      }
      await supabase.from('instructors').delete().eq('id', id)
    }

    const lessonsForDate = (dateStr) =>
      lessons.filter((l) => l.date === dateStr)

    /* ---- Work logs (výkazy) ---- */

    /** Instructor row linked to an auth profile (self-service pages). */
    const instructorByProfile = (profileId) =>
      instructors.find((i) => i.profileId === profileId) ?? null

    /** Lessons assigned to a single instructor, newest first. */
    const lessonsForInstructor = (instructorId) =>
      lessons
        .filter((l) => (l.instructorIds ?? []).includes(instructorId))
        .sort((a, b) => (a.date + a.startTime < b.date + b.startTime ? 1 : -1))

    /** Instructor logs a non-teaching worked day. Starts unpaid (paid_at null). */
    const addWorkLog = async ({ instructorId, workDate, hours, note }) => {
      const { data: row } = await supabase
        .from('work_logs')
        .insert(workLogToRow({ instructorId, workDate, hours, note }))
        .select().single()
      if (row) upsertById(setWorkLogs, rowToWorkLog(row))
      return row?.id
    }
    /** Instructor removes an own still-unpaid log. */
    const deleteWorkLog = async (id) => {
      removeById(setWorkLogs, id)
      await supabase.from('work_logs').delete().eq('id', id)
    }

    const today = todayStr()

    /**
     * Auto-counted teaching hours for an instructor: assigned lessons + course
     * blocks whose date is already past (<= today). `sinceExclusive` (a payout
     * cutoff date) restricts to days strictly after it, so paid days drop out.
     */
    const teachingHoursForInstructor = (instructorId, sinceExclusive) => {
      const inWindow = (d) => d <= today && (!sinceExclusive || d > sinceExclusive)
      let minutes = 0
      for (const l of lessons) {
        if (l.kind === 'rental') continue
        if (!(l.instructorIds ?? []).includes(instructorId)) continue
        if (inWindow(l.date)) minutes += l.durationMin
      }
      for (const c of courses) {
        if (!(c.instructorIds ?? []).includes(instructorId)) continue
        for (const d of courseDays(c)) {
          if (!inWindow(d)) continue
          c.blocks.forEach((b, idx) => {
            const ov = c.overrides?.[d]?.[idx]
            minutes += toMinutes(ov?.end ?? b.end) - toMinutes(ov?.start ?? b.start)
          })
        }
      }
      return minutes / 60
    }

    /** Latest paid-through cutoff date for an instructor, or null. */
    const lastPayoutThrough = (instructorId) =>
      payouts
        .filter((p) => p.instructorId === instructorId)
        .reduce((max, p) => (!max || p.paidThrough > max ? p.paidThrough : max), null)

    /** Unpaid teaching hours = taught days after the last payout cutoff. */
    const unpaidTeachingHours = (instructorId) =>
      teachingHoursForInstructor(instructorId, lastPayoutThrough(instructorId))

    /** Lifetime total hours already paid out to an instructor. */
    const paidHoursTotal = (instructorId) =>
      payouts
        .filter((p) => p.instructorId === instructorId)
        .reduce((sum, p) => sum + p.totalHours, 0)

    /**
     * Admin settles an instructor's unpaid balance. Teaching hours are computed
     * here; the RPC sums unpaid manual hours server-side, snapshots a payout,
     * and stamps the unpaid work_logs. Realtime refreshes payouts + work_logs.
     */
    const recordPayout = async (instructorId) => {
      const teaching = unpaidTeachingHours(instructorId)
      await supabase.rpc('record_payout', {
        p_instructor: instructorId, p_teaching: teaching, p_through: today,
      })
    }

    /** Instructor self-updates their own availability window via RPC. */
    const updateMyWorkWindow = async (workFrom, workTo) => {
      await supabase.rpc('update_my_work_window', { p_from: workFrom, p_to: workTo })
    }

    /** Instructor self-renames their own instructor row via RPC. */
    const updateMyName = async (instructorId, name) => {
      const clean = name.trim()
      const existing = instructors.find((i) => i.id === instructorId)
      if (existing) upsertById(setInstructors, { ...existing, name: clean }) // optimistic
      await supabase.rpc('update_my_name', { p_name: clean })
    }

    const addCourse = async (data) => {
      const { data: row } = await supabase
        .from('courses').insert(courseToRow(data)).select().single()
      if (row) upsertById(setCourses, rowToCourse(row))
      return row?.id
    }
    const updateCourse = async (id, data) => {
      const existing = courses.find((c) => c.id === id)
      if (existing) upsertById(setCourses, { ...existing, ...data }) // optimistic
      const { data: row } = await supabase
        .from('courses').update(courseToRow(data)).eq('id', id).select().single()
      if (row) upsertById(setCourses, rowToCourse(row))
    }
    const deleteCourse = async (id) => {
      removeById(setCourses, id)
      await supabase.from('courses').delete().eq('id', id)
    }

    /**
     * Course occurrences on a date as calendar items (one per time block).
     * Shaped like a lesson so Day/Week views can lay them out.
     */
    const courseItemsForDate = (dateStr) => {
      const items = []
      for (const c of courses) {
        if (!courseDays(c).includes(dateStr)) continue
        // Only count instructors that still exist — a removed/deleted instructor
        // must not keep the course showing as "assigned".
        const liveInstructorIds = (c.instructorIds ?? []).filter((iid) =>
          instructors.some((i) => i.id === iid),
        )
        c.blocks.forEach((b, idx) => {
          // per-date override for this block wins over the shared schedule
          const ov = c.overrides?.[dateStr]?.[idx]
          const start = ov?.start ?? b.start
          const end = ov?.end ?? b.end
          items.push({
            id: `${c.id}::${dateStr}::${idx}`,
            kind: 'course',
            courseId: c.id,
            blockIdx: idx,
            date: dateStr,
            type: c.title || c.type,
            level: c.level,
            startTime: start,
            durationMin: toMinutes(end) - toMinutes(start),
            people: c.people,
            customerName: c.customerName,
            instructorIds: liveInstructorIds,
          })
        })
      }
      return items
    }

    /** Lessons + course blocks for a date, merged for calendar rendering. */
    const itemsForDate = (dateStr) => [
      ...lessonsForDate(dateStr),
      ...courseItemsForDate(dateStr),
    ]

    return {
      instructors: approved,
      pendingInstructors,
      lessons,
      requests,
      courses,
      workLogs,
      payouts,
      instructorByProfile,
      lessonsForInstructor,
      addWorkLog,
      deleteWorkLog,
      teachingHoursForInstructor,
      unpaidTeachingHours,
      lastPayoutThrough,
      paidHoursTotal,
      recordPayout,
      updateMyWorkWindow,
      updateMyName,
      availableInstructors,
      instructorName,
      conflictsFor,
      efoilConflictFor,
      courseConflictsFor,
      addLesson,
      updateLesson,
      deleteLesson,
      addRequest,
      deleteRequest,
      scheduleRequest,
      updateInstructor,
      addInstructor,
      approveInstructor,
      deleteInstructor,
      lessonsForDate,
      addCourse,
      updateCourse,
      deleteCourse,
      courseDays,
      itemsForDate,
    }
  }, [instructors, lessons, requests, courses, workLogs, payouts])

  return <SchoolContext.Provider value={api}>{children}</SchoolContext.Provider>
}

export function useSchool() {
  const ctx = useContext(SchoolContext)
  if (!ctx) throw new Error('useSchool must be used within SchoolStoreProvider')
  return ctx
}

/** Derived visual state: 'rental' | 'unassigned' | 'assigned'. */
export function lessonState(item) {
  if (item.kind === 'rental') return 'rental'
  return item.instructorIds?.length ? 'assigned' : 'unassigned'
}

export const STATE_STYLES = {
  assigned: {
    label: 'Má instruktora',
    chip: 'bg-emerald-50 border-emerald-200 border-l-[3px] border-l-emerald-500 text-emerald-900 hover:bg-emerald-100',
    dot: 'bg-emerald-500',
  },
  unassigned: {
    label: 'Zatím bez instruktora',
    chip: 'bg-amber-50 border-amber-200 border-l-[3px] border-l-amber-500 text-amber-900 hover:bg-amber-100',
    dot: 'bg-amber-500',
  },
  rental: {
    label: 'Pouze půjčovné',
    chip: 'bg-sky-50 border-sky-200 border-l-[3px] border-l-sky-500 text-sky-900 hover:bg-sky-100',
    dot: 'bg-sky-500',
  },
}
