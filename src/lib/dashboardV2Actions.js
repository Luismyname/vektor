const TERMINAL_PLANNER_STATUSES = new Set(['completed', 'failed']);

function getLocalDateTime(date, time) {
  return new Date(`${date}T${time}`);
}

function getMinutesBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / 60000);
}

function resolveAction(entry, tasks, habits, now, activeTask, activeFocusSession) {
  const task = entry.task_id
    ? tasks.find(candidate => candidate.id === entry.task_id)
    : null;
  const habit = entry.habit_id
    ? habits.find(candidate => candidate.id === entry.habit_id || candidate.title === entry.habit_id)
    : null;

  if ((entry.task_id && !task) || (task && task.status === 'completed')) return null;
  if (TERMINAL_PLANNER_STATUSES.has(entry.status)) return null;

  const type = entry.task_id ? 'task' : 'habit';
  const scheduledStart = getLocalDateTime(entry.date, entry.start_time);
  const scheduledEnd = getLocalDateTime(entry.date, entry.end_time);
  const sessionTaskId = activeFocusSession?.task_id;
  const isActiveTask = type === 'task'
    && activeTask?.id === entry.task_id
    && (!sessionTaskId || sessionTaskId === activeTask.id);
  const isActiveSession = type === 'task'
    && activeFocusSession
    && ['running', 'paused'].includes(activeFocusSession.status)
    && activeFocusSession.task_id === entry.task_id;
  const active = isActiveTask || isActiveSession || task?.status === 'in_progress';
  const actualStart = type === 'task'
    && activeFocusSession?.task_id === entry.task_id
    && activeFocusSession?.started_at
    ? new Date(activeFocusSession.started_at)
    : null;
  const startOffsetMinutes = actualStart
    ? Math.floor((actualStart.getTime() - scheduledStart.getTime()) / 60000)
    : null;
  const delayMinutes = Math.max(0, getMinutesBetween(scheduledStart, now));
  const startsInMinutes = Math.max(0, getMinutesBetween(now, scheduledStart));

  return {
    id: entry.id,
    type,
    plannerEntryId: entry.id,
    scheduledStart,
    scheduledEnd,
    scheduledDuration: Math.max(0, getMinutesBetween(scheduledStart, scheduledEnd)),
    actualStart,
    startOffsetMinutes,
    actualDuration: task?.actual_duration != null && Number.isFinite(Number(task.actual_duration))
      ? Number(task.actual_duration)
      : null,
    status: active
      ? 'active'
      : now < scheduledStart
        ? 'upcoming'
        : delayMinutes === 0
          ? 'available'
          : 'delayed',
    delayMinutes,
    startsInMinutes,
    title: task?.title || habit?.title || 'Hábito eliminado',
    task,
    habit,
    entry,
  };
}

export function selectNextDashboardAction({
  entries = [],
  tasks = [],
  habits = [],
  activeTask = null,
  activeFocusSession = null,
  now = new Date(),
}) {
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const candidates = entries
    .filter(entry => entry.date === today
      && (Boolean(entry.task_id) !== Boolean(entry.habit_id))
      && !TERMINAL_PLANNER_STATUSES.has(entry.status))
    .map(entry => resolveAction(entry, tasks, habits, now, activeTask, activeFocusSession))
    .filter(Boolean)
    .sort((left, right) => left.scheduledStart - right.scheduledStart);

  const activeCandidates = candidates.filter(action => action.status === 'active');
  const sessionStart = activeFocusSession?.started_at
    ? new Date(activeFocusSession.started_at).getTime()
    : null;
  const activeAction = sessionStart == null
    ? activeCandidates[0]
    : activeCandidates.sort((left, right) => (
      Math.abs(left.scheduledStart.getTime() - sessionStart)
      - Math.abs(right.scheduledStart.getTime() - sessionStart)
    ))[0];
  return activeAction || candidates[0] || null;
}
