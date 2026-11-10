import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePagination } from '../hooks/usePagination'
import PaginationControls from './PaginationControls'
import { useEnergyPopover } from '../../../hooks/useEnergyPopover'
import { saveEnergyAtHabitCompletion, saveEnergyAtTaskEnd } from '../../../services/energy'

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
  userId,
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
  const pagination = usePagination(itemEntries, {
    baseItemsPerPage: 2,
    minItemsPerPage: 2,
    maxItemsPerPage: 2,
    adaptive: false,
  })
  const title = isTask ? 'Tareas sin completar' : 'Hábitos sin completar'
  const target = isTask ? '/tasks' : '/habits'

  const { openEnergyPopover } = useEnergyPopover()
  const energyTriggerRefs = useMemo(() => new Map(), [])

  const handleOpenHabitEnergyPopover = (e, entry) => {
    e.stopPropagation()
    if (!userId) return
    openEnergyPopover({
      value: 5,
      label: 'Energía al completar',
      triggerRef: { current: energyTriggerRefs.get(entry.id) },
      onSave: async (energy) => {
        const { error } = await saveEnergyAtHabitCompletion(userId, energy)
        if (error) throw error
      },
      disabled: updatingEntryId === entry.id,
    })
  }

  const handleStatusChangeWithEnergy = (event, entry, status) => {
    event.stopPropagation()
    if (userId) {
      const trigger = event.currentTarget
      openEnergyPopover({
        value: 5,
        label: 'Energía al finalizar',
        triggerRef: { current: trigger },
        onSave: async (energy) => {
          const saveEnergy = isTask ? saveEnergyAtTaskEnd : saveEnergyAtHabitCompletion
          const { error } = await saveEnergy(userId, energy)
          if (error) throw error
        },
        disabled: updatingEntryId === entry.id,
      })
    }
    onStatusChange(entry, itemType, status)
  }

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
                {!isTask && (
                  <button
                    ref={(node) => {
                      if (node) energyTriggerRefs.set(entry.id, node)
                      else energyTriggerRefs.delete(entry.id)
                    }}
                    type="button"
                    className="habit-energy-trigger"
                    onClick={(e) => handleOpenHabitEnergyPopover(e, entry)}
                    disabled={updatingEntryId === entry.id}
                    aria-label="Registrar energía al completar"
                    title="Registrar energía al completar"
                  >
                    ⚡
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => handleStatusChangeWithEnergy(event, entry, 'completed')}
                  disabled={updatingEntryId === entry.id}
                >
                  Finalizada
                </button>
                <button
                  type="button"
                  onClick={(event) => handleStatusChangeWithEnergy(event, entry, 'failed')}
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