export default function HabitItem({ habit, onToggle, onRemove }) {
  return (
    <li className={`habit-item${habit.active ? '' : ' habit-item-inactive'}`}>
      <label className="habit-item-label">
        <input type="checkbox" checked={habit.active} onChange={() => onToggle(habit.id)} />
        <span>{habit.title}</span>
      </label>
      {onRemove && <button className="habit-remove" type="button" onClick={() => onRemove(habit.id)} aria-label={`Eliminar ${habit.title}`}>Eliminar</button>}
    </li>
  )
}