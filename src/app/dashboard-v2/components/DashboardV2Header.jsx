import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

function getDisplayName(user, profile) {
  const candidates = [
    profile?.full_name,
    user?.user_metadata?.full_name,
    user?.user_metadata?.first_name,
  ];

  return candidates.find(name => typeof name === 'string' && name.trim())?.trim() || 'Usuario';
}

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardV2Header({ user, profile }) {
  const displayName = getDisplayName(user, profile);
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : nameParts[0].slice(0, 2);

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
          <span className="user-greeting">{getGreeting()},</span>
          <strong className="user-name">{displayName}</strong>
          <span className="user-streak">Racha no disponible</span>
        </div>
        <div className="user-avatar" aria-hidden="true">{initials}</div>
      </div>
    </header>
  );
}