import { Check, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 3;

function getHabitTitle(entry, habitDefinitions) {
  const habit = habitDefinitions.find(candidate => (
    candidate.id === entry.habit_id || candidate.title === entry.habit_id
  ));
  return habit?.title || 'Hábito eliminado';
}

export function HabitsCard({ entries = [], habitDefinitions = [], definitionsError = '', onComplete }) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingEntryIds, setPendingEntryIds] = useState(() => new Set());
  const pendingEntryIdsRef = useRef(new Set());
  const [completionError, setCompletionError] = useState('');

  const totalPages = Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE));
  const currentPageEntries = useMemo(() => (
    entries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  ), [entries, currentPage]);

  async function completeEntry(entry) {
    if (entry.status === 'completed' || pendingEntryIdsRef.current.has(entry.id)) return;

    const pendingIds = new Set(pendingEntryIdsRef.current).add(entry.id);
    pendingEntryIdsRef.current = pendingIds;
    setPendingEntryIds(pendingIds);
    setCompletionError('');

    try {
      const { error } = await onComplete(entry.id);
      if (error) throw error;
    } catch (error) {
      console.error('Habit occurrence completion failed:', error);
      setCompletionError(error instanceof Error ? error.message : 'No se pudo completar el hábito.');
    } finally {
      const remainingPendingIds = new Set(pendingEntryIdsRef.current);
      remainingPendingIds.delete(entry.id);
      pendingEntryIdsRef.current = remainingPendingIds;
      setPendingEntryIds(remainingPendingIds);
    }
  }

  return (
    <section className="card card-habits" aria-labelledby="habits-title">
      <header className="card-header">
        <Check className="card-icon" aria-hidden="true" />
        <h2 id="habits-title" className="card-title">Hábitos de hoy</h2>
      </header>

      {definitionsError && <p className="dashboard-v2-error" role="alert">{definitionsError}</p>}
      {completionError && <p className="dashboard-v2-error" role="alert">{completionError}</p>}

      {entries.length === 0 ? (
        <div className="habits-empty">
          <p>No tienes hábitos programados para hoy.</p>
          <button className="primary-button" type="button" onClick={() => navigate('/weekly-planner')}>
            <CalendarDays className="btn-icon" aria-hidden="true" />
            Ir al planificador
          </button>
        </div>
      ) : (
        <>
          <ul className="habits-list" role="list">
            {currentPageEntries.map(entry => {
              const isDone = entry.status === 'completed';
              const isPending = pendingEntryIds.has(entry.id);
              const title = getHabitTitle(entry, habitDefinitions);
              return (
                <li key={entry.id} className={`habit-item ${isDone ? 'completed' : ''}`}>
                  <button
                    type="button"
                    className="habit-checkbox"
                    onClick={() => completeEntry(entry)}
                    disabled={isDone || isPending}
                    aria-pressed={isDone}
                    aria-label={isDone ? `${title} completado` : `Completar ${title}`}
                    aria-busy={isPending}
                  >
                    <Check className="check-icon" aria-hidden="true" />
                  </button>
                  <span className={`habit-text ${isDone ? 'completed' : ''}`}>{title}</span>
                  {entry.start_time && (
                    <time className="habit-scheduled-time" dateTime={`${entry.date}T${entry.start_time}`}>
                      {entry.start_time.slice(0, 5)}
                    </time>
                  )}
                </li>
              );
            })}
          </ul>

          {entries.length > ITEMS_PER_PAGE && (
            <div className="habits-pagination">
              <button
                type="button"
                className="page-btn"
                onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                aria-label="Anterior"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <span className="page-indicator" aria-label={`Página ${currentPage} de ${totalPages}`}>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="page-btn"
                onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages}
                aria-label="Siguiente"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
