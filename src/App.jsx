import { useState } from 'react'
import { todayStr } from './lib/time'
import CalendarHeader from './components/CalendarHeader'
import DayView from './components/DayView'
import WeekView from './components/WeekView'
import MonthView from './components/MonthView'
import RequestsInbox from './components/RequestsInbox'
import AvailabilityEditor from './components/AvailabilityEditor'
import LessonModal from './components/LessonModal'
import CourseModal from './components/CourseModal'
import Legend from './components/Legend'
import UsersAdmin from './components/UsersAdmin'
import TimesheetsAdmin from './components/TimesheetsAdmin'
import { useSchool } from './context/SchoolStore'
import { useAuth } from './context/AuthProvider'

const TABS = [
  { id: 'calendar', label: 'Kalendář', icon: '🗓️' },
  { id: 'requests', label: 'Poptávky', icon: '📥' },
  { id: 'availability', label: 'Tým', icon: '🧭' },
  { id: 'timesheets', label: 'Výkazy', icon: '🕒' },
  { id: 'users', label: 'Uživatelé', icon: '👤' },
]

const SECTION_META = {
  calendar: { title: 'Rozvrh', sub: 'Lekce, půjčovné a kurzy' },
  requests: { title: 'Poptávky', sub: 'Příchozí poptávky k naplánování' },
  availability: { title: 'Tým', sub: 'Pracovní dny instruktorů' },
  timesheets: { title: 'Výkazy', sub: 'Odpracované hodiny instruktorů k proplacení' },
  users: { title: 'Uživatelé', sub: 'Účty a administrátorský přístup' },
}

export default function App() {
  const { requests, courses } = useSchool()
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState('calendar')
  const [view, setView] = useState('day') // 'day' | 'week' | 'month'
  const [date, setDate] = useState(todayStr())
  const [modal, setModal] = useState(null) // { initial, editId?, requestId? }
  const [courseModal, setCourseModal] = useState(null) // { initial?, editId? }

  const openCreate = (startTime) =>
    setModal({ initial: { date, startTime: startTime || '10:00' } })

  const openCreateAt = (d, startTime) =>
    setModal({ initial: { date: d, startTime: startTime || '10:00' } })

  const openEdit = (item) => {
    if (item.kind === 'course') {
      const course = courses.find((c) => c.id === item.courseId)
      if (course)
        setCourseModal({
          initial: course,
          editId: course.id,
          blockCtx: { date: item.date, idx: item.blockIdx },
        })
      return
    }
    setModal({ initial: item, editId: item.id })
  }

  const openCourse = () =>
    setCourseModal({ initial: { startDate: date } })

  const openAssign = (request) =>
    setModal({
      initial: {
        kind: 'lesson',
        type: request.type,
        level: request.level,
        people: request.people,
        customerName: request.customerName,
        date: request.preferredDate || date,
        startTime: request.preferredTime || '10:00',
      },
      requestId: request.id,
    })

  const meta = SECTION_META[tab]

  return (
    <div className="flex min-h-full">
      {/* sidebar */}
      <aside className="sticky top-0 z-40 flex h-screen w-16 shrink-0 flex-col bg-gradient-to-b from-sea-950 via-sea-900 to-sea-800 px-2.5 py-4 text-white lg:w-60 lg:px-4">
        <div className="mb-8 flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-500 text-lg shadow-lg shadow-coral-500/30">
            🏄
          </div>
          <div className="hidden lg:block">
            <div className="font-display text-[15px] font-semibold leading-tight tracking-tight">
              F4
            </div>
            <div className="text-xs text-sea-600">Windsurfová škola</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                title={t.label}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-coral-500 text-white shadow-lg shadow-coral-500/25'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-base leading-none">{t.icon}</span>
                <span className="hidden lg:inline">{t.label}</span>
                {t.id === 'requests' && requests.length > 0 && (
                  <span
                    className={`ml-auto hidden rounded-full px-1.5 py-0.5 text-[10px] font-semibold lg:inline ${
                      active ? 'bg-white/25 text-white' : 'bg-coral-500 text-white'
                    }`}
                  >
                    {requests.length}
                  </span>
                )}
                {t.id === 'requests' && requests.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-coral-400 lg:hidden" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto px-1">
          <div className="hidden truncate px-2 pb-2 text-xs text-white/50 lg:block">
            {user?.email}
          </div>
          <button
            onClick={signOut}
            title="Odhlásit se"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <span className="text-base leading-none">🚪</span>
            <span className="hidden lg:inline">Odhlásit se</span>
          </button>
        </div>
      </aside>

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-mist/80 px-6 py-4 backdrop-blur">
          <h1 className="font-display text-xl font-semibold tracking-tight text-sea-900">
            {meta.title}
          </h1>
          <p className="text-sm text-slate-500">{meta.sub}</p>
        </header>

        <main className="mx-auto w-full max-w-6xl px-6 py-6">
          {tab === 'calendar' && (
            <div className="space-y-4">
              <CalendarHeader view={view} setView={setView} date={date} setDate={setDate} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Legend />
                <div className="flex gap-2">
                  <button
                    onClick={openCourse}
                    className="rounded-xl border border-violet-200 bg-white px-3.5 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
                  >
                    + Nový kurz
                  </button>
                  <button
                    onClick={() => openCreate()}
                    className="rounded-xl bg-coral-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-coral-500/25 transition hover:bg-coral-600"
                  >
                    + Nový privát
                  </button>
                </div>
              </div>

              {view === 'day' && (
                <DayView date={date} onCreateAt={openCreate} onEditLesson={openEdit} />
              )}
              {view === 'week' && (
                <WeekView
                  date={date}
                  onCreateAt={openCreateAt}
                  onEditLesson={openEdit}
                  onPickDay={(d) => {
                    setDate(d)
                    setView('day')
                  }}
                />
              )}
              {view === 'month' && (
                <MonthView
                  date={date}
                  onPickDay={(d) => {
                    setDate(d)
                    setView('day')
                  }}
                />
              )}
            </div>
          )}

          {tab === 'requests' && <RequestsInbox onAssign={openAssign} />}

          {tab === 'availability' && <AvailabilityEditor />}

          {tab === 'timesheets' && <TimesheetsAdmin />}

          {tab === 'users' && <UsersAdmin />}
        </main>
      </div>

      {modal && (
        <LessonModal
          initial={modal.initial}
          editId={modal.editId}
          requestId={modal.requestId}
          onClose={() => setModal(null)}
        />
      )}

      {courseModal && (
        <CourseModal
          initial={courseModal.initial}
          editId={courseModal.editId}
          blockCtx={courseModal.blockCtx}
          onClose={() => setCourseModal(null)}
        />
      )}
    </div>
  )
}
