function getActivity(entry, taskById, habitById) {
  if (!entry) return { title: 'Actividad', type: 'Actividad' }
  if (entry.task_id) return { title: taskById[entry.task_id]?.title || 'Tarea', type: 'Tarea' }
  if (entry.habit_id) return { title: habitById[entry.habit_id]?.title || 'Hábito', type: 'Hábito' }
  if (entry.obligation_id) return { title: entry.obligation?.title || 'Obligación', type: 'Obligación' }
  return { title: entry.notes?.trim() || 'Recordatorio', type: 'Recordatorio' }
}

function formatTime(entry) {
  if (!entry) return 'Horario no disponible'
  const start = entry.start_time?.slice(0, 5) || '—'
  const end = entry.end_time?.slice(0, 5) || '—'
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  const duration = Number.isFinite(startHour) && Number.isFinite(startMinute)
    && Number.isFinite(endHour) && Number.isFinite(endMinute)
    ? ((endHour * 60 + endMinute - startHour * 60 - startMinute + 1440) % 1440)
    : null
  return `${entry.date} · ${start}–${end}${duration ? ` · ${duration} min` : ''}`
}

function formatDeadline(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export default function PlannerConflictNotice({
  conflicts,
  entries,
  taskById,
  habitById,
  error,
  busyId,
  onResolve,
  onDismiss,
}) {
  const visible = conflicts.filter((conflict) => conflict.status !== 'resolved' && conflict.status !== 'dismissed')
  if (!visible.length && !error) return null

  const entryById = new Map(entries.map((entry) => [entry.id, entry]))

  return (
    <section className="planner-conflict-notice" aria-label="Conflictos de agenda">
      {error && <p role="alert">{error}</p>}
      {!!visible.length && (
        <>
          <h2>⚠️ Se han detectado conflictos</h2>
          <ul>
            {visible.map((conflict) => {
              const obligation = entryById.get(conflict.source_entry_id)
              const affected = entryById.get(conflict.conflicting_entry_id)
              const obligationInfo = obligation
                ? getActivity(obligation, taskById, habitById)
                : { title: conflict.source_title || 'Obligación', type: conflict.source_type || 'Obligación' }
              const affectedInfo = affected
                ? getActivity(affected, taskById, habitById)
                : { title: conflict.conflicting_title || 'Actividad', type: conflict.conflicting_type || 'Actividad' }
              const busy = busyId === conflict.id

              return (
                <li key={conflict.id}>
                  <p>
                    <strong>{obligationInfo.title}</strong> ({obligationInfo.type}, {formatTime(obligation)})
                    {' se solapa con '}
                    <strong>{affectedInfo.title}</strong> ({affectedInfo.type}, {formatTime(affected)}).
                  </p>
                  {conflict.resolution_message && <p role="alert">{conflict.resolution_message}</p>}
                  {conflict.status === 'pending' && (
                    <div className="planner-conflict-actions">
                      <span>¿Cómo deseas resolverlos?</span>
                      <button type="button" disabled={busy} onClick={() => onResolve(conflict.id, 'manual')}>
                        Resolver manualmente
                      </button>
                      <button type="button" disabled={busy} onClick={() => onResolve(conflict.id, 'automatic')}>
                        Reorganizar automáticamente
                      </button>
                    </div>
                  )}
                  {conflict.status === 'manual' && (
                    <p role="status">
                      {conflict.grace_until
                        ? `Advertencia activa. Si el conflicto sigue presente, Vektor reorganizará las tareas y los hábitos afectados después de 30 minutos (aprox. ${formatDeadline(conflict.grace_until)}).`
                        : 'Este conflicto requiere una resolución manual. Las obligaciones y los recordatorios nunca se modifican automáticamente.'}
                    </p>
                  )}
                  {conflict.status === 'automatic' && <p role="status">Reorganización automática en curso; obligaciones y recordatorios no se moverán.</p>}
                  {['backlog', 'unscheduled', 'resolved'].includes(conflict.status) && (
                    <button type="button" disabled={busy} onClick={() => onDismiss(conflict.id)}>
                      Cerrar aviso
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
