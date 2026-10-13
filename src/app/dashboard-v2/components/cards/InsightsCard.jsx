import { Sparkles } from 'lucide-react';

const INSIGHTS = [
  { type: 'success', label: 'Fácil para ti', items: ['Gym', 'Caminar'], color: 'var(--color-success)', bg: 'rgba(34, 197, 94, 0.12)', border: 'var(--color-success)' },
  { type: 'warning', label: 'Requiere atención', items: ['Estudiar', 'Inglés'], color: 'var(--color-warning)', bg: 'rgba(249, 115, 22, 0.12)', border: 'var(--color-warning)' },
  { type: 'info', label: 'Creatividad alta', items: ['Generar ideas', 'Planificación'], color: 'var(--color-info)', bg: 'rgba(6, 182, 212, 0.12)', border: 'var(--color-info)' },
];

export function InsightsCard() {
  return (
    <section className="card card-insights" aria-labelledby="insights-title">
      <header className="card-header">
        <Sparkles className="card-icon" aria-hidden="true" />
        <h2 id="insights-title" className="card-title">Lo que aprendemos de ti</h2>
      </header>

      <div className="insights-grid" role="list">
        {INSIGHTS.map((insight, i) => (
          <article key={i} className="insight-block" role="listitem" style={{ '--insight-color': insight.color, '--insight-bg': insight.bg, '--insight-border': insight.border }}>
            <span className="insight-label">{insight.label}</span>
            <ul className="insight-items" role="list">
              {insight.items.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}