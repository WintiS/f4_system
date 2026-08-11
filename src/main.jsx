import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import DenView from './components/DenView.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import InstructorProfile from './pages/InstructorProfile.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import RequireInstructor from './components/RequireInstructor.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { ActiveSchoolProvider } from './context/ActiveSchool.jsx'
import { SchoolStoreProvider } from './context/SchoolStore.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ActiveSchoolProvider>
          <SchoolStoreProvider>
            <Routes>
              {/* Public wall display — no auth. One board per school slug. */}
              <Route path="/bol" element={<DenView slug="bol" />} />
              <Route path="/merkur" element={<DenView slug="merkur" />} />
              <Route path="/login" element={<Login />} />
              {/* Per-school instructor signup; bare /signup falls back to a picker. */}
              <Route path="/signup" element={<Signup />} />
              <Route path="/signup/:slug" element={<Signup />} />
              {/* Instructor self-service profile. */}
              <Route
                path="/profil"
                element={
                  <RequireInstructor>
                    <InstructorProfile />
                  </RequireInstructor>
                }
              />
              {/* Admin dashboard. */}
              <Route
                path="/"
                element={
                  <RequireAdmin>
                    <App />
                  </RequireAdmin>
                }
              />
            </Routes>
          </SchoolStoreProvider>
        </ActiveSchoolProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
