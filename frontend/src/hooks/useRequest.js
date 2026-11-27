import { useCallback, useEffect, useState } from 'react'

/**
 * Pide datos con fetcher(signal) al montar, cuando cambian `deps` o al llamar reload().
 * Si llega una petición nueva, cancela la anterior (AbortController) para que una respuesta
 * vieja no pise a la nueva. Mientras recarga conserva los datos anteriores.
 *
 * const { data, loading, error, reload } = useRequest((signal) => apiGet('getOrdenes', {}, signal), [])
 */
export function useRequest(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null })
  const [intento, setIntento] = useState(0)

  // `fetcher` cambia en cada render: se vuelve a pedir solo cuando cambian `deps` (a propósito).
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    // Marca "cargando" al empezar cada petición (sincroniza con el fetch, que es externo).
    // oxlint-disable-next-line react/set-state-in-effect
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher(controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return
        setState((s) => ({ ...s, loading: false, error }))
      })
    return () => controller.abort()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, intento])

  const reload = useCallback(() => setIntento((n) => n + 1), [])
  return { ...state, reload }
}
