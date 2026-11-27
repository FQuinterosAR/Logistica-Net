import DataList from '../../components/ui/DataList'
import Input from '../../components/ui/Input'
import { formatDate, formatNumber } from '../../utils/format'
import { cantidadInvalida, maxDespachable, restanteConCantidad } from './ordenDespacho'

/**
 * Tabla de artículos con la cantidad a despachar. readOnly → inputs deshabilitados (detalle de despacho sin editar).
 * mensajeSinDisponible: placeholder de los artículos con máximo 0 (ej. "Elegí una ubicación").
 * mostrarRestante / mostrarDisponible: columnas opcionales (el detalle de despacho las muestra solo al editar).
 * restanteDinamico: el restante se muestra descontando lo que se va escribiendo (articulo.restante = máximo).
 * labelCantidad: título de la columna de cantidad.
 * mostrarFechaSuministro: columna "Fecha necesidad de suministro" (expectedshipdate de la línea, solo lectura).
 */
export default function ArticulosDespachoTable({
  articulos,
  cantidades,
  onCantidadChange,
  readOnly = false,
  minWidth = 820,
  mensajeSinDisponible = 'Sin disponible',
  mostrarRestante = true,
  restanteDinamico = false,
  mostrarDisponible = true,
  labelCantidad = 'Cantidad a despachar',
  mostrarFechaSuministro = false,
}) {
  const columns = [
    { key: 'nombre', label: 'Artículo', width: 'minmax(200px, 2fr)', className: () => 'font-semibold' },
    mostrarFechaSuministro && {
      key: 'fechaNecesidadSuministro',
      label: 'Fecha necesidad de suministro',
      width: '130px',
      render: (a) => formatDate(a.fechaNecesidadSuministro),
    },
    { key: 'total', label: 'Cantidad total', width: '140px', align: 'right', render: (a) => formatNumber(a.total ?? a.pedido) },
    mostrarRestante && {
      key: 'restante',
      label: 'Cantidad restante',
      width: '150px',
      align: 'right',
      render: (a) => formatNumber(restanteDinamico ? restanteConCantidad(a, cantidades[a.id]) : a.restante),
    },
    readOnly ? {
      // Solo lectura: la cantidad como número, igual que "Cantidad total" (sin caja deshabilitada).
      key: 'despachar',
      label: labelCantidad,
      width: '170px',
      align: 'right',
      className: () => 'font-semibold',
      render: (a) => formatNumber(Number(cantidades[a.id]) || 0),
    } : {
      key: 'despachar',
      label: labelCantidad,
      width: '220px',
      render: (a) => {
        const max = maxDespachable(a)
        const value = cantidades[a.id] ?? ''
        const invalid = !readOnly && cantidadInvalida(a, value)
        const sinDisponible = max === 0
        return (
          <div className="flex flex-col gap-0.5">
            <Input
              type="number"
              min={0}
              max={max}
              step={1}
              value={value}
              placeholder={readOnly ? '' : sinDisponible ? mensajeSinDisponible : 'Ingrese la cantidad'}
              disabled={readOnly || (sinDisponible && !value)}
              invalid={invalid}
              aria-label={`${labelCantidad} de ${a.nombre}`}
              onChange={(e) => onCantidadChange?.(a.id, e.target.value)}
              className="w-full"
            />
            {invalid && <span className="text-[11px] text-ns-error">Máximo {formatNumber(max)}</span>}
          </div>
        )
      },
    },
    mostrarDisponible && {
      key: 'disponible',
      label: 'Cantidad disponible',
      width: '160px',
      align: 'right',
      render: (a) => formatNumber(a.disponible),
      className: (a) => (a.disponible === 0 ? 'font-semibold text-ns-error' : ''),
    },
  ].filter(Boolean)

  return (
    <DataList
      columns={columns}
      rows={articulos}
      minWidth={minWidth}
      emptyText="No hay artículos pendientes de despacho"
    />
  )
}
