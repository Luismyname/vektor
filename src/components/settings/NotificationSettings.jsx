import { useNotifications } from '../../hooks/useNotifications'
import { NOTIFICATION_TYPES, DEFAULT_NOTIFICATION_CONFIG } from '../../services/notifications'

const TYPE_LABELS = {
  [NOTIFICATION_TYPES.ENERGY_CHECKIN]: { label: 'Check-in energía matutino', icon: '⚡', desc: 'Registra tu nivel de energía cada mañana' },
  [NOTIFICATION_TYPES.DEEP_WORK_START]: { label: 'Inicio Deep Work', icon: '🧠', desc: 'Aviso 5 min antes de tus bloques creativos' },
  [NOTIFICATION_TYPES.HABIT_REMINDER]: { label: 'Recordatorio hábitos', icon: '🌱', desc: 'Aviso 10 min antes de cada hábito programado' },
  [NOTIFICATION_TYPES.WEEKLY_REVIEW]: { label: 'Revisión semanal', icon: '📊', desc: 'Domingo tarde: completa tu review semanal' },
  [NOTIFICATION_TYPES.FOCUS_SESSION_END]: { label: 'Fin sesión de enfoque', icon: '✅', desc: 'Pide quality score al terminar Pomodoro' },
}

const TYPE_ORDER = [
  NOTIFICATION_TYPES.ENERGY_CHECKIN,
  NOTIFICATION_TYPES.DEEP_WORK_START,
  NOTIFICATION_TYPES.HABIT_REMINDER,
  NOTIFICATION_TYPES.WEEKLY_REVIEW,
  NOTIFICATION_TYPES.FOCUS_SESSION_END,
]

export default function NotificationSettings({ user }) {
  const { permission, config, loading, askPermission, toggleEnabled, updateTime, updateDays, updateConfig } = useNotifications(user?.id)

  if (loading) return <div className="settings-loading">Cargando notificaciones...</div>

  return (
    <div className="notification-settings">
      <div className="settings-section">
        <h3>Notificaciones</h3>
        <p className="section-desc">Configura qué recordatorios quieres recibir y cuándo</p>

        {/* Permission status */}
        <div className="permission-banner">
          <span className={`permission-badge ${permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'default'}`}>
            {permission === 'granted' ? '✅ Activadas' : permission === 'denied' ? '🚫 Bloqueadas' : '❓ Pendientes'}
          </span>
          {permission !== 'granted' && (
            <button className="btn-primary btn-sm" onClick={askPermission}>
              {permission === 'denied' ? 'Abrir configuración del navegador' : 'Permitir notificaciones'}
            </button>
          )}
        </div>

        {/* Notification types */}
        <div className="notification-types">
          {TYPE_ORDER.map(type => {
            const meta = TYPE_LABELS[type]
            const cfg = config[type] || DEFAULT_NOTIFICATION_CONFIG[type]
            return (
              <div key={type} className="notification-type-card">
                <div className="type-header">
                  <div className="type-icon">{meta.icon}</div>
                  <div className="type-info">
                    <h4>{meta.label}</h4>
                    <p>{meta.desc}</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={() => toggleEnabled(type)}
                      disabled={permission !== 'granted'}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {cfg.enabled && permission === 'granted' && (
                  <div className="type-config">
                    {type === NOTIFICATION_TYPES.ENERGY_CHECKIN && (
                      <div className="config-row">
                        <label>Hora:</label>
                        <input
                          type="time"
                          value={cfg.time}
                          onChange={e => updateTime(type, e.target.value)}
                        />
                        <div className="days-selector">
                          <label>Días:</label>
                          <div className="day-toggles">
                            {[0,1,2,3,4,5,6].map(d => (
                              <label key={d} className="day-toggle">
                                <input
                                  type="checkbox"
                                  checked={cfg.days?.includes(d)}
                                  onChange={() => {
                                    const next = cfg.days?.includes(d)
                                      ? cfg.days.filter(x => x !== d)
                                      : [...(cfg.days || []), d]
                                    updateDays(type, next)
                                  }}
                                />
                                <span>{['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {type === NOTIFICATION_TYPES.WEEKLY_REVIEW && (
                      <div className="config-row">
                        <label>Día:</label>
                        <select value={cfg.day} onChange={e => updateConfig(type, { day: Number(e.target.value) })}>
                          {['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((d, i) => (
                            <option key={i} value={i}>{d}</option>
                          ))}
                        </select>
                        <label>Hora:</label>
                        <input type="time" value={cfg.time} onChange={e => updateTime(type, e.target.value)} />
                      </div>
                    )}

                    {type === NOTIFICATION_TYPES.DEEP_WORK_START && (
                      <div className="config-row">
                        <label>Minutos antes:</label>
                        <select value={cfg.beforeMinutes} onChange={e => updateConfig(type, { beforeMinutes: Number(e.target.value) })}>
                          <option value={5}>5 min</option>
                          <option value={10}>10 min</option>
                          <option value={15}>15 min</option>
                        </select>
                      </div>
                    )}

                    {type === NOTIFICATION_TYPES.HABIT_REMINDER && (
                      <div className="config-row">
                        <label>Minutos antes:</label>
                        <select value={cfg.beforeMinutes} onChange={e => updateConfig(type, { beforeMinutes: Number(e.target.value) })}>
                          <option value={5}>5 min</option>
                          <option value={10}>10 min</option>
                          <option value={15}>15 min</option>
                          <option value={30}>30 min</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Test notification */}
        {permission === 'granted' && (
          <div className="test-notification">
            <button className="btn-secondary" onClick={() => {
              new Notification('🧪 Test Vektor', {
                body: 'Las notificaciones funcionan correctamente',
                icon: '/vite.svg',
              })
            }}>
              Enviar notificación de prueba
            </button>
          </div>
        )}
      </div>
    </div>
  )
}