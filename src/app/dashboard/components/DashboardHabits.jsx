import { useState } from 'react'
import { normalizeHabits } from '../../../lib/habits'
import { useNavigate } from 'react-router-dom'

// Paginación de 3 hábitos por página con controles de navegación y botón "Ver todos"
export default function DashboardHabits({ habits }) {
  const navigate = useNavigate()
  const normalizedHabits = normalizeHabits(habits)
  const habitList = [...normalizedHabits.recommended, ...normalizedHabits.custom]
    .filter((habit) => habit.active)

  const ITEMS_PER_PAGE = 3
  const totalPages = Math.ceil(habitList.length / ITEMS_PER_PAGE)
  const [currentPage, setCurrentPage] = useState(1)

  const currentHabits = habitList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const showPagination = habitList.length > ITEMS_PER_PAGE

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1)
  }

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1)
  }

  const handleViewAll = () => {
    navigate('/habits')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') handlePrev()
    if (e.key === 'ArrowRight') handleNext()
  }

  return (
    <section
      id="dashboard-habits"
      className="dashboard-card dashboard-habits"
      aria-labelledby="dashboard-habits-title"
      style={{ position: 'relative', padding: '24px 20px', paddingBottom: '60px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 id="dashboard-habits-title" className="dashboard-section-title">
          Hábitos iniciales
        </h2>

        {showPagination && (
          <div
            className="dashboard-habits-pagination"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0
            }}
            onKeyDown={handleKeyDown}
            role="navigation"
            aria-label="Paginación de hábitos"
          >
            {currentPage > 1 && (
              <button
                type="button"
                className="secondary-button small-button"
                onClick={handlePrev}
                aria-label="Página anterior"
                style={{ minWidth: 'auto', padding: '6px 12px' }}
              >
                Atrás
              </button>
            )}

            <span
              className="dashboard-habits-page-indicator"
              style={{
                color: 'var(--muted-text)',
                fontSize: '13px',
                fontWeight: 600,
                minWidth: '36px',
                textAlign: 'center'
              }}
              aria-label={`Página ${currentPage} de ${totalPages}`}
            >
              {currentPage} / {totalPages}
            </span>

            {currentPage < totalPages && (
              <button
                type="button"
                className="secondary-button small-button"
                onClick={handleNext}
                aria-label="Página siguiente"
                style={{ minWidth: 'auto', padding: '6px 12px' }}
              >
                Siguiente
              </button>
            )}
          </div>
        )}
      </div>

      {habitList.length ? (
        <ul className="dashboard-habit-list">
          {currentHabits.map((habit) => {
            const text = typeof habit === 'string'
              ? habit
              : habit.title || habit.value || 'Hábito sin nombre'
            const habitId = habit.id || habit.title || text
            return (
              <li className="dashboard-habit" key={habitId}>
                <span className="dashboard-habit-mark" aria-hidden="true" />
                <span>{text}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="dashboard-empty">Todavía no hay hábitos iniciales.</p>
      )}

      <button
        type="button"
        className="primary-button small-button"
        onClick={handleViewAll}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          minWidth: 'auto',
          padding: '8px 14px',
          fontSize: '12px'
        }}
      >
        Ver todos
      </button>
    </section>
  )
}