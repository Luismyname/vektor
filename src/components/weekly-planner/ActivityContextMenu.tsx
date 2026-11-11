import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { RefObject } from 'react'

interface ActivityContextMenuProps {
  open: boolean
  label: string
  anchorRef: RefObject<HTMLElement | null>
  showStartAction?: boolean
  completeLabel?: string
  onClose: () => void
  onStart?: () => void
  onComplete: () => void
  onEnergy: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function ActivityContextMenu({
  open,
  label,
  anchorRef,
  showStartAction = false,
  completeLabel = 'Marcar como completada',
  onClose,
  onStart,
  onComplete,
  onEnergy,
  onEdit,
  onDelete,
}: ActivityContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const positionMenu = useCallback(() => {
    const anchor = anchorRef.current
    const menu = menuRef.current
    if (!open || !anchor || !menu) return
    const anchorRect = anchor.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const gap = 6
    let top = anchorRect.bottom + gap
    if (top + menuRect.height > window.innerHeight - gap) {
      top = anchorRect.top - menuRect.height - gap
    }
    top = Math.max(gap, Math.min(top, window.innerHeight - menuRect.height - gap))
    const left = Math.max(
      gap,
      Math.min(anchorRect.left, window.innerWidth - menuRect.width - gap),
    )
    setPosition({ top: Math.max(gap, top), left })
  }, [anchorRef, open])

  const handlePointerDown = useCallback((event: globalThis.PointerEvent) => {
    const target = event.target as Node
    if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return
    onClose()
  }, [anchorRef, onClose])

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') || [])
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex: number | null = null
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % buttons.length
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = buttons.length - 1
    if (nextIndex === null || !buttons.length) return
    event.preventDefault()
    buttons[nextIndex]?.focus()
  }

  useEffect(() => {
    if (!open) return undefined
    document.addEventListener('pointerdown', handlePointerDown)
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        anchorRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [anchorRef, handlePointerDown, onClose, open, positionMenu])

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    positionMenu()
    firstItemRef.current?.focus()
  }, [open, positionMenu])

  if (!open) return null

  const actions = [
    ...(showStartAction && onStart
      ? [{ label: 'Marcar como en curso', onSelect: onStart }]
      : []),
    { label: completeLabel, onSelect: onComplete },
    { label: '⚡ Registrar energía', onSelect: onEnergy, className: 'activity-context-menu__energy' },
    { label: 'Editar', onSelect: onEdit },
    { label: 'Eliminar', onSelect: onDelete, className: 'activity-context-menu__delete' },
  ]

  return createPortal(
    <div
      ref={menuRef}
      className="activity-context-menu"
      style={position ? { top: position.top, left: position.left } : undefined}
      role="menu"
      aria-label={`Acciones para ${label}`}
      onKeyDown={handleMenuKeyDown}
    >
      {actions.map((action, index) => (
        <button
          key={action.label}
          ref={index === 0 ? firstItemRef : undefined}
          type="button"
          role="menuitem"
          className={action.className}
          onClick={() => {
            onClose()
            action.onSelect()
          }}
        >
          {action.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
