import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RecentActivityItem from './RecentActivityItem'

// Paginación de 3 actividades por página con controles de navegación y botón "Ver todos"
export default function RecentActivityPanel({ activities = [], onHide }) {
  const navigate = useNavigate()

  const ITEMS_PER_PAGE = 3
  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE)
  const [currentPage, setCurrentPage] = useState(1)

  const currentActivities = activities.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const showPagination = activities.length > ITEMS_PER_PAGE

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1)
  }

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1)
  }

  const handleViewAll = () => {
    navigate('/activity')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') handlePrev()
    if (e.key === 'ArrowRight') handleNext()
  }

  return (
    <section
      id="dashboard-activity"
      className="dashboard-card"
      aria-labelledby="dashboard-activity-title"
      style={{ position: 'relative', padding: '24px 20px', paddingBottom: '60px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 id="dashboard-activity-title" className="dashboard-section-title">
          Actividad reciente
        </h2>

        {showPagination && (
          <div
            className="dashboard-activity-pagination"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0
            }}
            onKeyDown={handleKeyDown}
            role="navigation"
            aria-label="Paginación de actividad"
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
              className="dashboard-activity-page-indicator"
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

      {activities.length ? (
        <ul className="activity-list">
          {currentActivities.map((activity) => (
            <RecentActivityItem key={activity.id} activity={activity} onHide={onHide} />
          ))}
        </ul>
      ) : (
        <p className="dashboard-empty">Tu actividad aparecerá aquí cuando empieces.</p>
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