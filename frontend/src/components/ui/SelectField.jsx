import { useId } from 'react'
import Field from './Field'
import ValorLectura from './ValorLectura'
import { inputClass } from './styles'

/** Select. readOnly → muestra el nombre de la opción elegida como texto, sin caja. */
export default function SelectField({ label, options = [], value = '', onChange, placeholder = '- Todos -', required = false, disabled = false, readOnly = false }) {
  const id = useId()
  if (readOnly) {
    const elegida = options.find((o) => String(o.value) === String(value))
    return (
      <Field label={label}>
        <ValorLectura>{elegida?.label}</ValorLectura>
      </Field>
    )
  }
  return (
    <Field label={label} htmlFor={id} required={required}>
      <select
        id={id}
        required={required}
        disabled={disabled}
        className={inputClass({ required })}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  )
}
