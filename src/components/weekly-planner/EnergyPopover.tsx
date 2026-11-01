import { useState, useEffect, useRef, useCallback, useLayoutEffect, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

interface EnergyPopoverProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (value: number) => void | { error?: unknown } | Promise<void | { error?: unknown }>
  value?: number
  label?: string
  triggerRef?: { current: HTMLElement | null }
  position?: 'auto' | 'top'
  disabled?: boolean
}

/**
 * Popover flotante para captura de energía (1-10)
 * Se renderiza en portal para no afectar layout del planner
 * Se posiciona relativo al elemento trigger
 */
export function EnergyPopover({
  isOpen,
  onClose,
  onSave,
  value = 5,
  label = 'Energía',
  triggerRef,
  position = 'auto',
  disabled = false,
}: EnergyPopoverProps) {
  const [localValue, setLocalValue] = useState(value ?? 5)
  const popoverRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLInputElement>(null)
  const [positionStyles, setPositionStyles] = useState<CSSProperties>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleClickOutside = useCallback((e: globalThis.PointerEvent) => {
    const target = e.target as Node
    if (popoverRef.current?.contains(target)) return
    if (triggerRef?.current?.contains(target)) return
    onClose()
  }, [onClose, triggerRef])

  useEffect(() => {
    if (!isOpen) return undefined
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [isOpen, handleClickOutside])

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const positionPopover = useCallback(() => {
    if (!isOpen || !popoverRef.current) return
    const rect = popoverRef.current.getBoundingClientRect()
    const triggerRect = triggerRef?.current?.getBoundingClientRect()
    const gap = 8
    let top = triggerRect ? triggerRect.bottom + gap : (window.innerHeight - rect.height) / 2
    let left = triggerRect
      ? triggerRect.left + (triggerRect.width - rect.width) / 2
      : (window.innerWidth - rect.width) / 2

    if (triggerRect && (position === 'top' || top + rect.height > window.innerHeight - gap)) {
      top = triggerRect.top - rect.height - gap
    }
    if (triggerRect && top < gap) top = triggerRect.bottom + gap
    top = Math.max(gap, Math.min(top, window.innerHeight - rect.height - gap))
    left = Math.max(gap, Math.min(left, window.innerWidth - rect.width - gap))
    setPositionStyles({ top: `${top}px`, left: `${left}px` })
  }, [isOpen, position, triggerRef])

  useLayoutEffect(() => {
    if (!isOpen) return undefined
    sliderRef.current?.focus()
    positionPopover()
    window.addEventListener('resize', positionPopover)
    return () => window.removeEventListener('resize', positionPopover)
  }, [isOpen, positionPopover])

  const handleSelect = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const result = await onSave?.(localValue) as { error?: unknown } | undefined
      if (result?.error) throw result.error
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar la energía.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const popoverContent = (
    <div
      ref={popoverRef}
      className="energy-popover"
      style={positionStyles}
      role="dialog"
      aria-label={`Seleccionar ${label}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="energy-popover__header">
        <span className="energy-popover__label">{label}</span>
        <button
          type="button"
          className="energy-popover__close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="energy-popover__slider">
        <input
          type="range"
          ref={sliderRef}
          min="1"
          max="10"
          value={localValue}
          aria-label="Nivel de energía"
          onChange={(e) => setLocalValue(Number(e.target.value))}
          className="energy-popover__slider"
          disabled={disabled}
        />
        <div className="energy-popover__labels">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <span key={n} className={localValue === n ? 'active' : ''}>{n}</span>
          ))}
        </div>
        <output className="energy-popover__value">{localValue}/10</output>
      </div>

      {saveError && <p className="energy-popover__error" role="alert">{saveError}</p>}

      <button
        type="button"
        className="energy-popover__save"
        onClick={handleSelect}
        disabled={disabled || saving}
      >
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  )

  return createPortal(popoverContent, document.body)
}