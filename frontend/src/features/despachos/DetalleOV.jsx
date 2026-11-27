import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Field from '../../components/ui/Field'
import AsyncContent from '../../components/ui/AsyncContent'
import ArticulosOVTable from './ArticulosOVTable'
import ContactoCliente from './ContactoCliente'
import { apiGet } from '../../api'
import { useRequest } from '../../hooks/useRequest'
import { formatDate } from '../../utils/format'

/**
 * Detalle de una OV: pide sus artículos y los datos del cliente al expandirse y se los pasa al modal al tocar
 * "Generar orden" (dirección y transportes del cliente van dentro de la orden para precargar el formulario).
 */
export default function DetalleOV({ orden, onGenerarOrden }) {
  const detalle = useRequest((signal) => apiGet('getArticulosOrden', { ovId: orden.id }, signal), [orden.id])
  const articulos = detalle.data?.articulos ?? []
  const hayPendientes = articulos.some((a) => !a.cerrada && a.restante > 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-6">
          <div className="text-[15px] font-semibold text-ns-navy">OV N°: {orden.numero}</div>
          <div className="text-xs text-ns-muted-2">
            {orden.cliente} · {orden.subsidiaria} · {formatDate(orden.fecha)}
          </div>
        </div>
        <Button
          variant="primary"
          disabled={detalle.loading || !hayPendientes}
          title={!detalle.loading && !hayPendientes ? 'No quedan artículos pendientes para despachar' : undefined}
          onClick={() => onGenerarOrden?.({ ...orden, ...detalle.data?.cliente }, articulos, detalle.data?.transportistas ?? [])}
        >
          Generar orden
        </Button>
      </div>
      {detalle.data && (
        <ContactoCliente telefono={detalle.data.cliente?.telefono} email={detalle.data.cliente?.email} />
      )}
      <Field label="Artículos">
        <AsyncContent loading={detalle.loading} error={detalle.error} onRetry={detalle.reload} minHeight={80}>
          <ArticulosOVTable articulos={articulos} conTraslado={orden.conTraslado} />
        </AsyncContent>
      </Field>
    </div>
  )
}
