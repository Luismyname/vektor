import { useState } from 'react'

const initialForm = { title: '', description: '', priority: 'medium', related_value: '' }

export default function TaskForm({ userId, dominantValue, onCreate, isSubmitting }) {
  const [form, setForm] = useState(initialForm)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.title.trim()) return
    const created = await onCreate({ ...form, title: form.title.trim(), user_id: userId, related_value: form.related_value || dominantValue || null })
    if (created) setForm(initialForm)
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form-grid">
        <label>Título<input name="title" value={form.title} onChange={updateField} placeholder="Ej. Preparar la presentación" required /></label>
        <label>Prioridad<select name="priority" value={form.priority} onChange={updateField}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label>
      </div>
      <label>Descripción<textarea name="description" value={form.description} onChange={updateField} placeholder="Añade contexto para tu próximo paso" rows="3" /></label>
      <label>Valor relacionado<select name="related_value" value={form.related_value} onChange={updateField}><option value="">Usar valor dominante</option><option value="salud">Salud</option><option value="crecimiento">Crecimiento</option><option value="conexion">Conexión</option><option value="bienestar">Bienestar emocional</option></select></label>
      <button className="onboarding-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando...' : 'Crear tarea'}</button>
    </form>
  )
}