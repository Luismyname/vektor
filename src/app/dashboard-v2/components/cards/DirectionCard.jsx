import { Target, Sprout, HeartPulse } from 'lucide-react';

export function DirectionCard({ profile }) {
  return (
    <section className="card card-direction" aria-labelledby="direction-title">
      <header className="card-header">
        <Target className="card-icon" aria-hidden="true" />
        <h2 id="direction-title" className="card-title">Mi dirección</h2>
      </header>

      <div className="value-block">
        <div className="value-icon-wrapper">
          <Sprout className="value-icon" aria-hidden="true" />
        </div>
        <div className="value-content">
          <span className="value-label">VALOR DOMINANTE</span>
          <span className="value-text">{profile?.dominant_value || 'Sin definir'}</span>
        </div>
      </div>

      <div className="value-divider" />

      <div className="value-block secondary">
        <div className="value-icon-wrapper secondary">
          <HeartPulse className="value-icon" aria-hidden="true" />
        </div>
        <div className="value-content">
          <span className="value-label">Valor secundario</span>
          <span className="value-text">{profile?.secondary_value || 'Sin definir'}</span>
        </div>
      </div>
    </section>
  );
}