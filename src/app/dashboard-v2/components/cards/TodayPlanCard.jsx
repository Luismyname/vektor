import { Clock, CalendarX } from 'lucide-react';

export function TodayPlanCard({ activeTask, weeklyEntries }) {
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = weeklyEntries
    .filter(e => e.date === today && e.start_time)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (todayEntries.length === 0) {
    return (
      <section className="card card-timeline" aria-labelledby="timeline-title">
        <header className="card-header">
          <Clock className="card-icon" aria-hidden="true" />
          <h2 id="timeline-title" className="card-title">Plan de hoy</h2>
        </header>
        <div className="empty-state">
          <CalendarX className="empty-icon" aria-hidden="true" />
          <p>No hay plan para hoy</p>
          <p className="empty-hint">Añade tareas o hábitos en el planner semanal</p>
        </div>
      </section>
    );
  }

  const timelineItems = todayEntries;

  return (
    <section className="card card-timeline" aria-labelledby="timeline-title">
      <header className="card-header">
        <Clock className="card-icon" aria-hidden="true" />
        <h2 id="timeline-title" className="card-title">Plan de hoy</h2>
      </header>

      <ol className="timeline" role="list">
        {timelineItems.map((item, idx) => {
          const isActive = item.isActive || (activeTask && item.title === activeTask.title);
          return (
            <li key={item.id || idx} className={`timeline-item ${isActive ? 'active' : ''}`}>
              <div className="timeline-marker">
                <span className="timeline-dot" aria-hidden="true" />
                {isActive && <span className="active-ring" aria-hidden="true" />}
              </div>
              <div className="timeline-content">
                <div className="timeline-time">
                  <Clock className="time-icon" aria-hidden="true" />
                  <time>{item.start_time}</time>
                </div>
                <div className="timeline-details">
                  <strong>{item.title}</strong>
                  <span className="duration">{item.duration}</span>
                </div>
                {isActive && <span className="now-badge">Ahora</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}