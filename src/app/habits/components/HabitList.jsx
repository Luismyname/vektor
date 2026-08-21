import HabitItem from './HabitItem'

export default function HabitList({ habits, onToggle, onRemove }) {
  if (!habits.length) return <p className="dashboard-empty">Todavía no hay hábitos en esta lista.</p>
  return <ul className="habit-list">{habits.map((habit) => <HabitItem key={habit.id} habit={habit} onToggle={onToggle} onRemove={onRemove} />)}</ul>
}