import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePagination } from '../hooks/usePagination'
import PaginationControls from './PaginationControls'
import { useEnergyPopover } from '../../../hooks/useEnergyPopover'
import {
  saveEnergyAtHabitCompletion,
  saveEnergyAtMoment,
  saveEnergyAtTaskEnd,
  saveEnergyAtTaskStart,
} from '../../../services/energy'
import { recordHabitImpact, recordTaskImpact } from '../../../services/energy-impact-engine'

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
  const impactIdRefs = useMemo(() => new Map(), [])

  const handleOpenEnergyPopover = (e, entry, phase, status) => {
    e.stopPropagation()
    if (!userId) return
    openEnergyPopover({
      value: 5,
      label: phase === 'start' ? 'Energía inicial' : 'Energía al finalizar',
      triggerRef: { current: energyTriggerRefs.get(entry.id) },
      onSave: async (energy) => {
        const saveEnergy = phase === 'start'
          ? (isTask ? saveEnergyAtTaskStart(userId, energy) : saveEnergyAtMoment(userId, energy, 'habit_start'))
          : (isTask ? saveEnergyAtTaskEnd(userId, energy) : saveEnergyAtHabitCompletion(userId, energy))
        const { error } = await saveEnergy
        if (error) throw error
        const activityId = entry[`${itemType}_id`]
        if (phase === 'start' || status === 'completed') {
          const impact = await (isTask ? recordTaskImpact : recordHabitImpact)(
            userId,
            activityId,
            phase,
            energy,
            phase === 'finish' ? impactIdRefs.get(entry.id) : undefined,
          )
          if (impact.error) throw impact.error
          if (phase === 'start') impactIdRefs.set(entry.id, impact.data?.id)
          else impactIdRefs.delete(entry.id)
        }
      },
      disabled: updatingEntryId === entry.id,
    })
  }

  const handleStatusChangeWithEnergy = (event, entry, status) => {
    event.stopPropagation()
    if (userId) handleOpenEnergyPopover(event, entry, 'finish', status)
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
                <button
                  ref={(node) => {
                    if (node) energyTriggerRefs.set(entry.id, node)
                    else energyTriggerRefs.delete(entry.id)
                  }}
                  type="button"
                  className="habit-energy-trigger"
                  onClick={(event) => handleOpenEnergyPopover(event, entry, 'start')}
                  disabled={updatingEntryId === entry.id}
                  aria-label="Registrar energía inicial"
                  title="Registrar energía inicial"
                >
                  ⚡
                </button>
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