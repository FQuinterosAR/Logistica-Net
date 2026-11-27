import Button from './Button'
import IconButton from './IconButton'
import { CloseIcon } from './icons'

const VARIANTS = {
  error: 'border-ns-danger-border bg-ns-danger-bg text-ns-danger',
  success: 'border-ns-success-border bg-ns-success-bg text-ns-success',
}

/** Aviso de error o de éxito, con "Reintentar" y/o cerrar opcionales. */
export default function Alert({ variant = 'error', children, onRetry, onClose }) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-[3px] border px-3 py-2 text-[13px] font-semibold ${VARIANTS[variant]}`}
    >
      <span>{children}</span>
      {(onRetry || onClose) && (
        <div className="flex items-center gap-2">
          {onRetry && <Button onClick={onRetry}>Reintentar</Button>}
          {onClose && (
            <IconButton label="Cerrar aviso" onClick={onClose}>
              <CloseIcon size={12} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  )
}
