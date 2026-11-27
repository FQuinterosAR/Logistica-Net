import DataList from '../../components/ui/DataList'
import TextLink from '../../components/ui/TextLink'
import DetalleOV from './DetalleOV'
import { formatDate } from '../../utils/format'
import { urlTransaccion } from '../../utils/netsuite'

const COLUMNS = [
  {
    key: 'link',
    label: 'Link',
    width: '70px',
    render: (o) => <TextLink href={urlTransaccion(o.id)} target="_blank" rel="noreferrer">Ver</TextLink>,
  },
  { key: 'numero', label: 'Número', width: 'minmax(140px, 1fr)', sortable: true },
  { key: 'fecha', label: 'Próxima fecha de entrega', width: 'minmax(120px, 1fr)', sortable: true, render: (o) => formatDate(o.fecha) },
  { key: 'cliente', label: 'Cliente', width: 'minmax(200px, 2fr)' },
  { key: 'subsidiaria', label: 'Subsidiaria', width: 'minmax(160px, 1fr)', sortable: true },
]

export default function OrdenesVentaList({ ordenes, onGenerarOrden }) {
  return (
    <DataList
      columns={COLUMNS}
      rows={ordenes}
      renderExpanded={(o) => <DetalleOV orden={o} onGenerarOrden={onGenerarOrden} />}
      expandLabel="Ver detalle de la OV"
      emptyText="No hay órdenes de venta para despachar"
    />
  )
}
