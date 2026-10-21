import { Clock, CalendarX } from 'lucide-react';
import { formatDate } from '@/services/weekly-planner';

export function TodayPlanCard({ activeTask, tasks, activeHabits, weeklyEntries }) {
  const today = formatDate(new Date());
  const taskList = Array.isArray(tasks) ? tasks : [];
  const habitList = Array.isArray(activeHabits) ? activeHabits : [];
  const todayEntries = (Array.isArray(weeklyEntries) ? weeklyEntries : [])
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
          const task = taskList.find(candidate => candidate.id === item.task_id);
          const habit = habitList.find(candidate => candidate.id === item.habit_id || candidate.title === item.habit_id);
          const title = task?.title || habit?.title;
          const isActive = Boolean(activeTask && item.task_id === activeTask.id);
          const startTime = item.start_time.slice(0, 5);
          const endTime = item.end_time?.slice(0, 5);

          return (
            <li key={item.id || idx} className={`timeline-item ${isActive ? 'active' : ''}`}>
              <div className="timeline-marker">
                <span className="timeline-dot" aria-hidden="true" />
                {isActive && <span className="active-ring" aria-hidden="true" />}
              </div>
              <div className="timeline-content">
                <div className="timeline-time">
                  <Clock className="time-icon" aria-hidden="true" />
                  <time dateTime={`${item.date}T${item.start_time}`}>
                    {startTime}{endTime ? ` – ${endTime}` : ''}
                  </time>
                </div>
                {title && <div className="timeline-details"><strong>{title}</strong></div>}
                {isActive && <span className="now-badge">Ahora</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}