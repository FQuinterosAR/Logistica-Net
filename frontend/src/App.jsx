import { useMemo, useState } from 'react'
import Tabs from './components/ui/Tabs'
import Alert from './components/ui/Alert'
import AsyncContent from './components/ui/AsyncContent'
import FiltrosOrdenesVenta from './features/despachos/FiltrosOrdenesVenta'
import FiltrosDespachos from './features/despachos/FiltrosDespachos'
import OrdenesVentaList from './features/despachos/OrdenesVentaList'
import DespachosList from './features/despachos/DespachosList'
import ModalOrdenDespacho from './features/despachos/ModalOrdenDespacho'
import { opcionesEstadoRemito } from './features/despachos/estadosRemito'
import { aplanarClientes, filtrarDespachos, filtrarOrdenes, ordenarOpciones } from './features/despachos/adaptadores'
import { apiGet } from './api'
import { useRequest } from './hooks/useRequest'
import { useDebouncedValue } from './hooks/useDebouncedValue'

const TABS = [
  { id: 'ov', label: 'Órdenes de venta a despachar' },
  { id: 'despachos', label: 'Despachos' },
]

const FILTROS_OV_INICIALES = { producto: '', desde: '', hasta: '', cliente: '', ordenVenta: '', subsidiaria: '' }
const FILTROS_DESPACHOS_INICIALES = { estadoRemito: '', cliente: '', ordenVenta: '', subsidiaria: '', ubicacion: '', usuario: '' }

export default function App() {
  const [tab, setTab] = useState('ov')
  const [filtrosOV, setFiltrosOV] = useState(FILTROS_OV_INICIALES)
  const [filtrosDespachos, setFiltrosDespachos] = useState(FILTROS_DESPACHOS_INICIALES)
  const [modal, setModal] = useState(null) // { orden, articulos, transportistas }
  const [aviso, setAviso] = useState(null)

  // El producto va al servidor: se espera a que deje de cambiar antes de pedir.
  const producto = useDebouncedValue(filtrosOV.producto, 400)

  const opciones = useRequest((signal) => apiGet('getOpciones', {}, signal), [])
  const ordenesReq = useRequest((signal) => apiGet('getOrdenes', { producto }, signal), [producto])
  const despachosReq = useRequest((signal) => apiGet('getDespachos', {}, signal), [], { enabled: tab === 'despachos' })

  const usuario = ordenesReq.data?.usuario
  const { ordenes, opcionesClientes, opcionesSubsidiarias, opcionesOrdenes } = useMemo(() => aplanarClientes(ordenesReq.data?.clientes), [ordenesReq.data])
  const ordenesFiltradas = useMemo(() => filtrarOrdenes(ordenes, filtrosOV), [ordenes, filtrosOV])

  const despachos = useMemo(() => despachosReq.data?.despachos ?? [], [despachosReq.data])
  const opcionesDespachos = despachosReq.data?.opciones ?? {}
  const despachosFiltrados = useMemo(() => filtrarDespachos(despachos, filtrosDespachos), [despachos, filtrosDespachos])

  const ubicaciones = opciones.data?.ubicaciones ?? []

  const ordenCreada = (creada) => {
    setModal(null)
    setAviso(`Orden de despacho ${creada.tranid} creada.`)
    ordenesReq.reload()
    despachosReq.reload()
  }

  const despachoGuardado = (despacho) => {
    setAviso(`Despacho ${despacho.numero} guardado.`)
    despachosReq.reload()
  }

  return (
    <div className="min-h-screen bg-white font-ns text-[13px] text-ns-text">
      {/* Dentro de NetSuite (iframe del Suitelet) el título y la barra los pone NetSuite. Ocupa todo el ancho del iframe. */}
      <main className="box-border flex flex-col gap-4 px-4 pt-2 pb-6">
        {aviso && <Alert variant="success" onClose={() => setAviso(null)}>{aviso}</Alert>}
        {opciones.error && (
          <Alert variant="error" onRetry={opciones.reload}>
            No se pudieron cargar los productos y ubicaciones: {opciones.error.message}
          </Alert>
        )}

        {tab === 'ov' ? (
          <FiltrosOrdenesVenta
            value={filtrosOV}
            onChange={setFiltrosOV}
            productos={opciones.data?.productos ?? []}
            clientes={opcionesClientes}
            subsidiarias={opcionesSubsidiarias}
            ordenes={opcionesOrdenes}
          />
        ) : (
          <FiltrosDespachos
            value={filtrosDespachos}
            onChange={setFiltrosDespachos}
            estadosRemito={opcionesEstadoRemito}
            clientes={ordenarOpciones(opcionesDespachos.clientes)}
            ordenesVenta={ordenarOpciones(opcionesDespachos.ordenesVenta)}
            subsidiarias={ordenarOpciones(opcionesDespachos.subsidiarias)}
            ubicaciones={ordenarOpciones(opcionesDespachos.ubicaciones)}
            usuarios={ordenarOpciones(opcionesDespachos.usuarios)}
          />
        )}

        <Tabs tabs={TABS} active={tab} onChange={setTab}>
          {tab === 'ov' ? (
            <AsyncContent loading={ordenesReq.loading} error={ordenesReq.error} onRetry={ordenesReq.reload}>
              <OrdenesVentaList
                ordenes={ordenesFiltradas}
                onGenerarOrden={(orden, articulos, transportistas) => setModal({ orden, articulos, transportistas })}
              />
            </AsyncContent>
          ) : (
            // Al recargar (ej. después de guardar un despacho) la lista queda montada: no se cierra el detalle abierto.
            <AsyncContent loading={despachosReq.loading && !despachosReq.data} error={despachosReq.error} onRetry={despachosReq.reload}>
              <DespachosList despachos={despachosFiltrados} ubicaciones={ubicaciones} onGuardado={despachoGuardado} />
            </AsyncContent>
          )}
        </Tabs>
      </main>

      {modal && (
        <ModalOrdenDespacho
          key={modal.orden.id}
          orden={modal.orden}
          articulos={modal.articulos ?? []}
          transportistas={modal.transportistas ?? []}
          ubicaciones={ubicaciones}
          usuario={usuario}
          onClose={() => setModal(null)}
          onCreada={ordenCreada}
        />
      )}
    </div>
  )
}
