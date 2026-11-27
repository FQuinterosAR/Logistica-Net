import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Field from './Field'
import { inputClass } from './styles'
import { CloseIcon } from './icons'

const MAX_OPCIONES = 50

/** Minúsculas y sin tildes, para buscar "baez" y encontrar "Báez". */
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Select con búsqueda: se escribe y debajo aparecen las opciones que contienen el texto
 * (sin distinguir mayúsculas ni tildes). Misma interfaz que SelectField.
 * options: [{ value, label }] · value: el value elegido ('' = ninguno) · onChange(value)
 * Flechas + Enter para elegir, Escape para cerrar, "×" para limpiar.
 */
export default function ComboboxField({ label, options = [], value = '', onChange, placeholder = '- Todos -', required = false, disabled = false }) {
  const id = useId()
  const listaId = `${id}-lista`
  const listaRef = useRef(null)
  const inputRef = useRef(null)
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [activo, setActivo] = useState(0)

  const seleccionada = options.find((o) => String(o.value) === String(value))

  const coincidencias = useMemo(() => {
    const q = normalizar(texto.trim())
    return q ? options.filter((o) => normalizar(o.label).includes(q)) : options
  }, [options, texto])
  const visibles = coincidencias.slice(0, MAX_OPCIONES)

  // Mantiene visible la opción activa al moverse con las flechas.
  useEffect(() => {
    if (abierto) listaRef.current?.querySelector(`[data-index="${activo}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activo, abierto])

  const abrir = () => {
    setTexto('')
    setActivo(0)
    setAbierto(true)
  }

  const cerrar = () => {
    setAbierto(false)
    setTexto('')
  }

  const elegir = (opcion) => {
    onChange?.(opcion ? String(opcion.value) : '')
    cerrar()
    inputRef.current?.blur()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!abierto) return abrir()
      setActivo((i) => Math.min(i + 1, visibles.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (abierto && visibles[activo]) {
        e.preventDefault()
        elegir(visibles[activo])
      }
    } else if (e.key === 'Escape') {
      if (abierto) {
        e.preventDefault()
        e.stopPropagation()
        cerrar()
      }
    }
  }

  return (
    <Field label={label} htmlFor={id} required={required}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={abierto}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={abierto && visibles[activo] ? `${listaId}-${activo}` : undefined}
          disabled={disabled}
          required={required}
          className={`${inputClass({ required })} w-full ${seleccionada && !disabled ? 'pr-7' : ''}`}
          // Cerrado muestra lo elegido; abierto muestra lo que se escribe (y lo elegido como pista).
          value={abierto ? texto : (seleccionada?.label ?? '')}
          placeholder={abierto ? (seleccionada?.label ?? 'Escribí para buscar…') : placeholder}
          onFocus={abrir}
          onBlur={cerrar}
          onChange={(e) => {
            setTexto(e.target.value)
            setActivo(0)
            setAbierto(true)
          }}
          onKeyDown={onKeyDown}
        />

        {seleccionada && !disabled && !abierto && (
          <button
            type="button"
            aria-label={`Limpiar ${label}`}
            title="Limpiar"
            onClick={() => onChange?.('')}
            className="absolute top-1/2 right-1.5 flex -translate-y-1/2 cursor-pointer items-center text-ns-muted-2 hover:text-ns-text"
          >
            <CloseIcon size={11} />
          </button>
        )}

        {abierto && (
          <ul
            ref={listaRef}
            id={listaId}
            role="listbox"
            className="absolute top-full right-0 left-0 z-30 mt-0.5 max-h-64 overflow-y-auto rounded-[2px] border border-ns-input bg-white py-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
          >
            {visibles.length === 0 && <li className="px-2 py-1.5 text-ns-muted-2">Sin coincidencias</li>}
            {visibles.map((o, i) => {
              const elegida = String(o.value) === String(value)
              return (
                <li
                  key={o.value}
                  id={`${listaId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={elegida}
                  // mousedown (no click) para elegir antes de que el input pierda el foco y cierre la lista.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    elegir(o)
                  }}
                  onMouseEnter={() => setActivo(i)}
                  className={`cursor-pointer px-2 py-1 ${i === activo ? 'bg-ns-row-open' : ''} ${elegida ? 'font-semibold' : ''}`}
                >
                  {o.label}
                </li>
              )
            })}
            {coincidencias.length > MAX_OPCIONES && (
              <li className="border-t border-ns-border px-2 py-1.5 text-[11px] text-ns-muted-2">
                {coincidencias.length - MAX_OPCIONES} más: escribí más para afinar la búsqueda
              </li>
            )}
          </ul>
        )}
      </div>
    </Field>
  )
}
