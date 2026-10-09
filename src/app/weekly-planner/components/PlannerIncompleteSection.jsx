import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePagination } from '../hooks/usePagination'
import PaginationControls from './PaginationControls'

const INCOMPLETE_STATUSES = new Set(['scheduled', 'failed', 'moved'])

function getPlannerItem(entry, items, itemType) {
  const plannerItemId = entry[`${itemType}_id`]
  const item = items.find((candidate) => (
    itemType === 'task'
      ? candidate.id === plannerItemId
      : (candidate.id || candidate.title) === plannerItemId
  ))

  return { ...entry, title: item?.title || (itemType === 'task' ? 'Tarea eliminada' : 'Hábito eliminado') }
}

function formatDate(date) {
  if (!date) return ''
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

export default function PlannerIncompleteSection({
  itemType,
  entries,
  items,
  onStatusChange,
  updatingEntryId,
}) {
  const isTask = itemType === 'task'
  const itemEntries = useMemo(() => entries
    .filter((entry) => (
      entry[`${itemType}_id`] && INCOMPLETE_STATUSES.has(entry.status)
    ))
    .map((entry) => getPlannerItem(entry, items, itemType))
    .sort((left, right) => (
      `${left.date}T${left.start_time}`.localeCompare(`${right.date}T${right.start_time}`)
    )), [entries, itemType, items])
  const pagination = usePagination(itemEntries)
  const title = isTask ? 'Tareas sin completar' : 'Hábitos sin completar'
  const target = isTask ? '/tasks' : '/habits'

  return (
    <section className="weekly-list-section" aria-label={title}>
      <div className="weekly-list-heading">
        <div>
          <h2>{title}</h2>
          <p>Bloques que todavía requieren seguimiento.</p>
        </div>
        {!!itemEntries.length && <PaginationControls pagination={pagination} />}
      </div>
      {itemEntries.length ? (
        <ul className="weekly-list-items">
          {pagination.currentItems.map((entry) => (
            <li className="weekly-incomplete-item" key={entry.id}>
              <div className="weekly-incomplete-copy">
                <strong>{entry.title}</strong>
                <span>{formatDate(entry.date)} · {entry.start_time?.slice(0, 5) || '—'}</span>
              </div>
              <div className="weekly-status-actions">
                <button
                  type="button"
                  onClick={() => onStatusChange(entry, itemType, 'completed')}
                  disabled={updatingEntryId === entry.id}
                >
                  Finalizada
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(entry, itemType, 'failed')}
                  disabled={updatingEntryId === entry.id}
                >
                  No finalizada
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="weekly-list-empty">No hay elementos sin completar.</p>
      )}
      <div className="weekly-list-footer">
        <Link to={target}>Ver todo</Link>
      </div>
    </section>
  )
}
