export default function ActivityFilters({ filters, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value })
  }

  return (
    <div className="activity-filters">
      <label>
        <span>Día</span>
        <input
          type="number"
          min="1"
          max="31"
          value={filters.day || ''}
          onChange={(event) => handleChange('day', event.target.value)}
          placeholder="01"
        />
      </label>

      <label>
        <span>Mes</span>
        <input
          type="number"
          min="1"
          max="12"
          value={filters.month || ''}
          onChange={(event) => handleChange('month', event.target.value)}
          placeholder="01"
        />
      </label>

      <label>
        <span>Año</span>
        <input
          type="number"
          min="2024"
          max="2100"
          value={filters.year || ''}
          onChange={(event) => handleChange('year', event.target.value)}
          placeholder="2026"
        />
      </label>

      <label>
        <span>Tipo</span>
        <select value={filters.type || 'all'} onChange={(event) => handleChange('type', event.target.value)}>
          <option value="all">Todos</option>
          <option value="pending">Tareas pendientes</option>
          <option value="in_progress">Tareas en curso</option>
          <option value="completed">Tareas finalizadas</option>
        </select>
      </label>
    </div>
  )
}
