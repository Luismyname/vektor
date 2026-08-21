export default function ActivitySearchBar({ value, onChange }) {
  return (
    <label className="activity-search">
      <span>Buscar</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Título de tarea o fecha exacta"
      />
    </label>
  )
}
