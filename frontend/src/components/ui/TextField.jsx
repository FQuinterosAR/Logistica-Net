import { useId } from 'react'
import Field from './Field'
import Input from './Input'
import ValorLectura from './ValorLectura'

/** Campo de texto. readOnly → muestra el valor como texto (modo vista de NetSuite), sin caja. */
export default function TextField({ label, value = '', onChange, required = false, readOnly = false, ...props }) {
  const id = useId()
  if (readOnly) {
    return (
      <Field label={label}>
        <ValorLectura>{value}</ValorLectura>
      </Field>
    )
  }
  return (
    <Field label={label} htmlFor={id} required={required}>
      <Input id={id} type="text" required={required} value={value} onChange={(e) => onChange?.(e.target.value)} {...props} />
    </Field>
  )
}
