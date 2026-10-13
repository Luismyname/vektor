import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export function HabitsCard({ habits }) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 3;
  const totalPages = Math.ceil(habits.length / ITEMS_PER_PAGE);
  const [completedHabits, setCompletedHabits] = useState(new Set());

  const currentHabits = useMemo(() =>
    habits.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [habits, currentPage]
  );

  const toggleHabit = (habit) => {
    setCompletedHabits(prev => {
      const next = new Set(prev);
      if (next.has(habit.id)) next.delete(habit.id);
      else next.add(habit.id);
      return next;
    });
  };

  const goNext = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const goPrev = () => setCurrentPage(p => Math.max(p - 1, 1));
  const totalPagesCalc = Math.ceil(habits.length / 3);

  return (
    <section className="card card-habits" aria-labelledby="habits-title">
      <header className="card-header">
        <Check className="card-icon" aria-hidden="true" />
        <h2 id="habits-title" className="card-title">Hábitos</h2>
      </header>

      <ul className="habits-list" role="list">
        {currentHabits.map(habit => {
          const isDone = completedHabits.has(habit.id);
          return (
            <li key={habit.id} className={`habit-item ${isDone ? 'completed' : ''}`}>
              <button
                className="habit-checkbox"
                onClick={() => toggleHabit(habit)}
                aria-pressed={isDone}
                aria-label={isDone ? `Desmarcar ${habit.title}` : `Marcar ${habit.title}`}
              >
                <Check className="check-icon" aria-hidden="true" />
              </button>
              <span className={`habit-text ${isDone ? 'completed' : ''}`}>{habit.title}</span>
            </li>
          );
        })}
      </ul>

      {habits.length > 3 && (
        <div className="habits-pagination">
          <button className="page-btn" onClick={goPrev} disabled={currentPage === 1} aria-label="Anterior">
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="page-indicator" aria-label={`Página ${currentPage} de ${totalPagesCalc}`}>
            {currentPage} / {totalPagesCalc}
          </span>
          <button className="page-btn" onClick={goNext} disabled={currentPage === totalPagesCalc} aria-label="Siguiente">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}

      <button className="view-all-btn" onClick={() => navigate('/habits')}>
        Ver todos
      </button>
    </section>
  );
}