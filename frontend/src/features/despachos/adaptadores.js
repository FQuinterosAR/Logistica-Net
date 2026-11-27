/** Transforman las respuestas del Suitelet y aplican los filtros que se resuelven en el front. */

// Orden natural: "#999" antes que "#1073".
const porLabel = (a, b) => String(a.label ?? '').localeCompare(String(b.label ?? ''), 'es', { numeric: true })

/** Opciones únicas [{ value, label }] a partir de una lista, ordenadas por label. */
function opcionesUnicas(lista, campoId, campoNombre) {
  const opciones = new Map()
  for (const x of lista) {
    const id = x[campoId]
    if (id != null && !opciones.has(String(id))) opciones.set(String(id), { value: String(id), label: x[campoNombre] })
  }
  return [...opciones.values()].sort(porLabel)
}

/** { [id]: { id, nombre, ovs } } de getOrdenes → lista plana de OV + opciones de los filtros Cliente y Subsidiaria. */
export function aplanarClientes(clientes) {
  const lista = Object.values(clientes ?? {})
  const ordenes = lista.flatMap((c) => c.ovs.map((ov) => ({ ...ov, clienteId: c.id, cliente: c.nombre })))
  return {
    ordenes,
    opcionesClientes: lista.map((c) => ({ value: String(c.id), label: c.nombre })).sort(porLabel),
    opcionesSubsidiarias: opcionesUnicas(ordenes, 'subsidiariaId', 'subsidiaria'),
    // Número de OV como en el filtro de Despachos: "#1073".
    opcionesOrdenes: ordenes.map((o) => ({ value: String(o.id), label: `#${o.numero}` })).sort(porLabel),
  }
}

/** Número de OV, cliente, subsidiaria y rango de fechas (fechas en YYYY-MM-DD, se comparan como texto). */
export function filtrarOrdenes(ordenes, { ordenVenta, cliente, subsidiaria, desde, hasta }) {
  return ordenes.filter((o) =>
    (!ordenVenta || String(o.id) === ordenVenta) &&
    (!cliente || String(o.clienteId) === cliente) &&
    (!subsidiaria || String(o.subsidiariaId) === subsidiaria) &&
    (!desde || o.fecha >= desde) &&
    (!hasta || o.fecha <= hasta),
  )
}

export function filtrarDespachos(despachos, { estadoRemito, cliente, ordenVenta, subsidiaria, ubicacion, usuario }) {
  return despachos.filter((d) =>
    (!estadoRemito || String(d.estadoRemito) === estadoRemito) &&
    (!cliente || String(d.clienteId) === cliente) &&
    (!ordenVenta || String(d.ovId) === ordenVenta) &&
    (!subsidiaria || String(d.subsidiariaId) === subsidiaria) &&
    (!ubicacion || String(d.ubicacionId) === ubicacion) &&
    (!usuario || String(d.responsableId) === usuario),
  )
}

export const ordenarOpciones = (opciones = []) => [...opciones].sort(porLabel)
