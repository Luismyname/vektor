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
  nextAction,
  habitDefinitions,
  habitDefinitionsError,
  onCompleteHabit,
  tasks,
  activities,
  progressActivities,
  progressActivitiesError,
  weeklyEntries,
  currentEnergy,
  isActionBusy,
  actionError,
  onStartNextSession,
  onOpenPlanner,
  onHideProgressActivity,
}) {
  const today = formatDate(new Date());
  const todayHabitEntries = weeklyEntries.filter(
    entry => entry.date === today && typeof entry.habit_id === 'string' && entry.habit_id.length > 0,
  );

  return (
    <div className="dashboard-v2-grid" role="region" aria-label="Panel principal">
      <DirectionCard profile={profile} />
      <NextActionCard
        action={nextAction}
        currentEnergy={currentEnergy}
        energyColor={currentEnergy == null ? 'var(--accent)' : currentEnergy >= 8 ? 'var(--color-success)' : currentEnergy >= 5 ? 'var(--color-warning)' : 'var(--color-danger)'}
        isBusy={isActionBusy}
        actionError={actionError}
        onStartNext={onStartNextSession}
        onOpenPlanner={onOpenPlanner}
      />
      <HabitsCard
        entries={todayHabitEntries}
        habitDefinitions={habitDefinitions}
        definitionsError={habitDefinitionsError}
        onComplete={onCompleteHabit}
      />
      <TodayPlanCard
        tasks={tasks}
        activeHabits={habitDefinitions}
        weeklyEntries={weeklyEntries}
        nextAction={nextAction}
      />
      <InsightsCard tasks={tasks} activities={activities} />
      <RecentActivityCard
        activities={progressActivities}
        loadError={progressActivitiesError}
        onHideActivity={onHideProgressActivity}
      />
    </div>
  );
}