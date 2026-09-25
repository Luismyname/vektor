import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, HashRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
const Dashboard = lazy(() => import('./app/dashboard'))
const Survey = lazy(() => import('./app/survey'))
const Login = lazy(() => import('./app/auth/login'))
const Register = lazy(() => import('./app/auth/register'))
const Demo = lazy(() => import('./app/demo'))
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Portada from './components/Portada'
const Profile = lazy(() => import('./app/profile'))
const Habits = lazy(() => import('./app/habits'))
const Tasks = lazy(() => import('./app/tasks'))
const Activity = lazy(() => import('./app/activity'))
const ActivityDetail = lazy(() => import('./app/activity/components/ActivityDetail'))
const Settings = lazy(() => import('./app/settings'))
const WeeklyPlanner = lazy(() => import('./app/weekly-planner'))
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
  const Router = window.desktop?.isElectron ? HashRouter : BrowserRouter

  return (
    <Router>
      <Suspense fallback={<div className="route-loading">Cargando Vektor...</div>}>
        <Routes>
        <Route path="/" element={<Portada />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/dashboard" element={<ProfileGate requireCompleted><PageLayout><Dashboard /></PageLayout></ProfileGate>} />
        <Route path="/onboarding" element={<ProfileGate onboarding><PageLayout showNavbar={false}><Survey /></PageLayout></ProfileGate>} />
        <Route path="/survey" element={<Navigate to="/" replace />} />
        <Route path="/profile" element={<ProfileGate requireCompleted><PageLayout><Profile /></PageLayout></ProfileGate>} />
        <Route path="/habits" element={<ProfileGate requireCompleted><PageLayout><Habits /></PageLayout></ProfileGate>} />
        <Route path="/tasks" element={<ProfileGate requireCompleted><PageLayout><Tasks /></PageLayout></ProfileGate>} />
        <Route path="/activity" element={<ProfileGate requireCompleted><PageLayout><Activity /></PageLayout></ProfileGate>} />
        <Route path="/activity/:activityId" element={<ProfileGate requireCompleted><PageLayout><ActivityDetail /></PageLayout></ProfileGate>} />
        <Route path="/settings" element={<ProfileGate requireCompleted><PageLayout><Settings /></PageLayout></ProfileGate>} />
        <Route path="/weekly-planner" element={<ProfileGate requireCompleted><PageLayout><WeeklyPlanner /></PageLayout></ProfileGate>} />
        <Route path="/login" element={<PageLayout showNavbar={false}><Login /></PageLayout>} />
        <Route path="/register" element={<PageLayout showNavbar={false}><Register /></PageLayout>} />
        </Routes>
      </Suspense>
    </Router>
  )
}
