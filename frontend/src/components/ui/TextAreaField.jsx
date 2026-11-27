import { useId } from 'react'
import Field from './Field'
import ValorLectura from './ValorLectura'
import { textareaClass } from './styles'

/**
 * Campo de texto de varias líneas (ej. direcciones). rows: alto en filas.
 * readOnly → muestra el texto con sus saltos de línea, sin caja.
 */
export default function TextAreaField({ label, value = '', onChange, required = false, rows = 3, readOnly = false, ...props }) {
  const id = useId()
  if (readOnly) {
    return (
      <Field label={label}>
        <ValorLectura multilinea>{value}</ValorLectura>
      </Field>
    )
  }
  return (
    <Field label={label} htmlFor={id} required={required}>
      <textarea
        id={id}
        rows={rows}
        required={required}
        className={`${textareaClass({ required })} w-full`}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      />
    </Field>
  )
}
