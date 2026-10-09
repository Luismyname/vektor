import { useNavigate } from 'react-router-dom'
import { useCognitivePagination } from '../../../hooks/useCognitivePagination'

// Componente para lista paginada de hábitos por colocar (máx 3 por página)
export default function DashboardHabitsUpcoming({ 
  habits = [], 
  habitTimes = {}
}) {
  const navigate = useNavigate()
  
  // Filtrar hábitos activos
  const activeHabits = habits.filter((habit) => habit.active !== false)
  
  // Ordenar por próxima hora programada
  const sortedHabits = [...activeHabits].sort((a, b) => {
    const timeA = habitTimes[a.id]?.start_time || '99:99'
    const timeB = habitTimes[b.id]?.start_time || '99:99'
    
    if (timeA !== timeB) return timeA.localeCompare(timeB)
    return (a.title || '').localeCompare(b.title || '')
  })

  const pagination = useCognitivePagination(sortedHabits, 3)

  return (
    <section id="dashboard-habits-upcoming" className="dashboard-card" aria-labelledby="habits-upcoming-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 id="habits-upcoming-title" className="dashboard-section-title">Hábitos por colocar</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {pagination.totalPages > 1 && (
            <>
              {pagination.hasPrev && (
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={pagination.goPrev}
                  aria-label="Página anterior"
                  style={{ minWidth: 'auto', padding: '6px 12px' }}
                >
                  Atrás
                </button>
              )}
              <span
                className="pagination-indicator"
                style={{
                  color: 'var(--muted-text)',
                  fontSize: '13px',
                  fontWeight: 600,
                  minWidth: '36px',
                  textAlign: 'center'
                }}
                aria-label={`Página ${pagination.currentPage} de ${pagination.totalPages}`}
              >
                {pagination.currentPage} / {pagination.totalPages}
              </span>
              {pagination.hasNext && (
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={pagination.goNext}
                  aria-label="Página siguiente"
                  style={{ minWidth: 'auto', padding: '6px 12px' }}
                >
                  Siguiente
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="primary-button small-button"
            onClick={() => navigate('/habits')}
            style={{ minWidth: 'auto', padding: '6px 12px', fontSize: '12px' }}
          >
            Ver todo
          </button>
        </div>
      </div>

      {sortedHabits.length ? (
        <>
          <ul className="habit-list" style={{ marginBottom: pagination.totalPages > 1 ? '16px' : '0' }}>
            {pagination.currentItems.map((habit) => {
              const habitId = habit.id || habit.title
              
              return (
                <li key={habitId} className="habit-item" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div className="habit-item-label" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <span className="habit-title" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{habit.title}</span>
                    <span style={{ 
                      background: 'var(--color-white-10)', 
                      color: 'var(--text-primary)', 
                      padding: '2px 8px', 
                      borderRadius: '999px', 
                      fontSize: '11px', 
                      fontWeight: 600,
                      fontVariant: 'tabular-nums'
                    }}>
                      {habitTimes[habit.id]?.start_time || '—'}
                    </span>
                    {habit.duration && (
                      <span style={{ color: 'var(--muted-text)', fontSize: '12px' }}>⏱ {habit.duration} min</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="dashboard-empty">No hay hábitos activos por colocar.</p>
      )}
    </section>
  )
}