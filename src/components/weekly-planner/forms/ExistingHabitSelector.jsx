import { useState } from 'react'

// Filtra hábitos activos por nombre y devuelve el seleccionado al modal padre.
export default function ExistingHabitSelector({ habits, onSelect, onClose }) {
  const [search, setSearch] = useState('')

  const filteredHabits = habits
    .filter((habit) => habit.active !== false)
    .filter((habit) =>
      habit.title.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="selector-modal">
      <div className="selector-header">
        <h3>Seleccionar hábito existente</h3>
        <button className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
      </div>

      <div className="selector-search">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar hábito..."
          className="search-input"
        />
      </div>

      <div className="habit-list" role="listbox" aria-label="Hábitos disponibles">
        {filteredHabits.length === 0 ? (
          <p className="empty-state">No hay hábitos disponibles</p>
        ) : (
          <ul className="habit-options" role="listbox">
            {filteredHabits.map((habit) => (
              <li
                key={habit.id || habit.title}
                className="habit-option"
                role="option"
                onClick={() => onSelect(habit)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(habit) }}
              >
                <div className="habit-option-content">
                  <span className="habit-title">{habit.title}</span>
                  <span className="habit-duration">⏱ {habit.duration} min</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}