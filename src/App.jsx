import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import Dashboard from './app/dashboard'
import Survey from './app/survey'
import Login from './app/auth/login'
import Register from './app/auth/register'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Portada from './components/Portada'
import Profile from './app/profile'
import './Style/Estilo.css'
import { getAuthenticatedUser, getCurrentProfile } from './services/auth'

function ProfileGate({ children, requireCompleted = false, onboarding = false }) {
  const location = useLocation()
  const [state, setState] = useState({ loading: true, user: null, completed: false })

  useEffect(() => {
    let active = true

    async function loadProfile() {
      const { user } = await getAuthenticatedUser()
      if (!user) {
        if (active) setState({ loading: false, user: null, completed: false })
        return
      }

      const { profile } = await getCurrentProfile(user.id)

      if (active) setState({ loading: false, user, completed: Boolean(profile?.completed_onboarding) })
    }

    loadProfile()
    return () => { active = false }
  }, [])

  if (state.loading) return <div className="route-loading">Comprobando tu perfil...</div>
  if (!state.user) return <Navigate to="/" replace />
  if (onboarding) {
    const mode = new URLSearchParams(location.search).get('mode')
    if (mode !== null && mode !== 'login' && mode !== 'edit') return <Navigate to="/" replace />
    if (mode === 'login' && state.completed) return <Navigate to="/dashboard" replace />
    if (mode === 'edit' && !state.completed) return <Navigate to="/onboarding" replace />
    return children
  }
  if (requireCompleted && !state.completed) return <Navigate to="/onboarding" replace />
  return children
}

function PageLayout({ children, showNavbar = true, footerClassName = '' }) {
  return (
    <>
      {showNavbar && <Navbar />}
      {children}
      <Footer className={footerClassName} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portada />} />
        <Route path="/dashboard" element={<ProfileGate requireCompleted><PageLayout><Dashboard /></PageLayout></ProfileGate>} />
        <Route path="/onboarding" element={<ProfileGate onboarding><PageLayout showNavbar={false}><Survey /></PageLayout></ProfileGate>} />
        <Route path="/survey" element={<Navigate to="/" replace />} />
        <Route path="/profile" element={<ProfileGate requireCompleted><PageLayout><Profile /></PageLayout></ProfileGate>} />
        <Route path="/login" element={<PageLayout showNavbar={false}><Login /></PageLayout>} />
        <Route path="/register" element={<PageLayout showNavbar={false}><Register /></PageLayout>} />
      </Routes>
    </BrowserRouter>
  )
}
