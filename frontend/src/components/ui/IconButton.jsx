const VARIANTS = {
  default: 'h-7 w-8 border border-ns-border-strong bg-white text-ns-navy hover:bg-ns-btn',
  inverse: 'h-9 w-9 border-0 bg-transparent text-white hover:bg-white/15',
}

/** variant: 'default' (fondo blanco) | 'inverse' (transparente, para fondos oscuros) */
export default function IconButton({ label, variant = 'default', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex cursor-pointer items-center justify-center rounded-[3px] p-0 ${VARIANTS[variant]}`}
      {...props}
    >
      {children}
    </button>
  )
}
