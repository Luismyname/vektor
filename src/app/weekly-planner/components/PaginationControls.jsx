export default function PaginationControls({ pagination }) {
  return (
    <nav className="weekly-list-pagination" aria-label="Paginación del listado">
      {pagination.hasPrev && (
        <button type="button" onClick={pagination.goPrev} aria-label="Página anterior">
          Atrás
        </button>
      )}
      <span aria-live="polite">
        Página {pagination.currentPage}/{pagination.totalPages}
      </span>
      {pagination.hasNext && (
        <button type="button" onClick={pagination.goNext} aria-label="Página siguiente">
          Siguiente
        </button>
      )}
    </nav>
  )
}
