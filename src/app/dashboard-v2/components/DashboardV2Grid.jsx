import {
  DirectionCard,
  NextActionCard,
  HabitsCard,
  TodayPlanCard,
  InsightsCard,
  RecentActivityCard,
} from './cards';

export function DashboardV2Grid({
  profile,
  activeTask,
  activeHabits,
  pendingTasks,
  activities,
  weeklyEntries,
  currentEnergy,
  onStartNextSession,
  onCreateTask,
}) {
  const nextAction = pendingTasks[0] || null;

  return (
    <div className="dashboard-v2-grid" role="region" aria-label="Panel principal">
      <DirectionCard profile={profile} />
      <NextActionCard
        activeTask={activeTask}
        nextAction={nextAction}
        currentEnergy={currentEnergy}
        energyColor={currentEnergy >= 8 ? 'var(--color-success)' : currentEnergy >= 5 ? 'var(--color-warning)' : 'var(--color-danger)'}
        onStartNext={onStartNextSession}
        onCreateTask={onCreateTask}
      />
      <HabitsCard habits={activeHabits} />
      <TodayPlanCard
        activeTask={activeTask}
        weeklyEntries={weeklyEntries}
      />
      <InsightsCard profile={profile} />
      <RecentActivityCard activities={activities} />
    </div>
  );
}