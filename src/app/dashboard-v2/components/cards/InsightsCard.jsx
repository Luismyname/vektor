import { Sparkles, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export function InsightsCard({ tasks, activities }) {
  const taskList = Array.isArray(tasks) ? tasks : [];
  const activityList = Array.isArray(activities) ? activities : [];
  const insights = [];

  if (taskList.length > 0) {
    const completedTasks = taskList.filter(task => task.status === 'completed').length;
    const pendingCount = taskList.filter(task => task.status !== 'completed').length;
    const completionRate = Math.round((completedTasks / taskList.length) * 100);

    insights.push(
      {
        label: 'Completado',
        value: `${completionRate}%`,
        icon: CheckCircle,
        color: 'var(--color-success)',
        bg: 'rgba(34, 197, 94, 0.12)',
        border: 'var(--color-success)',
        items: [`${completedTasks} de ${taskList.length} tareas`],
      },
      {
        label: 'Pendientes',
        value: `${pendingCount}`,
        icon: AlertTriangle,
        color: 'var(--color-warning)',
        bg: 'rgba(249, 115, 22, 0.12)',
        border: 'var(--color-warning)',
        items: [`${pendingCount} tareas por hacer`],
      },
    );
  }

  const recordedMinutes = activityList
    .filter(activity => activity.type === 'completed')
    .reduce((total, activity) => {
      const duration = Number(activity.duration);
      return Number.isFinite(duration) && duration > 0 ? total + duration : total;
    }, 0);

  if (recordedMinutes > 0) {
    insights.push({
      label: 'Tiempo registrado',
      value: `${Math.round(recordedMinutes)} min`,
      icon: Clock,
      color: 'var(--color-info)',
      bg: 'rgba(6, 182, 212, 0.12)',
      border: 'var(--color-info)',
      items: ['En tareas completadas'],
    });
  }

  return (
    <section className="card card-insights" aria-labelledby="insights-title">
      <header className="card-header">
        <Sparkles className="card-icon" aria-hidden="true" />
        <h2 id="insights-title" className="card-title">Lo que aprendemos de ti</h2>
      </header>

      {insights.length > 0 ? (
        <div className="insights-grid" role="list">
          {insights.map(insight => (
            <article key={insight.label} className="insight-block" role="listitem" style={{ '--insight-color': insight.color, '--insight-bg': insight.bg, '--insight-border': insight.border }}>
              <div className="insight-header">
                <insight.icon className="insight-icon" aria-hidden="true" />
                <span className="insight-label">{insight.label}</span>
              </div>
              <span className="insight-value">{insight.value}</span>
              <ul className="insight-items" role="list">
                {insight.items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No hay datos suficientes para generar insights.</p>
        </div>
      )}
    </section>
  );
}