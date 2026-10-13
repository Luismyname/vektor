import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function DashboardV2Header() {
  return (
    <header className="dashboard-v2-header" role="banner">
      <div className="header-left">
        <Link to="/dashboard-v2" className="logo" aria-label="Vektor Dashboard">
          <div className="logo-mark" aria-hidden="true">
            <ArrowRight className="logo-arrow" />
          </div>
          <span className="logo-text">Vektor</span>
        </Link>
      </div>

      <div className="header-right">
        <div className="user-info">
          <span className="user-greeting">Buenos días,</span>
          <strong className="user-name">Luis Rodríguez</strong>
          <span className="user-streak">Racha de 12 días</span>
        </div>
        <div className="user-avatar" aria-hidden="true">LR</div>
      </div>
    </header>
  );
}