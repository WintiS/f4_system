import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import DenView from './components/DenView.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { SchoolStoreProvider } from './context/SchoolStore.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SchoolStoreProvider>
          <Routes>
            {/* Public wall display — no auth. */}
            <Route path="/den" element={<DenView />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
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
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
