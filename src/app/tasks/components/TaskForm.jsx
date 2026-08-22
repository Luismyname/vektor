import { useState } from 'react'

const initialForm = { title: '', description: '', priority: 'medium', related_value: '' }

export default function TaskForm({ userId, dominantValue, task, onCreate, onUpdate, onCancel, isSubmitting }) {
  const [form, setForm] = useState(task ? { ...initialForm, ...task, related_value: task.related_value || '' } : initialForm)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.title.trim()) return
    const data = {
      title: form.title.trim(),
      description: form.description,
      priority: form.priority,
      related_value: form.related_value || (task ? null : dominantValue || null),
      ...(task ? {} : { user_id: userId }),
    }
    const saved = task ? await onUpdate(task.id, data) : await onCreate(data)
    if (saved) {
      setForm(initialForm)
      onCancel?.()
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form-grid">
        <label>Título<input name="title" value={form.title} onChange={updateField} placeholder="Ej. Preparar la presentación" required /></label>
        <label>Prioridad<select name="priority" value={form.priority} onChange={updateField}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label>
      </div>
      <label>Descripción<textarea name="description" value={form.description} onChange={updateField} placeholder="Añade contexto para tu próximo paso" rows="3" /></label>
      <label>Valor relacionado<select name="related_value" value={form.related_value} onChange={updateField}><option value="">Usar valor dominante</option><option value="salud">Salud</option><option value="crecimiento">Crecimiento</option><option value="conexion">Conexión</option><option value="bienestar">Bienestar emocional</option></select></label>
      <div className="task-form-actions">
        <button className="onboarding-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : task ? 'Guardar cambios' : 'Crear tarea'}</button>
        {task && <button className="task-form-cancel" type="button" onClick={onCancel} disabled={isSubmitting}>Cancelar</button>}
      </div>
    </form>
  )
}