import { useEffect, useState, useCallback } from 'react'
import { getAuthenticatedUser, getCurrentProfile } from '../../../services/auth'
import { getRecentActivity } from '../../../services/activity'
import { getTasks } from '../../../services/tasks'

const DEFAULT_DURATION = 25

/**
 * Hook para cargar y gestionar los datos del dashboard
 */
export function useDashboardData(defaultDuration = DEFAULT_DURATION) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [error, setError] = useState('')
  const [hiddenAnswers, setHiddenAnswers] = useState({})
  const [activeTask, setActiveTask] = useState(null)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      const { user: authenticatedUser, error: userError } = await getAuthenticatedUser()
      if (userError || !authenticatedUser) {
        if (active) setError('No se pudo cargar la sesión.')
        return
      }

      const { profile: currentProfile, error: profileError } = await getCurrentProfile(authenticatedUser.id)
      if (!active) return

      if (profileError || !currentProfile) {
        setError('No se pudo cargar tu perfil.')
        return
      }

      const [{ tasks: currentTasks }, { activities: currentActivities }] = await Promise.all([
        getTasks(authenticatedUser.id),
        getRecentActivity(authenticatedUser.id),
      ])

      if (!active) return

      const activeActivity = currentActivities.find((activity) => activity.type === 'in_progress')
      const persistedActiveTask = currentTasks.find((task) => task.id === activeActivity?.task_id)

      setUser(authenticatedUser)
      setProfile(currentProfile)
      setHiddenAnswers(currentProfile.hidden_answers && typeof currentProfile.hidden_answers === 'object' ? currentProfile.hidden_answers : {})
      setTasks(currentTasks)
      setActivities(currentActivities)

      if (persistedActiveTask) {
        setActiveTask({ ...persistedActiveTask, duration: activeActivity.duration || defaultDuration })
      }
    }

    loadDashboard()
    return () => { active = false }
  }, [defaultDuration])

  const refreshDashboard = useCallback(async (userId) => {
    const [{ tasks: currentTasks }, { activities: currentActivities }] = await Promise.all([
      getTasks(userId),
      getRecentActivity(userId),
    ])
    setTasks(currentTasks)
    setActivities(currentActivities)
  }, [])

  return {
    user,
    profile,
    tasks,
    setTasks,
    activities,
    error,
    hiddenAnswers,
    setHiddenAnswers,
    refreshDashboard,
    activeTask,
    setActiveTask,
  }
}
