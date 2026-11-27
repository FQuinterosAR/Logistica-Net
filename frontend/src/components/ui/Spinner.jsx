const SIZES = {
  sm: 'h-3.5 w-3.5 border-2',
  md: 'h-6 w-6 border-[3px]',
}

const TONES = {
  default: 'border-ns-border border-t-ns-blue',
  inverse: 'border-white/40 border-t-white',
}

/** Círculo de carga. tone 'inverse' para usarlo sobre fondos oscuros (botón primario). */
export default function Spinner({ size = 'md', tone = 'default', label = 'Cargando' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block shrink-0 animate-spin rounded-full ${SIZES[size]} ${TONES[tone]}`}
    />
  )
}
