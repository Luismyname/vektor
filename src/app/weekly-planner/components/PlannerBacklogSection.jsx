import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePagination } from '../hooks/usePagination'
import { useSortedByNextStartTime } from '../hooks/useSortedByNextStartTime'
import PaginationControls from './PaginationControls'

function getCognitiveLoad(item) {
  const load = String(item.cognitive_load || item.cognitiveLoad || item.priority || 'medium').toUpperCase()
  return ['LOW', 'MEDIUM', 'HIGH'].includes(load) ? load : 'MEDIUM'
}

function BacklogCard({ item, itemType, onDragStart, onHabitSchedule }) {
  const nextTime = item.nextStart?.start_time?.slice(0, 5) || '—'
  const cognitiveLoad = getCognitiveLoad(item)
  const className = itemType === 'task' ? 'weekly-backlog-task' : 'weekly-habit-picker'
  const title = item.title || 'Sin título'
  const content = (
    <>
      <strong>{title}</strong>
      <span className="weekly-card-meta">
        <span className={`weekly-cognitive-load is-${cognitiveLoad.toLowerCase()}`}>
          {cognitiveLoad}
        </span>
        <span className="weekly-start-time">{nextTime}</span>
      </span>
      {itemType === 'habit' && <small>Arrastra o pulsa para +07:00</small>}
    </>
  )

  if (itemType === 'habit') {
    return (
      <button
        type="button"
        draggable
        className={className}
        onDragStart={(event) => onDragStart(event, item)}
        onClick={() => onHabitSchedule(item)}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className={`${className} priority-${item.priority || 'medium'}`}
      draggable
      onDragStart={(event) => onDragStart(event, item)}
    >
      {content}
    </div>
  )
}

export default function PlannerBacklogSection({
  itemType,
  items,
  entries,
  onDragStart,
  onHabitSchedule,
}) {
  const isTask = itemType === 'task'
  const availableItems = useMemo(() => (
    isTask
      ? items.filter((task) => (
        task.status !== 'completed'
        && !entries.some((entry) => entry.task_id === task.id)
      ))
      : items.filter((habit) => habit.active !== false)
  ), [entries, isTask, items])
  const sortedItems = useSortedByNextStartTime(availableItems, entries, itemType)
  const pagination = usePagination(sortedItems)
  const title = isTask ? 'Tareas por colocar' : 'Hábitos por colocar'
  const target = isTask ? '/tasks' : '/habits'

  return (
    <section className="weekly-list-section" aria-label={title}>
      <div className="weekly-list-heading">
        <div>
          <h2>{title}</h2>
          <p>{isTask ? 'Arrastra una tarea a cualquier hora.' : 'Arrastra un hábito o prográmalo a las 07:00.'}</p>
        </div>
        {!!sortedItems.length && <PaginationControls pagination={pagination} />}
      </div>
      {sortedItems.length ? (
        <ul className="weekly-list-items">
          {pagination.currentItems.map((item) => (
            <li key={item.id || item.title}>
              <BacklogCard
                item={item}
                itemType={itemType}
                onDragStart={onDragStart}
                onHabitSchedule={onHabitSchedule}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="weekly-list-empty">{isTask ? 'No hay tareas pendientes por colocar.' : 'No hay hábitos activos.'}</p>
      )}
      <div className="weekly-list-footer">
        <Link to={target}>Ver todo</Link>
      </div>
    </section>
  )
}
