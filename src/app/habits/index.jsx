import { useEffect, useState } from 'react'
import { getAuthenticatedUser, getCurrentProfile } from '../../services/auth'
import { saveHabits } from '../../services/users'
import { generateHabits, normalizeHabits } from '../../lib/habits'
import HabitList from './components/HabitList'

export default function Habits() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [habitState, setHabitState] = useState({ recommended: [], custom: [] })
  const [newHabit, setNewHabit] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function loadHabits() {
      const { user: authenticatedUser, error: userError } = await getAuthenticatedUser()
      if (userError || !authenticatedUser) return active && setError('No se pudo cargar la sesión.')
      const { profile: currentProfile, error: profileError } = await getCurrentProfile(authenticatedUser.id)
      if (!active) return
      if (profileError || !currentProfile) return setError('No se pudo cargar tu perfil.')
      let nextHabits = normalizeHabits(currentProfile.habits)
      if (!nextHabits.recommended.length) {
        const generatedHabits = generateHabits(currentProfile.dominant_value, currentProfile.secondary_value, currentProfile.answers)
        nextHabits = { ...generatedHabits, custom: nextHabits.custom }
        const { error: saveError } = await saveHabits(authenticatedUser.id, nextHabits)
        if (saveError) return setError('No se pudieron guardar tus hábitos recomendados.')
      }
      setUser(authenticatedUser)
      setProfile(currentProfile)
      setHabitState(nextHabits)
    }
    loadHabits()
    return () => { active = false }
  }, [])

  function updateHabits(section, updater) {
    setHabitState((current) => ({ ...current, [section]: updater(current[section]) }))
    setMessage('')
  }

  function toggleHabit(section, id) {
    updateHabits(section, (habits) => habits.map((habit) => habit.id === id ? { ...habit, active: !habit.active } : habit))
  }

  function removeCustomHabit(id) {
    updateHabits('custom', (habits) => habits.filter((habit) => habit.id !== id))
  }

  function addHabit(event) {
    event.preventDefault()
    const title = newHabit.trim()
    if (!title) return
    updateHabits('custom', (habits) => [...habits, { id: crypto.randomUUID(), title, value: 'personalizado', active: true }])
    setNewHabit('')
  }

  async function handleSave() {
    setIsSaving(true)
    setMessage('')
    const { error: saveError } = await saveHabits(user.id, habitState)
    setIsSaving(false)
    if (saveError) return setError('No se pudieron guardar los cambios.')
    setMessage('Cambios guardados.')
  }

  if (error) return <div className="route-loading">{error}</div>
  if (!user || !profile) return <div className="route-loading">Cargando tus hábitos...</div>

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell habits-page">
        <section className="dashboard-intro">
          <p className="auth-kicker">VEKTOR / HÁBITOS</p>
          <h1>Diseña tu ritmo</h1>
          <p>Prácticas sugeridas a partir de tu dirección: {profile.dominant_value}.</p>
        </section>
        <div className="habits-grid">
          <section className="dashboard-card" aria-labelledby="recommended-title">
            <h2 id="recommended-title" className="dashboard-section-title">Hábitos recomendados</h2>
            <HabitList habits={habitState.recommended} onToggle={(id) => toggleHabit('recommended', id)} />
          </section>
          <section className="dashboard-card" aria-labelledby="custom-title">
            <h2 id="custom-title" className="dashboard-section-title">Tus hábitos</h2>
            <form className="habit-add-form" onSubmit={addHabit}>
              <input value={newHabit} onChange={(event) => setNewHabit(event.target.value)} placeholder="Añade un hábito" aria-label="Nuevo hábito" />
              <button type="submit">Añadir</button>
            </form>
            <HabitList habits={habitState.custom} onToggle={(id) => toggleHabit('custom', id)} onRemove={removeCustomHabit} />
          </section>
        </div>
        <div className="habits-actions">
          <button className="onboarding-submit" type="button" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar cambios'}</button>
          {message && <p className="form-message form-message-success" role="status">{message}</p>}
        </div>
      </div>
    </main>
  )
}