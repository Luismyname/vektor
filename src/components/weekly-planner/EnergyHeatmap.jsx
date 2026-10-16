import { useMemo } from 'react'

/**
 * Representación horizontal de los niveles de energía por día y hora.
 */
export default function EnergyHeatmap({ energyByDayHour, peakHours, onHourClick }) {
  const hours = useMemo(() => Array.from({ length: 19 }, (_, i) => i + 5), []) // 5-23
  const dayLabels = useMemo(() => ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], [])

  // Get sorted dates (Mon-Sun)
  const dates = useMemo(() => Object.keys(energyByDayHour).sort(), [energyByDayHour])

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
        <h3>Energía de la semana</h3>
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

      <div className="heatmap-grid" role="grid" aria-label="Energía por día y hora">
        {dates.map((date, dayIndex) => (
          <div
            key={date}
            className={`heatmap-day-row ${isToday(date) ? 'today' : ''}`}
            role="row"
            aria-label={new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
          >
            <span className="day-label">{dayLabels[dayIndex]}</span>
            <div className="heatmap-cells" role="group" aria-label={`Energía de ${dayLabels[dayIndex]}, de 05:00 a 23:00`}>
              {hours.map(hour => {
                const energy = energyByDayHour[date]?.[hour]
                const peak = isPeakHour(date, hour)
                return (
                  <button
                    key={hour}
                    className={`heatmap-cell ${peak ? 'peak-hour' : ''} ${energy === null || energy === undefined ? 'no-data' : ''}`}
                    style={{ '--energy-level': energy === null || energy === undefined ? 0 : Math.max(0.18, energy / 10) }}
                    onClick={() => onHourClick?.(date, hour, energy)}
                    aria-label={`${dayLabels[dayIndex]} ${String(hour).padStart(2, '0')}:00 - Energía: ${energy !== null && energy !== undefined ? energy + '/10' : 'sin datos'}${peak ? ' (hora pico)' : ''}`}
                    title={`${dayLabels[dayIndex]} ${String(hour).padStart(2, '0')}:00 · ${energy !== null && energy !== undefined ? `${energy}/10` : 'Sin datos'}${peak ? ' · Hora pico' : ''}`}
                    role="gridcell"
                    tabIndex={0}
                  />
                )
              })}
            </div>
            <span className="day-date">{new Date(date).getDate()}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .energy-heatmap-panel {
          min-width: 0;
        }
        .heatmap-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          margin-bottom: 12px;
        }
        .heatmap-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .heatmap-subtitle {
          margin: 0;
          font-size: 11px;
          color: var(--muted-text);
          line-height: 1.4;
        }
        .heatmap-grid {
          display: grid;
          gap: 7px;
        }
        .heatmap-day-row {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr) 18px;
          align-items: center;
          gap: 7px;
          min-width: 0;
          color: var(--muted-text);
          font-size: 11px;
        }
        .heatmap-day-row.today .day-label {
          color: var(--accent);
          font-weight: 600;
        }
        .day-label { text-transform: capitalize; }
        .day-date { text-align: right; font-variant-numeric: tabular-nums; }
        .heatmap-cells {
          display: flex;
          align-items: center;
          gap: 2px;
          min-width: 0;
        }
        .heatmap-cell {
          flex: 1 1 0;
          min-width: 0;
          height: 10px;
          padding: 0;
          border: 0;
          border-radius: 3px;
          background: var(--accent);
          opacity: var(--energy-level);
          cursor: pointer;
          transition: opacity 0.15s ease, height 0.15s ease;
        }
        .heatmap-cell:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .heatmap-cell.peak-hour {
          height: 14px;
        }
        .heatmap-cell.no-data {
          background: var(--color-border-light);
          opacity: 1;
          cursor: default;
        }
        @media (max-width: 768px) {
          .heatmap-day-row {
            grid-template-columns: 28px minmax(0, 1fr) 16px;
            gap: 5px;
          }
          .heatmap-cell { height: 12px; }
          .heatmap-cell.peak-hour { height: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .heatmap-cell { transition: none; }
        }
      `}</style>
    </div>
  )
}