import { useEffect, useState } from 'react'

/** Devuelve `value` recién cuando pasan `delay` ms sin cambios (para no pedir datos en cada tecla/cambio). */
export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
