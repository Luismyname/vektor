import { useEffect, useState, useCallback } from 'react';
import { getAuthenticatedUser, getCurrentProfile } from '@/services/auth';
import { getRecentActivity } from '@/services/activity';
import { getTasks } from '@/services/tasks';
import { getActiveFocusSession } from '@/services/focus-sessions';
import { getWeeklyPlanner, getWeekStart } from '@/services/weekly-planner';
import { getUserChronotype, getWeeklyEnergyLevels } from '@/services/energy';

const DEFAULT_DURATION = 25;

export function useDashboardV2Data(defaultDuration = DEFAULT_DURATION) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [energyLevels, setEnergyLevels] = useState([]);
  const [chronotype, setChronotype] = useState(null);
  const [error, setError] = useState('');
  const [hiddenAnswers, setHiddenAnswers] = useState({});
  const [activeTask, setActiveTask] = useState(null);
  const [activeFocusSession, setActiveFocusSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      if (!mounted) return;
      setLoading(true);
      setError('');

      const { user: authenticatedUser, error: userError } = await getAuthenticatedUser();
      if (userError || !authenticatedUser) {
        if (mounted) setError('No se pudo cargar la sesión.');
        return;
      }

      const [{ tasks: currentTasks }, { activities: currentActivities }, { session: currentFocusSession }, { entries: weeklyEntries }, { data: energyData }, { data: chronotypeData }] = await Promise.all([
        getTasks(authenticatedUser.id),
        getRecentActivity(authenticatedUser.id),
        getActiveFocusSession(authenticatedUser.id),
        getWeeklyPlanner(authenticatedUser.id, getWeekStart()),
        getWeeklyEnergyLevels(authenticatedUser.id, getWeekStart()),
        getUserChronotype(authenticatedUser.id),
      ]);

      if (!mounted) return;

      const { profile: currentProfile, error: profileError } = await getCurrentProfile(authenticatedUser.id);
      if (profileError || !currentProfile) {
        setError('No se pudo cargar tu perfil.');
        return;
      }

      const activeActivity = currentActivities.find(a => a.type === 'in_progress');
      const persistedActiveTask = currentTasks.find(t => t.id === activeActivity?.task_id);

      setUser(authenticatedUser);
      setProfile(currentProfile);
      setHiddenAnswers(currentProfile.hidden_answers || {});
      setTasks(currentTasks);
      setActivities(currentActivities);
      setWeeklyEntries(weeklyEntries || []);
      setEnergyLevels(energyData || []);
      setChronotype(chronotypeData?.chronotype || null);

      if (persistedActiveTask) {
        setActiveTask({ ...persistedActiveTask, duration: activeActivity.duration || defaultDuration });
      }
      setActiveFocusSession(currentFocusSession);
      if (mounted) setLoading(false);
    }

    loadDashboard();
    return () => { mounted = false; };
  }, [defaultDuration]);

  const refreshProfile = useCallback(async (userId) => {
    const { profile: currentProfile, error: profileError } = await getCurrentProfile(userId);
    if (!profileError && currentProfile) {
      setProfile(currentProfile);
    }
    return { profile: currentProfile, error: profileError };
  }, []);

  const refreshDashboard = useCallback(async (userId) => {
    const [{ tasks: currentTasks }, { activities: currentActivities }] = await Promise.all([
      getTasks(userId),
      getRecentActivity(userId),
    ]);
    setTasks(currentTasks);
    setActivities(currentActivities);
    // Also refresh profile to get updated habits
    await refreshProfile(userId);
  }, [refreshProfile]);

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const weeklyPlannerEntries = weeklyEntries.filter(e => e.task_id || e.habit_id);
  const todayEnergy = energyLevels.find(e => e.date === new Date().toISOString().split('T')[0]);
  const currentEnergy = todayEnergy?.energy_level || 7;
  const energyLabel = currentEnergy >= 8 ? 'Alta energía' : currentEnergy >= 5 ? 'Energía media' : 'Baja energía';
  const energyColor = currentEnergy >= 8 ? 'var(--color-success)' : currentEnergy >= 5 ? 'var(--color-warning)' : 'var(--color-danger)';

  return {
    user,
    profile,
    tasks,
    pendingTasks,
    activities,
    weeklyEntries: weeklyPlannerEntries,
    energyLevels,
    chronotype,
    currentEnergy,
    energyLabel,
    energyColor,
    hiddenAnswers,
    loading,
    error,
    activeTask,
    setActiveTask,
    activeFocusSession,
    setActiveFocusSession,
    setTasks,
    setActivities,
    setHiddenAnswers,
    refreshDashboard,
    refreshProfile,
  };
}