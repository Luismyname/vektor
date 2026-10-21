import {
  DirectionCard,
  NextActionCard,
  HabitsCard,
  TodayPlanCard,
  InsightsCard,
  RecentActivityCard,
} from './cards';
import { formatDate } from '@/services/weekly-planner';

export function DashboardV2Grid({
  profile,
  activeTask,
  activeHabits,
  habitDefinitions,
  habitDefinitionsError,
  onCompleteHabit,
  tasks,
  pendingTasks,
  activities,
  weeklyEntries,
  currentEnergy,
  onStartNextSession,
  onCreateTask,
}) {
  const nextAction = pendingTasks[0] || null;
  const today = formatDate(new Date());
  const nextActionEntry = nextAction && weeklyEntries.find(
    entry => entry.task_id === nextAction.id && entry.date === today,
  );
  const scheduledTime = nextActionEntry?.start_time && nextActionEntry?.end_time
    ? `${nextActionEntry.start_time.slice(0, 5)} – ${nextActionEntry.end_time.slice(0, 5)}`
    : null;
  const todayHabitEntries = weeklyEntries.filter(
    entry => entry.date === today && typeof entry.habit_id === 'string' && entry.habit_id.length > 0,
  );

  return (
    <div className="dashboard-v2-grid" role="region" aria-label="Panel principal">
      <DirectionCard profile={profile} />
      <NextActionCard
        activeTask={activeTask}
        nextAction={nextAction}
        scheduledTime={scheduledTime}
        currentEnergy={currentEnergy}
        energyColor={currentEnergy == null ? 'var(--accent)' : currentEnergy >= 8 ? 'var(--color-success)' : currentEnergy >= 5 ? 'var(--color-warning)' : 'var(--color-danger)'}
        onStartNext={onStartNextSession}
        onCreateTask={onCreateTask}
      />
      <HabitsCard
        entries={todayHabitEntries}
        habitDefinitions={habitDefinitions}
        definitionsError={habitDefinitionsError}
        onComplete={onCompleteHabit}
      />
      <TodayPlanCard
        activeTask={activeTask}
        tasks={tasks}
        activeHabits={activeHabits}
        weeklyEntries={weeklyEntries}
      />
      <InsightsCard tasks={tasks} activities={activities} />
      <RecentActivityCard activities={activities} />
    </div>
  );
}