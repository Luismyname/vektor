import { useState } from 'react'

// Formulario de reflexión con borrador local y guardado delegado al hook.
export default function WeeklyReview({ questions, review, onSave, saving, saved }) {
  const [draft, setDraft] = useState(review)
  return (
    <section className="weekly-review" aria-labelledby="weekly-review-title">
      <div><h2 id="weekly-review-title"><span aria-hidden="true">📝</span> Cierre de semana</h2></div>
      <div className="weekly-review-grid">
        {questions.map(([key, question]) => <label key={key}>{question}<textarea rows="3" value={draft[key] || ''} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} placeholder="Escribe una nota breve..." /></label>)}
      </div>
      <div className="weekly-review-actions"><button type="button" className="primary-button" onClick={() => onSave(draft)} disabled={saving}>{saving ? 'Guardando...' : 'Guardar reflexión'}</button>{saved && <span role="status">Reflexión guardada.</span>}</div>
    </section>
  )
}