import { Sparkles, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export function InsightsCard({ tasks, activities }) {
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const totalTasks = tasks?.length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const focusActivities = activities?.filter(a => a.type === 'focus' || a.type === 'completed') || [];
  const totalFocusMinutes = focusActivities.reduce((sum, a) => sum + (a.duration_minutes || a.duration || 0), 0);
  const pendingCount = tasks?.filter(t => t.status !== 'completed').length || 0;

  const insights = [
    { 
      type: 'success', 
      label: 'Completado', 
      value: `${completionRate}%`, 
      icon: CheckCircle,
      color: 'var(--color-success)', 
      bg: 'rgba(34, 197, 94, 0.12)', 
      border: 'var(--color-success)',
      items: [`${completedTasks} de ${totalTasks} tareas`]
    },
    { 
      type: 'info', 
      label: 'Foco total', 
      value: `${Math.round(totalFocusMinutes / 60 * 10) / 10}h`, 
      icon: Clock,
      color: 'var(--color-info)', 
      bg: 'rgba(6, 182, 212, 0.12)', 
      border: 'var(--color-info)',
      items: [`${Math.round(focusActivities.reduce((s, a) => s + (a.duration_minutes || a.duration || 0), 0))} min esta semana`]
    },
    { 
      type: 'warning', 
      label: 'Pendientes', 
      value: `${pendingCount}`, 
      icon: AlertTriangle,
      color: 'var(--color-warning)', 
      bg: 'rgba(249, 115, 22, 0.12)', 
      border: 'var(--color-warning)',
      items: [`${pendingCount} tareas por hacer`]
    },
  ];

  return (
    <section className="card card-insights" aria-labelledby="insights-title">
      <header className="card-header">
        <Sparkles className="card-icon" aria-hidden="true" />
        <h2 id="insights-title" className="card-title">Lo que aprendemos de ti</h2>
      </header>

      <div className="insights-grid" role="list">
        {insights.map((insight, i) => (
          <article key={i} className="insight-block" role="listitem" style={{ '--insight-color': insight.color, '--insight-bg': insight.bg, '--insight-border': insight.border }}>
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
    </section>
  );
}