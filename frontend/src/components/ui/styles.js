const CAMPO_BASE =
  'box-border rounded-[2px] border px-1.5 font-ns text-[13px] text-ns-text ' +
  'focus:outline-2 focus:outline-offset-0 focus:outline-ns-focus ' +
  'disabled:cursor-default disabled:border-ns-readonly-border disabled:bg-ns-readonly-bg disabled:text-ns-text'

function estado({ required, invalid }) {
  if (invalid) return 'border-ns-error bg-ns-error-bg focus:border-ns-error'
  return `border-ns-input focus:border-ns-blue ${required ? 'bg-ns-required' : 'bg-white'}`
}

/**
 * Clases de inputs/selects.
 * required → fondo amarillo NetSuite; invalid → borde y fondo rojos; disabled → gris de solo lectura.
 */
export function inputClass({ required = false, invalid = false } = {}) {
  return `${CAMPO_BASE} h-7 ${estado({ required, invalid })}`
}

/** Clases de textarea: igual que los inputs pero con alto por filas y padding vertical. */
export function textareaClass({ required = false, invalid = false } = {}) {
  return `${CAMPO_BASE} resize-y py-1 leading-snug ${estado({ required, invalid })}`
}
