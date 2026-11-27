import { inputClass } from './styles'

/** Input suelto (sin etiqueta). Para usar con etiqueta: TextField. */
export default function Input({ required = false, invalid = false, className = '', ...props }) {
  return (
    <input
      required={required}
      aria-invalid={invalid || undefined}
      className={`${inputClass({ required, invalid })} ${className}`.trim()}
      {...props}
    />
  )
}
