import DataList from '../../components/ui/DataList'
import { formatDate, formatNumber } from '../../utils/format'

/**
 * Artículos con restante de la OV dentro de su detalle (getArticulosOrden), abiertos primero.
 * Restante = lo que falta despachar (ya descuenta órdenes de despacho sin remito).
 * Disponible = suma de todas las ubicaciones; en rojo si no alcanza para el restante.
 * conTraslado → columnas de lo movido por traslados (preparación / listo para despacho / completado).
 */
const num = (key, label) => ({ key, label, width: '130px', align: 'right', render: (a) => formatNumber(a[key]) })

const COL_ARTICULO = {
  key: 'nombre',
  label: 'Artículo',
  width: 'minmax(220px, 2fr)',
  className: (a) => (a.cerrada ? 'text-ns-muted-2' : 'font-semibold'),
  render: (a) => (a.cerrada ? `${a.nombre} (cerrada)` : a.nombre),
}

/** expectedshipdate de la línea de la OV (solo lectura). */
const COL_FECHA_SUMINISTRO = {
  key: 'fechaNecesidadSuministro',
  label: 'Fecha necesidad de suministro',
  width: '130px',
  render: (a) => formatDate(a.fechaNecesidadSuministro),
}

const COLS_TRASLADO = [
  num('preparacion', 'En preparación'),
  num('listoDespacho', 'Listo p/ despacho'),
  num('completado', 'Completado'),
]

const COL_DISPONIBLE = {
  key: 'disponible',
  label: 'Cantidad disponible',
  width: '150px',
  align: 'right',
  render: (a) => formatNumber(a.disponible),
  className: (a) => (!a.cerrada && a.disponible < a.restante ? 'font-semibold text-ns-error' : ''),
}

export default function ArticulosOVTable({ articulos = [], conTraslado = false }) {
  const columns = [
    COL_ARTICULO,
    COL_FECHA_SUMINISTRO,
    num('pedido', 'Cantidad de pedido'),
    ...(conTraslado ? COLS_TRASLADO : []),
    num('restante', 'Cantidad restante'),
    COL_DISPONIBLE,
  ]
  return (
    <DataList
      columns={columns}
      rows={articulos}
      minWidth={conTraslado ? 1130 : 830}
      dense
      bordered
      emptyText="La OV no tiene artículos pendientes"
    />
  )
}
