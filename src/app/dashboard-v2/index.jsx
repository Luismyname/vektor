import { useState, useCallback, useEffect } from 'react';
import { useDashboardV2Data } from './hooks/useDashboardV2Data';
import { useTaskTimer } from '@/hooks/useTaskTimer';
import { usePreferences } from '@/hooks/usePreferences';
import { startTask, stopTask, completeTask } from '@/services/tasks';
import { getCompletedFocusDurationSeconds, startFocusSession, transitionFocusSession } from '@/services/focus-sessions';
import {
  DashboardV2Header,
  DashboardV2Hero,
  DashboardV2Grid,
  DashboardV2Modals,
  FocusTimerV2,
} from './components';
import './DashboardV2.css';

const DEFAULT_DURATION = 25;

export default function DashboardV2() {
  const dashboardData = useDashboardV2Data();

  if (dashboardData.error) return <div className="dashboard-v2-error">{dashboardData.error}</div>;
  if (dashboardData.loading || !dashboardData.user || !dashboardData.profile) {
    return <div className="dashboard-v2-loading">Cargando dashboard...</div>;
  }

  return <DashboardV2Content key={dashboardData.user.id} dashboardData={dashboardData} />;
}

function DashboardV2Content({ dashboardData }) {
  const { preferences } = usePreferences();
  const defaultDuration = preferences.timerMinutes || DEFAULT_DURATION;

  const {
    user,
    profile,
    tasks,
    pendingTasks,
    activities,
    weeklyEntries,
    currentEnergy,
    energyLabel,
    energyColor,
    activeTask,
    setActiveTask,
    activeFocusSession,
    setActiveFocusSession,
    setTasks,
    refreshDashboard,
  } = dashboardData;

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isFinishingTask, setIsFinishingTask] = useState(false);
  const [isTimerActionInProgress, setIsTimerActionInProgress] = useState(false);
  const [finishError, setFinishError] = useState('');

  const activeTimer = useTaskTimer({
    session: activeFocusSession,
    onExpire: handleTimerExpire,
  });

  // Refresh profile on mount and when window regains focus
  useEffect(() => {
    if (user) {
      refreshDashboard(user.id);
    }
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        refreshDashboard(user.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, refreshDashboard]);

  const taskPriority = activeTask?.priority || 'medium';

  async function transitionActiveFocusSession(status) {
    if (!activeFocusSession || activeFocusSession.user_id !== user?.id) {
      return { session: null, error: new Error('No se encontró una sesión de enfoque válida para este usuario.') };
    }
    const { session, error: focusError } = await transitionFocusSession(activeFocusSession.id, status, user.id);
    if (focusError) return { session, error: focusError };
    if (!session || session.user_id !== user.id) {
      return { session: null, error: new Error('La sesión actualizada no coincide con el usuario autenticado.') };
    }
    setActiveFocusSession(session);
    return { session, error: null };
  }

  async function handleTimerExpire() {
    if (!activeFocusSession || activeFocusSession.status !== 'running') return;
    setFinishError('');
    const { error } = await transitionActiveFocusSession('completed');
    if (error) {
      setFinishError('No se pudo guardar el final de la sesión de enfoque. Inténtalo de nuevo.');
      return;
    }
    setShowEndModal(true);
  }

  const handleStartConfirm = useCallback(async () => {
    if (!selectedTask || !user) return;
    setFinishError('');
    const duration = Number(selectedDuration);
    const { error: taskError } = await startTask(selectedTask, duration, user.id);
    if (taskError) {
      console.error('Start task failed:', taskError);
      setFinishError('No se pudo iniciar la tarea.');
      return;
    }

    const { session, error: sessionError } = await startFocusSession(user.id, selectedTask.id, duration);
    if (sessionError) {
      const { error: rollbackError } = await stopTask(selectedTask, user.id);
      if (rollbackError) console.error('Could not restore task activity after session start failed:', rollbackError);
      setFinishError('No se pudo guardar la sesión de enfoque.');
      return;
    }

    setActiveFocusSession(session);
    setTasks(current => current.map(t => t.id === selectedTask.id ? { ...t, duration } : t));
    setActiveTask({ ...selectedTask, duration });
    setShowStartModal(false);
    setSelectedTask(null);
    setSelectedDuration(defaultDuration);
    const { error: refreshError } = await refreshDashboard(user.id);
    if (refreshError) setFinishError('La sesión empezó, pero no se pudieron actualizar los datos del dashboard.');
  }, [selectedTask, selectedDuration, user, defaultDuration, refreshDashboard, setActiveFocusSession, setActiveTask, setTasks]);

  const handleContinueTimer = async () => {
    if (!activeTask || !user) return;
    const duration = Number(activeTask.duration || defaultDuration);
    if (activeFocusSession && ['running', 'paused'].includes(activeFocusSession.status)) {
      setFinishError('La sesión actual todavía está activa; deténla o finalízala antes de continuar.');
      return;
    }
    const { session, error: sessionError } = await startFocusSession(user.id, activeTask.id, duration);
    if (sessionError) return setFinishError('No se pudo guardar la nueva sesión de enfoque.');

    setActiveFocusSession(session);
    setFinishError('');
    setShowEndModal(false);
    const { error: refreshError } = await refreshDashboard(user.id);
    if (refreshError) setFinishError('La sesión empezó, pero no se pudieron actualizar los datos del dashboard.');
  };

  const handlePauseTimer = async () => {
    if (isTimerActionInProgress) return;
    setIsTimerActionInProgress(true);
    setFinishError('');
    try {
      const { error } = await transitionActiveFocusSession('paused');
      if (error) setFinishError('No se pudo guardar la pausa.');
    } catch (error) {
      console.error('Pause focus session failed:', error);
      setFinishError('No se pudo guardar la pausa.');
    } finally {
      setIsTimerActionInProgress(false);
    }
  };

  const handleResumeTimer = async () => {
    if (isTimerActionInProgress) return;
    setIsTimerActionInProgress(true);
    setFinishError('');
    try {
      const { error } = await transitionActiveFocusSession('running');
      if (error) setFinishError('No se pudo guardar la reanudación.');
    } catch (error) {
      console.error('Resume focus session failed:', error);
      setFinishError('No se pudo guardar la reanudación.');
    } finally {
      setIsTimerActionInProgress(false);
    }
  };

  const handleStopTimer = async () => {
    if (isTimerActionInProgress || !activeTask || !user) return;
    setIsTimerActionInProgress(true);
    setFinishError('');
    try {
      const { error: sessionError } = await transitionActiveFocusSession('interrupted');
      if (sessionError) {
        setFinishError('No se pudo guardar la interrupción de la sesión.');
        return;
      }
      setActiveFocusSession(null);
      setActiveTask(null);
      setSelectedTask(null);
      setShowStartModal(false);
      const { error } = await stopTask(activeTask, user.id);
      if (error) {
        setFinishError('La sesión se interrumpió, pero no se pudo actualizar la actividad de la tarea.');
      } else {
        const { error: refreshError } = await refreshDashboard(user.id);
        if (refreshError) setFinishError('La sesión se interrumpió, pero no se pudieron actualizar los datos del dashboard.');
      }
    } catch (error) {
      console.error('Stop focus session failed:', error);
      setFinishError('No se pudo completar la interrupción de la sesión.');
    } finally {
      setIsTimerActionInProgress(false);
    }
  };

  const handleFinishTask = async () => {
    if (isFinishingTask || !activeTask || !user) return;
    setIsFinishingTask(true);
    setFinishError('');
    try {
      if (activeFocusSession && ['running', 'paused'].includes(activeFocusSession.status)) {
        const { error: sessionError } = await transitionActiveFocusSession('completed');
        if (sessionError) return setFinishError('No se pudo cerrar la sesión de enfoque.');
      }
      const { durationSeconds, error: durationError } = await getCompletedFocusDurationSeconds(user.id, activeTask.id);
      if (durationError) return setFinishError('No se pudo calcular el tiempo de enfoque registrado.');
      const actualDurationMinutes = Math.ceil(durationSeconds / 60);
      const { error } = await completeTask(activeTask, user.id, actualDurationMinutes);
      if (error) return setFinishError('No se pudo registrar la sesión.');

      setShowEndModal(false);
      setActiveFocusSession(null);
      setActiveTask(null);
      setSelectedTask(null);
      setShowStartModal(false);
      const { error: refreshError } = await refreshDashboard(user.id);
      if (refreshError) setFinishError('La tarea finalizó, pero no se pudieron actualizar los datos del dashboard.');
    } catch (err) {
      console.error('Finish task error:', err);
      setFinishError('No se pudo registrar la sesión.');
    } finally {
      setIsFinishingTask(false);
    }
  };

  const handleTaskSelection = useCallback((task) => {
    if (!task) return;
    setSelectedTask(task);
    setSelectedDuration(Number(task?.duration) || defaultDuration);
    setShowStartModal(true);
  }, [defaultDuration, setShowStartModal]);

  // Normalize habits - handle JSONB object, string, or null from Supabase
  const normalizeHabits = (habits) => {
    if (!habits) return [];
    if (Array.isArray(habits)) return habits;
    if (typeof habits === 'object') return Object.values(habits);
    if (typeof habits === 'string') {
      try { return JSON.parse(habits); } catch { return []; }
    }
    return [];
  };

  const activeHabits = normalizeHabits(profile.habits).filter(h => h.active);

  return (
    <main className="dashboard-v2-page">
      <DashboardV2Header user={user} profile={profile} />

      <div className="dashboard-v2-shell">
        <DashboardV2Hero
          user={user}
          profile={profile}
          currentEnergy={currentEnergy}
          energyLabel={energyLabel}
          energyColor={energyColor}
          pendingTasksCount={pendingTasks.length}
          activeHabitsCount={activeHabits.length}
          onStartNextSession={() => {
            if (pendingTasks.length) {
              const nextTask = pendingTasks[0];
              handleTaskSelection(nextTask);
            }
          }}
        />

        {activeFocusSession && activeTask && (
          <FocusTimerV2
            task={activeTask}
            session={activeFocusSession}
            remainingSeconds={activeTimer.remainingSeconds}
            isBusy={isTimerActionInProgress || isFinishingTask}
            onPause={handlePauseTimer}
            onResume={handleResumeTimer}
            onStop={handleStopTimer}
            onFinishTask={handleFinishTask}
            onContinue={handleContinueTimer}
          />
        )}

        <DashboardV2Grid
          profile={profile}
          activeTask={activeTask}
          activeHabits={activeHabits}
          tasks={tasks}
          pendingTasks={pendingTasks}
          activities={activities}
          weeklyEntries={weeklyEntries}
          currentEnergy={currentEnergy}
          energyLabel={energyLabel}
          energyColor={energyColor}
          onTaskSelection={handleTaskSelection}
          onStartNextSession={() => pendingTasks.length && handleTaskSelection(pendingTasks[0])}
          onCreateTask={() => window.location.href = '/tasks'}
        />

        <DashboardV2Modals
          showStartModal={showStartModal}
          setShowStartModal={setShowStartModal}
          showEndModal={showEndModal}
          setShowEndModal={setShowEndModal}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          selectedDuration={selectedDuration}
          setSelectedDuration={setSelectedDuration}
          defaultDuration={defaultDuration}
          taskPriority={taskPriority}
          isFinishingTask={isFinishingTask}
          finishError={finishError}
          onStartConfirm={handleStartConfirm}
          onContinueTimer={handleContinueTimer}
          onFinishTask={handleFinishTask}
          onCloseStartModal={() => { setShowStartModal(false); setSelectedTask(null); setSelectedDuration(defaultDuration); }}
          onCloseEndModal={() => setShowEndModal(false)}
          onContinueTimer={handleContinueTimer}
          onFinishTask={handleFinishTask}
        />

        {finishError && !showEndModal && <div className="dashboard-v2-error" role="alert">{finishError}</div>}
      </div>
    </main>
  );
}