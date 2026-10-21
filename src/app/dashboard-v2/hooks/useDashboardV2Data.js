import { useEffect, useState, useCallback, useRef } from 'react';
import { getAuthenticatedUser, getCurrentProfile } from '../../../services/auth';
import { getRecentActivity } from '../../../services/activity';
import { getTasks } from '../../../services/tasks';
import { getActiveFocusSession } from '../../../services/focus-sessions';
import { supabase } from '../../../services/supabase';
import { completeHabitOccurrence, formatDate, getWeeklyPlanner, getWeekStart } from '../../../services/weekly-planner';
import { getUserChronotype, getWeeklyEnergyLevels } from '../../../services/energy';
import { getPlannerHabits } from '../../../services/habits';
import { normalizeHabits } from '../../../lib/habits';

export function useDashboardV2Data() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [habitDefinitions, setHabitDefinitions] = useState([]);
  const [habitDefinitionsError, setHabitDefinitionsError] = useState('');
  const [energyLevels, setEnergyLevels] = useState([]);
  const [chronotype, setChronotype] = useState(null);
  const [error, setError] = useState('');
  const [hiddenAnswers, setHiddenAnswers] = useState({});
  const [activeTask, setActiveTask] = useState(null);
  const [activeFocusSession, setActiveFocusSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(null);

  const clearUserData = useCallback(() => {
    userIdRef.current = null;
    setUser(null);
    setProfile(null);
    setTasks([]);
    setActivities([]);
    setWeeklyEntries([]);
    setHabitDefinitions([]);
    setHabitDefinitionsError('');
    setEnergyLevels([]);
    setChronotype(null);
    setHiddenAnswers({});
    setActiveTask(null);
    setActiveFocusSession(null);
    setError('');
  }, []);

  const applyFocusSession = useCallback((session, currentTasks, expectedUserId, preserveTaskWhenInactive = false) => {
    if (!session) {
      setActiveFocusSession(null);
      if (!preserveTaskWhenInactive) setActiveTask(null);
      return null;
    }
    if (session.user_id !== expectedUserId) {
      throw new Error('La sesión activa recuperada no pertenece al usuario autenticado.');
    }

    setActiveFocusSession(session);
    const task = currentTasks.find(item => item.id === session.task_id);
    if (!task) {
      setActiveTask(null);
      throw new Error('No se encontró la tarea asociada a la sesión activa.');
    }

    const duration = Number(session.planned_duration_seconds) / 60;
    const restoredTask = { ...task, duration };
    setActiveTask(restoredTask);
    return restoredTask;
  }, []);

  const loadDashboard = useCallback(async (authenticatedUser, isCurrent = () => true) => {
    if (!authenticatedUser?.id) {
      clearUserData();
      setError('No se pudo cargar la sesión autenticada.');
      setLoading(false);
      return;
    }

    const currentUserId = authenticatedUser.id;
    userIdRef.current = currentUserId;
    setLoading(true);
    setError('');

    let results;
    const habitDefinitionsRequest = getPlannerHabits(currentUserId).catch(habitError => {
      console.error('Habit definitions load failed:', habitError);
      return { habits: { recommended: [], custom: [] }, error: habitError };
    });
    try {
      results = await Promise.all([
        getTasks(currentUserId),
        getRecentActivity(currentUserId),
        getActiveFocusSession(currentUserId),
        getWeeklyPlanner(currentUserId, getWeekStart()),
        getWeeklyEnergyLevels(currentUserId, getWeekStart()),
        getUserChronotype(currentUserId),
        getCurrentProfile(currentUserId),
        habitDefinitionsRequest,
      ]);
    } catch (loadError) {
      if (!isCurrent() || userIdRef.current !== currentUserId) return;
      console.error('Dashboard data load failed:', loadError);
      setError('No se pudo cargar el dashboard. Inténtalo de nuevo.');
      setLoading(false);
      return;
    }
    const [
      { tasks: currentTasks, error: tasksError },
      { activities: currentActivities, error: activitiesError },
      { session: currentFocusSession, error: focusSessionError },
      { entries: plannerEntries, error: plannerError },
      { data: energyData, error: energyError },
      { data: chronotypeData, error: chronotypeError },
      { profile: currentProfile, error: profileError },
      { habits: plannerHabits, error: plannerHabitsError },
    ] = results;

    if (!isCurrent() || userIdRef.current !== currentUserId) return;
    const loadError = tasksError || focusSessionError || plannerError || energyError || chronotypeError || profileError;
    if (loadError) {
      setError(focusSessionError
        ? 'No se pudo recuperar la sesión de enfoque. Inténtalo de nuevo.'
        : 'No se pudo cargar el dashboard. Inténtalo de nuevo.');
      setLoading(false);
      return;
    }
    if (!currentProfile) {
      setError('No se pudo cargar tu perfil.');
      setLoading(false);
      return;
    }

    let restoredTask;
    try {
      restoredTask = applyFocusSession(currentFocusSession, currentTasks, currentUserId);
    } catch (restoreError) {
      console.error('Focus session recovery failed:', restoreError);
      setError(restoreError.message);
    }

    setUser(authenticatedUser);
    setProfile(currentProfile);
    setHiddenAnswers(currentProfile.hidden_answers || {});
    const profileHabitGroups = normalizeHabits(currentProfile.habits);
    setHabitDefinitions([
      ...(plannerHabits?.recommended || []),
      ...(plannerHabits?.custom || []),
      ...profileHabitGroups.recommended,
      ...profileHabitGroups.custom,
    ]);
    setHabitDefinitionsError(plannerHabitsError
      ? 'No se pudieron cargar todas las definiciones de hábitos.'
      : '');
    setTasks(currentTasks);
    setActivities(activitiesError ? [] : currentActivities);
    setWeeklyEntries(plannerEntries || []);
    setEnergyLevels(energyData || []);
    setChronotype(chronotypeData?.chronotype || null);
    setActiveTask(restoredTask || null);
    setLoading(false);
  }, [applyFocusSession, clearUserData]);

  useEffect(() => {
    let mounted = true;
    let authChanged = false;
    let loadTimeout;
    let requestVersion = 0;

    const runLoad = async (authenticatedUser) => {
      const version = ++requestVersion;
      await loadDashboard(authenticatedUser, () => mounted && version === requestVersion);
    };

    getAuthenticatedUser().then(({ user: authenticatedUser, error: userError }) => {
      if (!mounted || authChanged) return;
      if (userError) {
        clearUserData();
        setError('No se pudo cargar la sesión autenticada.');
        setLoading(false);
        return;
      }
      runLoad(authenticatedUser);
    }).catch((loadError) => {
      if (!mounted || authChanged) return;
      console.error('Authenticated session load failed:', loadError);
      clearUserData();
      setError('No se pudo cargar la sesión autenticada.');
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || event === 'INITIAL_SESSION') return;
      authChanged = true;
      requestVersion += 1;
      clearUserData();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      loadTimeout = window.setTimeout(() => runLoad(session.user), 0);
    });

    return () => {
      mounted = false;
      requestVersion += 1;
      window.clearTimeout(loadTimeout);
      subscription.unsubscribe();
    };
  }, [clearUserData, loadDashboard]);

  const refreshProfile = useCallback(async (currentUserId) => {
    const { profile: currentProfile, error: profileError } = await getCurrentProfile(currentUserId);
    if (userIdRef.current === currentUserId && !profileError && currentProfile) {
      setProfile(currentProfile);
    }
    return { profile: currentProfile, error: profileError };
  }, []);

  const completeHabit = useCallback(async (entryId) => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) {
      return { entry: null, error: new Error('No se pudo identificar al usuario para completar el hábito.') };
    }

    const { entry, error: completionError } = await completeHabitOccurrence(entryId, currentUserId);
    if (completionError) return { entry: null, error: completionError };
    if (userIdRef.current !== currentUserId) {
      return { entry: null, error: new Error('El usuario cambió antes de confirmar el hábito.') };
    }

    setWeeklyEntries(current => current.map(item => item.id === entry.id ? entry : item));
    return { entry, error: null };
  }, []);

  const refreshDashboard = useCallback(async (currentUserId) => {
    if (userIdRef.current !== currentUserId) return { error: new Error('El usuario del dashboard cambió.') };

    let results;
    try {
      results = await Promise.all([
        getTasks(currentUserId),
        getRecentActivity(currentUserId),
        getActiveFocusSession(currentUserId),
      ]);
    } catch (refreshError) {
      if (userIdRef.current !== currentUserId) return { error: refreshError };
      console.error('Dashboard refresh failed:', refreshError);
      setError('No se pudieron sincronizar los datos del dashboard.');
      return { error: refreshError };
    }
    const [
      { tasks: currentTasks, error: tasksError },
      { activities: currentActivities, error: activitiesError },
      { session: currentFocusSession, error: focusSessionError },
    ] = results;

    if (userIdRef.current !== currentUserId) return { error: new Error('El usuario del dashboard cambió.') };
    const refreshError = tasksError || focusSessionError;
    if (refreshError) {
      setError(focusSessionError
        ? 'No se pudo sincronizar la sesión de enfoque.'
        : 'No se pudieron actualizar las tareas.');
      return { error: refreshError };
    }

    try {
      applyFocusSession(currentFocusSession, currentTasks, currentUserId, true);
    } catch (restoreError) {
      console.error('Focus session synchronization failed:', restoreError);
      setError(restoreError.message);
      return { error: restoreError };
    }
    setTasks(currentTasks);
    setActivities(activitiesError ? [] : currentActivities);
    const { error: profileError } = await refreshProfile(currentUserId);
    return { error: profileError || activitiesError || null };
  }, [applyFocusSession, refreshProfile]);

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const weeklyPlannerEntries = weeklyEntries.filter(e => e.task_id || e.habit_id);
  const todayEnergy = energyLevels.find(e => e.date === formatDate(new Date()));
  const currentEnergy = todayEnergy?.energy_level ?? null;
  const energyLabel = currentEnergy == null
    ? null
    : currentEnergy >= 8 ? 'Alta energía' : currentEnergy >= 5 ? 'Energía media' : 'Baja energía';
  const energyColor = currentEnergy == null
    ? null
    : currentEnergy >= 8 ? 'var(--color-success)' : currentEnergy >= 5 ? 'var(--color-warning)' : 'var(--color-danger)';

  return {
    user,
    profile,
    tasks,
    pendingTasks,
    activities,
    weeklyEntries: weeklyPlannerEntries,
    habitDefinitions,
    habitDefinitionsError,
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
    completeHabit,
  };
}
