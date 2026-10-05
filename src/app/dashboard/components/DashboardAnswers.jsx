import { useMemo } from 'react'
import { questions } from '../../survey/questions'

// Presenta respuestas de onboarding y permite ocultarlas o volver a mostrarlas.
export default function DashboardAnswers({ profile, hiddenAnswers, onHide, onShow }) {
  const answers = useMemo(() => questions.map(([question], index) => ({
    key: String(index + 1),
    question,
    answer: profile?.answers?.[index + 1] ?? 'Sin respuesta',
  })), [profile])

  return (
    <section className="dashboard-card dashboard-answers" aria-labelledby="dashboard-answers-title">
      <h2 id="dashboard-answers-title" className="dashboard-section-title">Tus respuestas</h2>
      {answers.length ? (
        <dl className="dashboard-answer-list">
          {answers.map(({ key, question, answer }) => {
            const isHidden = hiddenAnswers[key] === true
            return (
              <div className={`dashboard-answer${isHidden ? ' dashboard-answer-hidden' : ''}`} key={key}>
                <dt>{question}</dt>
                <dd>{isHidden ? 'Respuesta oculta' : String(answer)}</dd>
                <button
                  className="dashboard-answer-hide"
                  type="button"
                  onClick={() => isHidden ? onShow(key) : onHide(key)}
                >
                  {isHidden ? 'Mostrar' : 'Ocultar'}
                </button>
              </div>
            )
          })}
        </dl>
      ) : (
        <p className="dashboard-empty">No hay respuestas disponibles.</p>
      )}
    </section>
  )
}
