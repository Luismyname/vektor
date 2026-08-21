import { useEffect, useState } from 'react'
import { getAuthenticatedUser, getCurrentProfile } from '../../services/auth'
import DashboardHabits from '../dashboard/components/DashboardHabits'

export default function Habits() {
  const [habits, setHabits] = useState([])

  useEffect(() => {
    let active = true

    async function loadHabits() {
      const { user } = await getAuthenticatedUser()
      if (!user) return
      const { profile } = await getCurrentProfile(user.id)
      if (active) setHabits(profile?.habits || [])
    }

    loadHabits()
    return () => { active = false }
  }, [])

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-intro">
          <p className="auth-kicker">VEKTOR / HÁBITOS</p>
          <h1>Hábitos iniciales</h1>
          <p>Las prácticas que puedes comenzar a incorporar en tu dirección personal.</p>
        </section>
        <DashboardHabits habits={habits} />
      </div>
    </main>
  )
}