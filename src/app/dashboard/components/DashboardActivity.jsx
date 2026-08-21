import ActivityPanel from './ActivityPanel'

export default function DashboardActivity({ activities = [] }) {
  return <ActivityPanel activities={activities} />
}
