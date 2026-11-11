import { useState, useEffect, useRef, useCallback, useLayoutEffect, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Zap } from 'lucide-react'

interface EnergyPopoverProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (value: number) => void | { error?: unknown } | Promise<void | { error?: unknown }>
  value?: number | null
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
  value,
  label = 'Energía',
  triggerRef,
  position = 'auto',
  disabled = false,
}: EnergyPopoverProps) {
  const [localValue, setLocalValue] = useState<number | null>(value ?? null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const levelRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [positionStyles, setPositionStyles] = useState<CSSProperties>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [hoverValue, setHoverValue] = useState<number | null>(null)

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

  useEffect(() => {
    if (!isOpen) return
    setLocalValue(value ?? null)
    setHoverValue(null)
    setSaveError('')
  }, [isOpen, value])

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
    levelRefs.current[(localValue ?? 1) - 1]?.focus()
    positionPopover()
    window.addEventListener('resize', positionPopover)
    return () => window.removeEventListener('resize', positionPopover)
  }, [isOpen, localValue, positionPopover])

  const handleSelect = async () => {
    if (localValue === null) return
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

  const handleLevelKeyDown = (event: KeyboardEvent<HTMLButtonElement>, level: number) => {
    let nextLevel: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') nextLevel = Math.min(level + 1, 10)
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') nextLevel = Math.max(level - 1, 1)
    if (event.key === 'Home') nextLevel = 1
    if (event.key === 'End') nextLevel = 10
    if (nextLevel === null) return
    event.preventDefault()
    setLocalValue(nextLevel)
    levelRefs.current[nextLevel - 1]?.focus()
  }

  if (!isOpen) return null

  const previewValue = hoverValue ?? localValue ?? 0
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

      <div
        className="energy-popover__scale"
        role="radiogroup"
        aria-label="Nivel de energía"
        onPointerLeave={() => setHoverValue(null)}
      >
        <div className="energy-popover__rays">
          {Array.from({ length: 10 }, (_, index) => {
            const level = index + 1
            const isSelected = localValue === level
            return (
              <button
                key={level}
                ref={(node) => { levelRefs.current[index] = node }}
                type="button"
                role="radio"
                aria-label={`Energía ${level} de 10`}
                aria-checked={isSelected}
                tabIndex={localValue === null ? (level === 1 ? 0 : -1) : isSelected ? 0 : -1}
                className={`energy-popover__ray${level <= previewValue ? ' is-lit' : ''}${isSelected ? ' is-selected' : ''}`}
                onPointerEnter={() => setHoverValue(level)}
                onFocus={() => setHoverValue(null)}
                onClick={() => setLocalValue(level)}
                onKeyDown={(event) => handleLevelKeyDown(event, level)}
                disabled={disabled}
              >
                <Zap size={20} strokeWidth={2} aria-hidden="true" />
              </button>
            )
          })}
        </div>
        <div className="energy-popover__range-labels" aria-hidden="true">
          <span>1</span>
          <span>10</span>
        </div>
      </div>
      <output className="energy-popover__value" aria-live="polite">
        {localValue === null ? 'Selecciona energía' : `Energía: ${localValue} / 10`}
      </output>

      {saveError && <p className="energy-popover__error" role="alert">{saveError}</p>}

      <button
        type="button"
        className="energy-popover__save"
        onClick={handleSelect}
        disabled={disabled || saving || localValue === null}
      >
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  )

  return createPortal(popoverContent, document.body)
}