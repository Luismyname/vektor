import { useMemo } from 'react'

/**
 * Mapa de calor de energía semanal: 7 días × 19 horas (5-23h)
 * Verde = energía alta, Rojo = energía baja, Gris = sin datos
 */
export default function EnergyHeatmap({ energyByDayHour, peakHours, onHourClick }) {
  const hours = useMemo(() => Array.from({ length: 19 }, (_, i) => i + 5), []) // 5-23
  const dayLabels = useMemo(() => ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], [])

  // Get sorted dates (Mon-Sun)
  const dates = useMemo(() => Object.keys(energyByDayHour).sort(), [energyByDayHour])

  // Energy color scale
  const getEnergyColor = (energy) => {
    if (energy === null || energy === undefined) return 'var(--color-border-light)'
    if (energy >= 8) return '#22c55e'      // green-500
    if (energy >= 6) return '#84cc16'      // lime-500
    if (energy >= 4) return '#eab308'      // yellow-500
    if (energy >= 2) return '#f97316'      // orange-500
    return '#ef4444'                       // red-500
  }

  const isPeakHour = (date, hour) => {
    if (!peakHours) return false
    const allPeak = [...(peakHours.morning || []), ...(peakHours.afternoon || []), ...(peakHours.evening || [])]
    return allPeak.includes(hour)
  }

  const isToday = (date) => {
    const today = new Date().toISOString().split('T')[0]
    return date === today
  }

  return (
    <div className="energy-heatmap-panel">
      <div className="heatmap-header">
        <h3>Mapa de Energía Semanal</h3>
        <p className="heatmap-subtitle">
          {peakHours && (peakHours.morning?.length || peakHours.afternoon?.length || peakHours.evening?.length) > 0 && (
            <>
              Horas pico: {' '}
              {peakHours.morning?.map(h => `${h}:00`).join(', ')}
              {peakHours.afternoon?.map(h => `${h}:00`).join(', ')}
              {peakHours.evening?.map(h => `${h}:00`).join(', ')}
            </>
          )}
        </p>
      </div>

      <div className="heatmap-legend">
        <span>Baja</span>
        <div className="legend-gradient">
          <div className="legend-stop" style={{ background: '#ef4444' }} />
          <div className="legend-stop" style={{ background: '#f97316' }} />
          <div className="legend-stop" style={{ background: '#eab308' }} />
          <div className="legend-stop" style={{ background: '#84cc16' }} />
          <div className="legend-stop" style={{ background: '#22c55e' }} />
        </div>
        <span>Alta</span>
      </div>

      <div className="heatmap-grid" role="grid" aria-label="Mapa de calor de energía semanal">
        {/* Hour labels (left axis) */}
        <div className="heatmap-axis heatmap-axis-hours" aria-hidden="true">
          {hours.map(h => (
            <div key={h} className="heatmap-hour-label" style={{ '--hour-index': h - 5 }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="heatmap-days" role="rowgroup">
          {dates.map((date, dayIndex) => (
            <div
              key={date}
              className={`heatmap-day-column ${isToday(date) ? 'today' : ''}`}
              role="row"
              aria-label={new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
            >
              <div className="heatmap-day-header" style={{ '--day-index': dayIndex }}>
                <span className="day-label">{dayLabels[dayIndex]}</span>
                <span className="day-date">{new Date(date).getDate()}</span>
              </div>
              <div className="heatmap-cells" role="row">
                {hours.map(hour => {
                  const energy = energyByDayHour[date]?.[hour]
                  const peak = isPeakHour(date, hour)
                  return (
                    <button
                      key={hour}
                      className={`heatmap-cell ${peak ? 'peak-hour' : ''} ${energy === null ? 'no-data' : ''}`}
                      style={{ '--energy-color': getEnergyColor(energy) }}
                      onClick={() => onHourClick?.(date, hour, energy)}
                      aria-label={`${dayLabels[dayIndex]} ${String(hour).padStart(2, '0')}:00 - Energía: ${energy !== null ? energy + '/10' : 'sin datos'}${peak ? ' (hora pico)' : ''}`}
                      role="gridcell"
                      tabIndex={0}
                    >
                      {energy !== null && (
                        <span className="energy-value" aria-hidden="true">{energy}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .energy-heatmap-panel {
          background: var(--bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 20px;
        }
        .heatmap-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          gap: 16px;
        }
        .heatmap-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .heatmap-subtitle {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--muted-text);
          max-width: 400px;
        }
        .heatmap-legend {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          font-size: 11px;
          color: var(--muted-text);
        }
        .legend-gradient {
          display: flex;
          flex: 1;
          height: 6px;
          border-radius: 3px;
          overflow: hidden;
        }
        .legend-stop {
          flex: 1;
        }
        .heatmap-grid {
          display: grid;
          grid-template-columns: 50px repeat(7, 1fr);
          gap: 2px;
        }
        .heatmap-axis-hours {
          display: grid;
          grid-template-rows: repeat(19, 1fr);
          gap: 2px;
        }
        .heatmap-hour-label {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          font-size: 10px;
          color: var(--muted-text);
          height: 28px;
        }
        .heatmap-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .heatmap-day-column {
          display: grid;
          grid-template-rows: 32px repeat(19, 28px);
          gap: 2px;
        }
        .heatmap-day-column.today .heatmap-day-header {
          background: var(--color-accent-light);
          color: var(--accent);
        }
        .heatmap-day-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          background: var(--bg-main);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .day-label { text-transform: capitalize; }
        .day-date { font-size: 10px; color: var(--muted-text); font-weight: 400; }
        .heatmap-cells {
          display: grid;
          grid-template-rows: repeat(19, 28px);
          gap: 2px;
        }
        .heatmap-cell {
          position: relative;
          border: none;
          background: var(--color-border-light);
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .heatmap-cell:hover {
          transform: scale(1.1);
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .heatmap-cell:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -2px;
        }
        .heatmap-cell.peak-hour {
          box-shadow: inset 0 0 0 1px var(--accent);
        }
        .heatmap-cell.peak-hour::before {
          content: '';
          position: absolute;
          top: 2px;
          right: 2px;
          width: 4px;
          height: 4px;
          background: var(--accent);
          border-radius: 50%;
          opacity: 0.8;
        }
        .heatmap-cell.no-data {
          background: repeating-linear-gradient(45deg, var(--color-border-light), var(--color-border-light) 4px, transparent 4px, transparent 8px);
          cursor: default;
        }
        .heatmap-cell:not(.no-data) {
          background: var(--energy-color, var(--color-border-light));
        }
        .energy-value {
          font-size: 11px;
          font-weight: 600;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.4);
          mix-blend-mode: difference;
        }
        @media (max-width: 768px) {
          .heatmap-grid {
            grid-template-columns: 40px repeat(7, 1fr);
          }
          .heatmap-hour-label {
            font-size: 9px;
            padding-right: 4px;
          }
          .heatmap-cell { height: 24px; }
          .energy-value { font-size: 10px; }
        }
      `}</style>
    </div>
  )
}