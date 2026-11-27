import DataList from '../../components/ui/DataList'
import TextLink from '../../components/ui/TextLink'
import DetalleDespacho from './DetalleDespacho'
import { EstadoRemitoBadge, RemitoLink } from './Remito'
import { formatDate } from '../../utils/format'
import { urlTransaccion } from '../../utils/netsuite'

const COLUMNS = [
  {
    key: 'link',
    label: 'Link',
    width: '70px',
    render: (d) => <TextLink href={urlTransaccion(d.id)} target="_blank" rel="noreferrer">Ver</TextLink>,
  },
  { key: 'numero', label: 'Número', width: '150px', sortable: true },
  { key: 'fecha', label: 'Fecha', width: '110px', sortable: true, render: (d) => formatDate(d.fecha) },
  { key: 'cliente', label: 'Cliente', width: 'minmax(160px, 2fr)' },
  { key: 'subsidiaria', label: 'Subsidiaria', width: 'minmax(140px, 1fr)', sortable: true },
  { key: 'ovNumero', label: 'OV origen', width: 'minmax(130px, 1fr)' },
  {
    key: 'remito',
    label: 'Remito',
    width: '150px',
    render: (d) => <RemitoLink remito={d.remito?.numero} href={d.remito ? urlTransaccion(d.remito.id) : undefined} />,
  },
  { key: 'estadoRemito', label: 'Estado remito', width: '180px', render: (d) => <EstadoRemitoBadge estado={d.estadoRemito} /> },
]

export default function DespachosList({ despachos, ubicaciones, onGuardado }) {
  return (
    <DataList
      columns={COLUMNS}
      rows={despachos}
      minWidth={1100}
      expandLabel="Ver detalle del despacho"
      renderExpanded={(d) => <DetalleDespacho despacho={d} ubicaciones={ubicaciones} onGuardado={onGuardado} />}
      emptyText="No hay despachos"
    />
  )
}
