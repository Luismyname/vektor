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
}) {
  const nextAction = pendingTasks[0] || null;

  return (
    <div className="dashboard-v2-grid" role="region" aria-label="Panel principal">
      {/* Columna 1 */}
      <div className="grid-col">
        <DirectionCard profile={profile} />
        <HabitsCard habits={activeHabits} />
        <InsightsCard profile={profile} />
      </div>

      {/* Columna 2 */}
      <div className="grid-col">
        <NextActionCard
          activeTask={activeTask}
          nextAction={nextAction}
          currentEnergy={currentEnergy}
          energyColor={currentEnergy >= 8 ? 'var(--color-success)' : currentEnergy >= 5 ? 'var(--color-warning)' : 'var(--color-danger)'}
          onStartNext={onStartNextSession}
        />
        <TodayPlanCard
          activeTask={activeTask}
          weeklyEntries={weeklyEntries}
        />
        <RecentActivityCard activities={activities} />
      </div>
    </div>
  );
}