import { useState } from 'react'
import Section from '../../components/ui/Section'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Alert from '../../components/ui/Alert'
import AsyncContent from '../../components/ui/AsyncContent'
import ArticulosDespachoTable from './ArticulosDespachoTable'
import ContactoCliente from './ContactoCliente'
import { InfoGeneralSection, DatosTransporteSection } from './SeccionesOrdenDespacho'
import { EstadoRemitoBadge, RemitoLink } from './Remito'
import { articulosParaEditar, cantidadesIniciales, formDesdeDespacho, payloadOrden, resumenOrden } from './ordenDespacho'
import { useDisponibleUbicaciones } from './useDisponibleUbicaciones'
import { apiGet, apiPost } from '../../api'
import { useRequest } from '../../hooks/useRequest'
import { urlTransaccion } from '../../utils/netsuite'

/**
 * Detalle de un despacho de la lista: pide el detalle completo (con artículos) al expandirse.
 * Después de guardar lo vuelve a pedir, así se ve lo que quedó guardado de verdad.
 */
export default function DetalleDespacho({ despacho, ubicaciones = [], onGuardado }) {
  const detalle = useRequest((signal) => apiGet('getDetalleDespacho', { id: despacho.id }, signal), [despacho.id])

  const guardado = (d) => {
    detalle.reload()
    onGuardado?.(d)
  }

  return (
    <AsyncContent loading={detalle.loading} error={detalle.error} onRetry={detalle.reload} minHeight={80}>
      {detalle.data && (
        <FormularioDespacho despacho={detalle.data} ubicaciones={ubicaciones} onGuardado={guardado} />
      )}
    </AsyncContent>
  )
}

/**
 * Solo lectura hasta "Editar" (artículo, total y cantidad despachada). Con remito vinculado no se puede editar
 * (el servidor también lo bloquea). Al editar pide a la OV el restante real de cada línea y el disponible por
 * ubicación, y muestra además restante (descuenta lo que se escribe) y disponible de la ubicación elegida.
 */
function FormularioDespacho({ despacho, ubicaciones, onGuardado }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(() => formDesdeDespacho(despacho))
  const [cantidades, setCantidades] = useState(() => cantidadesIniciales(despacho.articulos))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const setCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))
  const setCantidad = (id, valor) => setCantidades((c) => ({ ...c, [id]: valor }))

  // Editando: restante real de la OV en este momento (se pide cada vez que se entra a editar)...
  const lineasOV = useRequest(
    (signal) => apiGet('getArticulosOrden', { ovId: despacho.ovId }, signal),
    [despacho.ovId],
    { enabled: editando },
  )
  const articulosBase = editando ? articulosParaEditar(despacho.articulos, lineasOV.loading ? null : lineasOV.data?.articulos) : despacho.articulos

  // ...y disponible de la ubicación elegida en el formulario (puede cambiarla).
  const disponibles = useDisponibleUbicaciones({
    ovId: despacho.ovId,
    articulos: articulosBase,
    ubicaciones,
    ubicacion: form.ubicacion,
    enabled: editando,
  })
  const articulos = disponibles.articulos
  const mensajeSinDisponible = editando && lineasOV.loading ? 'Calculando restante…' : disponibles.mensajeSinDisponible

  const { valido } = resumenOrden(form, articulos, cantidades)
  const readOnly = !editando
  const editable = !despacho.remito

  const cancelar = () => {
    setForm(formDesdeDespacho(despacho))
    setCantidades(cantidadesIniciales(despacho.articulos))
    setError(null)
    setEditando(false)
  }

  const guardar = async () => {
    if (!valido || enviando) return
    setEnviando(true)
    setError(null)
    try {
      await apiPost('postGuardarDespacho', { despachoId: despacho.id, ...payloadOrden(form, articulos, cantidades) })
      setEditando(false)
      onGuardado?.(despacho)
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div className="text-[15px] font-semibold text-ns-navy">Despacho N°: {despacho.numero}</div>
          {/* Contexto del despacho sin abrir las secciones. */}
          <div className="text-xs text-ns-muted-2">
            {[despacho.cliente, despacho.ovNumero, despacho.ubicacion].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-ns-muted">Remito:</span>
          <EstadoRemitoBadge estado={despacho.estadoRemito} />
          <RemitoLink
            remito={despacho.remito?.numero}
            href={despacho.remito ? urlTransaccion(despacho.remito.id) : undefined}
          />
        </div>
      </div>
      <ContactoCliente telefono={despacho.contacto?.telefono} email={despacho.contacto?.email} />

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {disponibles.error && (
        <Alert variant="error" onRetry={disponibles.reload}>
          No se pudo calcular el disponible por ubicación: {disponibles.error.message}
        </Alert>
      )}
      {editando && lineasOV.error && (
        <Alert variant="error" onRetry={lineasOV.reload}>
          No se pudo calcular el restante de la OV: {lineasOV.error.message}
        </Alert>
      )}

      <InfoGeneralSection
        form={form}
        onFieldChange={setCampo}
        ubicaciones={disponibles.ubicaciones}
        responsable={despacho.responsable}
        readOnly={readOnly}
        compact
        defaultOpen={false}
      />
      <DatosTransporteSection
        form={form}
        onFieldChange={setCampo}
        transportistas={despacho.transportistas}
        readOnly={readOnly}
        compact
        defaultOpen={false}
      />
      <Section title="Artículos" headingLevel={3} compact flush defaultOpen={false}>
        <ArticulosDespachoTable
          articulos={articulos}
          cantidades={cantidades}
          onCantidadChange={setCantidad}
          mensajeSinDisponible={mensajeSinDisponible}
          readOnly={readOnly}
          labelCantidad="Cantidad despachada"
          mostrarRestante={editando}
          restanteDinamico
          mostrarDisponible={editando}
          minWidth={editando ? 760 : 560}
        />
      </Section>

      <div className="flex items-center justify-end gap-2.5">
        {!editable && <span className="text-xs text-ns-muted-2">Tiene remito vinculado: no se puede editar.</span>}
        {editando ? (
          <>
            <Button size="md" disabled={enviando} onClick={cancelar}>Cancelar</Button>
            <Button size="md" variant="primary" disabled={!valido || enviando} onClick={guardar}>
              {enviando && <Spinner size="sm" tone="inverse" label="Guardando" />}
              Guardar
            </Button>
          </>
        ) : (
          <Button size="md" disabled={!editable} onClick={() => setEditando(true)}>Editar</Button>
        )}
      </div>
    </div>
  )
}
