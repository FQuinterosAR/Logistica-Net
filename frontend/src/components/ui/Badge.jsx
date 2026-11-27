const VARIANTS = {
  success: 'border-ns-success-border bg-ns-success-bg text-ns-success',
  warning: 'border-ns-warning-border bg-ns-warning-bg text-ns-warning',
  danger: 'border-ns-danger-border bg-ns-danger-bg text-ns-danger',
  info: 'border-ns-info-border bg-ns-info-bg text-ns-info',
  neutral: 'border-ns-border bg-ns-btn text-ns-text',
}

/** Etiqueta de estado. variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' */
export default function Badge({ variant = 'neutral', children }) {
  return (
    <span className={`inline-block rounded-[3px] border px-2.5 py-0.5 text-xs font-semibold ${VARIANTS[variant] ?? VARIANTS.neutral}`}>
      {children}
    </span>
  )
}
