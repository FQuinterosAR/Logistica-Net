import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import IconButton from './IconButton'
import { CloseIcon } from './icons'

/**
 * Modal estilo NetSuite. Se renderiza en document.body (fuera de #root).
 * Mientras está abierto: difumina la pantalla de atrás, bloquea el scroll del body
 * y marca #root como inert (no se puede hacer clic ni tabular hacia atrás).
 * Cierra con Esc, con la X y (si closeOnBackdrop) al hacer clic fuera del diálogo.
 */
export default function Modal({ open, onClose, title, subtitle, footer, children, maxWidth = 1040, closeOnBackdrop = true }) {
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const root = document.getElementById('root')
    const prevOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    root?.setAttribute('inert', '')
    dialogRef.current?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      root?.removeAttribute('inert')
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ns-overlay p-4 font-ns text-[13px] text-ns-text backdrop-blur-sm"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose?.()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded bg-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] outline-none"
        style={{ maxWidth }}
      >
        <header className="flex items-center justify-between gap-3 bg-ns-navy py-3 pr-4 pl-5 text-white">
          <div className="flex flex-col gap-0.5">
            <h2 id={titleId} className="m-0 text-[17px] font-semibold">{title}</h2>
            {subtitle && <div className="text-xs text-ns-subtitle">{subtitle}</div>}
          </div>
          <IconButton variant="inverse" label="Cerrar" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </header>

        <div className="flex flex-col gap-3.5 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ns-border bg-ns-footer px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
