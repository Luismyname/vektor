import { useState, useCallback, useEffect } from 'react';
import { useDashboardV2Data } from './hooks/useDashboardV2Data';
import { useTaskTimer } from '@/hooks/useTaskTimer';
import { usePreferences } from '@/hooks/usePreferences';
import { startTask, stopTask, extendTask, completeTask } from '@/services/tasks';
import { startFocusSession, transitionFocusSession } from '@/services/focus-sessions';
import {
  DashboardV2Header,
  DashboardV2Hero,
  DashboardV2Grid,
  DashboardV2Modals,
} from './components';
import './DashboardV2.css';

const DEFAULT_DURATION = 25;

export default function DashboardV2() {
  const { preferences } = usePreferences();
  const defaultDuration = preferences.timerMinutes || DEFAULT_DURATION;

  const {
    user,
    profile,
    pendingTasks,
    activities,
    weeklyEntries,
    currentEnergy,
    energyLabel,
    energyColor,
    loading,
    error,
    activeTask,
    setActiveTask,
    activeFocusSession,
    setActiveFocusSession,
    setTasks,
    refreshDashboard,
  } = useDashboardV2Data(defaultDuration);

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isFinishingTask, setIsFinishingTask] = useState(false);
  const [finishError, setFinishError] = useState('');

  const activeTimer = useTaskTimer({
    durationMinutes: activeTask ? (activeTask.duration || defaultDuration) : defaultDuration,
    isActive: Boolean(activeTask),
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
    if (!activeFocusSession) return { error: null };
    const { session, error: focusError } = await transitionFocusSession(activeFocusSession.id, status);
    if (!focusError) setActiveFocusSession(status === 'running' || status === 'paused' ? session : null);
    return { session, error: focusError };
  }

  async function handleTimerExpire() {
    setFinishError('');
    const { error } = await transitionActiveFocusSession('completed');
    if (error) setFinishError('No se pudo guardar el final de la sesión de enfoque.');
    setShowEndModal(true);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleStartConfirm = useCallback(async () => {
    if (!selectedTask || !user) return;
    setFinishError('');
    const duration = Number(selectedDuration);
    const { error: taskError } = await startTask(selectedTask, duration, user.id);
    if (taskError) return console.error('Start task failed:', taskError);

    const { session, error: sessionError } = await startFocusSession(user.id, selectedTask.id, duration);
    if (sessionError) {
      await stopTask(selectedTask, user.id);
      setFinishError('No se pudo guardar la sesión de enfoque.');
      return;
    }

    setActiveFocusSession(session);
    setTasks(current => current.map(t => t.id === selectedTask.id ? { ...t, duration } : t));
    setActiveTask({ ...selectedTask, duration });
    setShowStartModal(false);
    setSelectedTask(null);
    setSelectedDuration(defaultDuration);
    activeTimer.start(duration);
    await refreshDashboard(user.id);
  }, [selectedTask, selectedDuration, user, defaultDuration, activeTimer, refreshDashboard, setActiveFocusSession, setActiveTask, setTasks]);

  const handleContinueTimer = async () => {
    if (!activeTask || !user) return;
    const duration = Number(activeTask.duration || defaultDuration);
    const { error } = await extendTask(activeTask, duration, user.id);
    if (error) return;

    const { error: closeError } = await transitionActiveFocusSession('completed');
    if (closeError) return setFinishError('No se pudo cerrar la sesión anterior.');

    const { session, error: sessionError } = await startFocusSession(user.id, activeTask.id, duration);
    if (sessionError) return setFinishError('No se pudo guardar la nueva sesión de enfoque.');

    setActiveFocusSession(session);
    setFinishError('');
    setShowEndModal(false);
    activeTimer.start(duration);
    await refreshDashboard(user.id);
  };

  const handlePauseTimer = async () => {
    const { session, error } = await transitionActiveFocusSession('paused');
    if (error) return setFinishError('No se pudo guardar la pausa.');
    if (session) setActiveFocusSession(session);
    activeTimer.pause();
  };

  const handleResumeTimer = async () => {
    const { session, error } = await transitionActiveFocusSession('running');
    if (error) return setFinishError('No se pudo guardar la reanudación.');
    if (session) setActiveFocusSession(session);
    activeTimer.resume();
  };

  const handleStopTimer = async () => {
    if (!activeTask || !user) return;
    const { error: sessionError } = await transitionActiveFocusSession('interrupted');
    if (sessionError) return setFinishError('No se pudo guardar la interrupción.');
    const { error } = await stopTask(activeTask, user.id);
    if (error) return;
    setActiveTask(null);
    setSelectedTask(null);
    setShowStartModal(false);
    activeTimer.reset(0);
    await refreshDashboard(user.id);
  };

  const handleFinishTask = async () => {
    if (isFinishingTask || !activeTask || !user) return;
    setIsFinishingTask(true);
    setFinishError('');
    try {
      const { error: sessionError } = await transitionActiveFocusSession('completed');
      if (sessionError) return setFinishError('No se pudo cerrar la sesión de enfoque.');
      const fallbackDuration = Math.ceil(activeTimer.durationSeconds / 60);
      const { error } = await completeTask(activeTask, user.id, fallbackDuration);
      if (error) return setFinishError('No se pudo registrar la sesión.');

      setShowEndModal(false);
      setActiveTask(null);
      setSelectedTask(null);
      setShowStartModal(false);
      activeTimer.reset(0);
      await refreshDashboard(user.id);
    } catch (err) {
      console.error('Finish task error:', err);
      setFinishError('No se pudo registrar la sesión.');
    } finally {
      setIsFinishingTask(false);
    }
  };

  const handleTaskSelection = useCallback((task) => {
    if (!task) return;
    setActiveTask(task);
    setSelectedTask(task);
    setSelectedDuration(Number(task?.duration) || defaultDuration);
    setShowStartModal(true);
  }, [defaultDuration]);

  if (error) return <div className="dashboard-v2-error">{error}</div>;
  if (loading || !user || !profile) return <div className="dashboard-v2-loading">Cargando dashboard...</div>;

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

        <DashboardV2Grid
          profile={profile}
          activeTask={activeTask}
          activeHabits={activeHabits}
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
          onPauseTimer={handlePauseTimer}
          onResumeTimer={handleResumeTimer}
          onStopTimer={handleStopTimer}
          activeTimer={activeTimer}
        />

        {finishError && !showEndModal && <div className="dashboard-v2-error" role="alert">{finishError}</div>}
      </div>
    </main>
  );
}