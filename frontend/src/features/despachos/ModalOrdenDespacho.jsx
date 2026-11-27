import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import Section from '../../components/ui/Section'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Alert from '../../components/ui/Alert'
import ArticulosDespachoTable from './ArticulosDespachoTable'
import { InfoGeneralSection, DatosTransporteSection } from './SeccionesOrdenDespacho'
import { formInicial, payloadOrden, resumenOrden } from './ordenDespacho'
import { useDisponibleUbicaciones } from './useDisponibleUbicaciones'
import { apiPost } from '../../api'

/**
 * Creación de una orden de despacho desde una OV.
 * articulos: los de getArticulosOrden (ya cargados en el detalle de la OV); las líneas cerradas no se muestran.
 * El disponible de cada artículo es el de la ubicación elegida (se pide al abrir el modal).
 * usuario: { id, nombre } del primer getOrdenes → se muestra como responsable.
 * transportistas: opciones de transporte inicial/final (de getArticulosOrden, ya cargadas en el detalle de la OV).
 */
export default function ModalOrdenDespacho({ orden, articulos = [], transportistas = [], ubicaciones = [], usuario, onClose, onCreada }) {
  // Transportes y dirección precargados desde el cliente de la OV (editables).
  const [form, setForm] = useState(() => formInicial({
    direccion: orden.direccion,
    transporteInicial: orden.transporteInicial,
    transporteFinal: orden.transporteFinal,
  }))
  const [cantidades, setCantidades] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const setCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))
  const setCantidad = (id, valor) => setCantidades((c) => ({ ...c, [id]: valor }))

  const disponibles = useDisponibleUbicaciones({
    ovId: orden.id,
    articulos: articulos.filter((a) => !a.cerrada),
    ubicaciones,
    ubicacion: form.ubicacion,
  })

  const { valido } = resumenOrden(form, disponibles.articulos, cantidades)

  const handleGenerar = async () => {
    if (!valido || enviando) return
    setEnviando(true)
    setError(null)
    try {
      const creada = await apiPost('postGenerarOrden', { ovId: orden.id, ...payloadOrden(form, disponibles.articulos, cantidades) })
      onCreada?.(creada)
    } catch (e) {
      setError(e.message)
      setEnviando(false)
    }
  }

  return (
    <Modal
      open
      onClose={enviando ? undefined : onClose}
      title="Creación orden de despacho"
      subtitle={`OV N°: ${orden.numero} · ${orden.cliente}`}
      footer={
        <div className="flex w-full justify-end gap-2.5">
          <Button size="md" disabled={enviando} onClick={onClose}>Cancelar</Button>
          <Button size="md" variant="primary" disabled={!valido || enviando} onClick={handleGenerar}>
            {enviando && <Spinner size="sm" tone="inverse" label="Generando" />}
            Generar
          </Button>
        </div>
      }
    >
      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {disponibles.error && (
        <Alert variant="error" onRetry={disponibles.reload}>
          No se pudo calcular el disponible por ubicación: {disponibles.error.message}
        </Alert>
      )}
      <InfoGeneralSection
        form={form}
        onFieldChange={setCampo}
        ubicaciones={disponibles.ubicaciones}
        responsable={usuario?.nombre}
      />
      <DatosTransporteSection form={form} onFieldChange={setCampo} transportistas={transportistas} />
      <Section title="Artículos" headingLevel={3} flush>
        <ArticulosDespachoTable
          articulos={disponibles.articulos}
          cantidades={cantidades}
          onCantidadChange={setCantidad}
          mensajeSinDisponible={disponibles.mensajeSinDisponible}
          mostrarFechaSuministro
          minWidth={950}
        />
      </Section>
    </Modal>
  )
}
