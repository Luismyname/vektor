import ActivityPanel from './ActivityPanel'

// Adaptador ligero para mostrar actividad sin acciones de selección de tarea.
export default function DashboardActivity({ activities = [] }) {
  return <ActivityPanel activities={activities} />
}
