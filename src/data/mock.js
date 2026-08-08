import { todayStr, addDays } from '../lib/time'

// ~6 instructors. Each works a date range (a week or two).
// Ranges are built around "today" so the demo always has live data.
const T = todayStr()

export const LESSON_TYPES = ['Windsurf', 'Wingfoil', 'Paddleboard']
// Equipment that can be rented (kind: 'rental'). Efoils are rental-only.
export const RENTAL_TYPES = ['Windsurf', 'Wingfoil', 'Paddleboard', 'Efoil red', 'Efoil brown']
export const COURSE_TYPES = ['Windsurf', 'Wingfoil']
export const LEVELS = ['F1', 'F2', 'F3', 'F4']
export const DURATIONS = [60, 90, 120, 180] // minutes

// Efoils: two independent units, each needs charging after use.
export const EFOIL_TYPES = ['Efoil red', 'Efoil brown']
export const isEfoil = (type) => EFOIL_TYPES.includes(type)
export const EFOIL_MAX_MIN = 120 // max 2 h rental
// Charging cooldown after a rental, proportional to length: 3× rental time.
export const EFOIL_CHARGE_FACTOR = 3

// Courses: multi-day, two daily blocks by default.
export const COURSE_SPANS = [
  { id: '1day', label: '1 den', days: 1 },
  { id: '2day', label: '2 dny', days: 2 },
  { id: '3day', label: '3 dny', days: 3 },
  { id: '4day', label: '4 dny', days: 4 },
  { id: '5day', label: '5 dní', days: 5 },
  { id: '6day', label: '6 dní', days: 6 },
  { id: 'week', label: 'Celý týden (po–ne)', days: 7 },
]
export const DEFAULT_COURSE_BLOCKS = [
  { start: '10:00', end: '12:00' },
  { start: '14:00', end: '16:00' },
]

export const initialInstructors = [
  { id: 'i1', name: 'Marco',   workFrom: addDays(T, -3),  workTo: addDays(T, 10) },
  { id: 'i2', name: 'Lena',    workFrom: addDays(T, -3),  workTo: addDays(T, 10) },
  { id: 'i3', name: 'Tomás',   workFrom: T,               workTo: addDays(T, 13) },
  { id: 'i4', name: 'Sofia',   workFrom: T,               workTo: addDays(T, 6)  },
  { id: 'i5', name: 'Jonas',   workFrom: addDays(T, 4),   workTo: addDays(T, 18) },
  { id: 'i6', name: 'Amélie',  workFrom: addDays(T, -1),  workTo: addDays(T, 7)  },
]

// A couple of example items only — mostly empty per spec.
export const initialLessons = [
  {
    id: 'l1',
    kind: 'lesson',
    type: 'Windsurf',
    level: 'F1',
    durationMin: 90,
    people: 2,
    customerName: 'Rodina Novákových',
    date: T,
    startTime: '10:00',
    instructorId: 'i1',
  },
  {
    id: 'l2',
    kind: 'lesson',
    type: 'Wingfoil',
    level: 'F2',
    durationMin: 120,
    people: 1,
    customerName: '',
    date: T,
    startTime: '10:30', // overlaps l1 in time -> shows side-by-side
    instructorId: null, // unassigned -> amber
  },
  {
    id: 'l3',
    kind: 'rental',
    type: 'Paddleboard',
    level: '',
    durationMin: 120,
    people: 3,
    customerName: 'Bez objednávky',
    date: T,
    startTime: '14:00',
    instructorId: null, // rental -> blue regardless
  },
]

// One example course running this week (Mon–Sun), one instructor booked.
export const initialCourses = [
  {
    id: 'c1',
    title: 'Windsurf kemp F1',
    type: 'Windsurf',
    level: 'F1',
    span: 'week',
    startDate: T, // normalised to the week's Monday by the store
    blocks: [
      { start: '10:00', end: '12:00' },
      { start: '14:00', end: '16:00' },
    ],
    people: 6,
    customerName: '',
    note: '',
    instructorIds: ['i2'],
  },
]

// One phoned-in request waiting in the inbox.
export const initialRequests = [
  {
    id: 'r1',
    type: 'Wingfoil',
    level: 'F1',
    people: 2,
    customerName: 'Ferreira',
    note: 'Volali dnes ráno — čas flexibilní, preferují odpoledne.',
  },
]
