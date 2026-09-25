import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function WeeklyBlockModal({ title, description, start, end, status, statusLabel, onClose, children }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <>
      <div className="weekly-modal-overlay" onClick={onClose} />
      <section className="weekly-modal" role="dialog" aria-modal="true" aria-labelledby="weekly-modal-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="weekly-modal-close" onClick={onClose}>Cerrar</button>
        <h3 id="weekly-modal-title">{title}</h3>
        {description && <p className="weekly-modal-description">{description}</p>}
        <span>{start} - {end}</span>
        <span>Estado: {statusLabel || status}</span>
        {children}
      </section>
    </>,
    document.body,
  )
}