import { apiGet } from '../../api'
import { useRequest } from '../../hooks/useRequest'
import { formatNumber } from '../../utils/format'
import { conDisponibleEnUbicacion, ubicacionesConDisponible } from './ordenDespacho'

/**
 * Disponible por ubicación de los artículos de una OV (getDisponibleUbicaciones), para el formulario
 * de orden de despacho. Devuelve:
 *  - articulos: con el disponible de la `ubicacion` elegida (0 hasta que se elija una)
 *  - ubicaciones: con el total disponible entre corchetes, "Depósito [120]"
 *  - mensajeSinDisponible: placeholder para los artículos que no se pueden despachar
 * Con enabled=false devuelve artículos y ubicaciones tal cual (ej. detalle de despacho sin editar).
 */
export function useDisponibleUbicaciones({ ovId, articulos, ubicaciones, ubicacion, enabled = true }) {
  const req = useRequest((signal) => apiGet('getDisponibleUbicaciones', { ovId }, signal), [ovId], { enabled })

  if (!enabled) return { articulos, ubicaciones, mensajeSinDisponible: undefined, error: null, reload: req.reload }

  const mensajeSinDisponible = req.loading
    ? 'Calculando disponible…'
    : !ubicacion
      ? 'Elegí una ubicación'
      : 'Sin disponible'

  return {
    articulos: conDisponibleEnUbicacion(articulos, req.data, ubicacion),
    ubicaciones: ubicacionesConDisponible(ubicaciones, req.data, articulos, formatNumber),
    mensajeSinDisponible,
    error: req.error,
    reload: req.reload,
  }
}
