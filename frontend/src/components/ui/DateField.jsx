import { useId } from 'react'
import Field from './Field'
import Input from './Input'
import ValorLectura from './ValorLectura'
import { formatDate } from '../../utils/format'

/** Campo de fecha (YYYY-MM-DD). readOnly → muestra la fecha como texto DD/MM/YYYY, sin caja. */
export default function DateField({ label, value = '', onChange, required = false, disabled = false, readOnly = false }) {
  const id = useId()
  if (readOnly) {
    return (
      <Field label={label}>
        <ValorLectura>{formatDate(value)}</ValorLectura>
      </Field>
    )
  }
  return (
    <Field label={label} htmlFor={id} required={required}>
      <Input
        id={id}
        type="date"
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </Field>
  )
}
