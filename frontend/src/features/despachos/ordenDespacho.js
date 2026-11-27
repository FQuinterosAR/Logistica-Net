/** Lógica de la orden de despacho (sin UI). La usan el modal de creación y el detalle de despacho. */

export const maxDespachable = (articulo) => Math.max(0, Math.min(articulo.restante, articulo.disponible))

const esVacio = (raw) => raw === '' || raw == null

export function cantidadInvalida(articulo, raw) {
  if (esVacio(raw)) return false
  const n = Number(raw)
  return !Number.isInteger(n) || n < 0 || n > maxDespachable(articulo)
}

export function totalADespachar(articulos, cantidades) {
  return articulos.reduce((acc, a) => {
    const raw = cantidades[a.id]
    if (esVacio(raw) || cantidadInvalida(a, raw)) return acc
    return acc + Number(raw)
  }, 0)
}

/** Valor declarado: opcional; si viene, número ≥ 0. */
export function valorDeclaradoInvalido(raw) {
  if (esVacio(raw)) return false
  const n = Number(raw)
  return !Number.isFinite(n) || n < 0
}

/**
 * Total, errores y si se puede confirmar (Generar / Guardar).
 * El responsable no se valida: lo pone el servidor con el usuario actual.
 */
export function resumenOrden(form, articulos, cantidades) {
  const total = totalADespachar(articulos, cantidades)
  const hayErrores = articulos.some((a) => cantidadInvalida(a, cantidades[a.id])) || valorDeclaradoInvalido(form.valorDeclarado)
  const valido = Boolean(form.fecha && form.ubicacion) && total > 0 && !hayErrores
  return { total, hayErrores, valido }
}

/** Body para postGenerarOrden / postGuardarDespacho: campos del formulario + artículos con cantidad > 0. */
export function payloadOrden(form, articulos, cantidades) {
  return {
    fecha: form.fecha,
    nota: form.nota,
    ubicacion: form.ubicacion,
    transporteInicial: form.transporteInicial,
    transporteFinal: form.transporteFinal,
    valorDeclarado: form.valorDeclarado,
    direccion: form.direccion,
    articulos: articulos
      .filter((a) => Number(cantidades[a.id]) > 0)
      .map((a) => ({ uniqueId: a.uniqueId, item: a.item, lineaOv: a.lineaOv, cantidad: Number(cantidades[a.id]) })),
  }
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local), para inputs type="date". */
export function hoyISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const CAMPOS = ['fecha', 'nota', 'ubicacion', 'transporteInicial', 'transporteFinal', 'valorDeclarado', 'direccion']

/**
 * Formulario vacío (fecha = hoy) pisado con los valores que vengan. Todo queda como texto (los ids de los selects
 * se comparan contra el value de las opciones, que es string).
 */
export function formInicial(valores = {}) {
  const form = {
    fecha: hoyISO(),
    nota: '',
    ubicacion: '',
    transporteInicial: '',
    transporteFinal: '',
    valorDeclarado: '',
    direccion: '',
  }
  for (const campo of CAMPOS) {
    if (valores[campo] != null) form[campo] = String(valores[campo])
  }
  return form
}

/** Formulario a partir de un despacho de getDetalleDespacho. */
export function formDesdeDespacho(despacho) {
  return formInicial({
    fecha: despacho.fecha,
    nota: despacho.nota ?? '',
    ubicacion: despacho.ubicacionId != null ? String(despacho.ubicacionId) : '',
    transporteInicial: despacho.transporteInicial ?? '',
    transporteFinal: despacho.transporteFinal ?? '',
    valorDeclarado: despacho.valorDeclarado ?? '',
    direccion: despacho.direccion ?? '',
  })
}

/** { [articuloId]: '150' } a partir de articulos[].cantidad (para editar un despacho existente). */
export function cantidadesIniciales(articulos = []) {
  return Object.fromEntries(
    articulos.filter((a) => a.cantidad != null).map((a) => [a.id, String(a.cantidad)]),
  )
}

/**
 * Artículos de un despacho preparados para editar, con el restante real de la OV en este momento
 * (lineasOV = getArticulosOrden().articulos; null mientras carga → restante 0).
 * restante = restante libre de la línea + lo guardado en este despacho (ya está dentro del comprometido),
 * o sea, lo máximo que puede tener esta línea en el despacho (antes de mirar el disponible).
 * Una línea que ya no está en la OV (completada por otro lado) cuenta con restante libre 0.
 */
export function articulosParaEditar(articulos, lineasOV) {
  if (!lineasOV) return articulos.map((a) => ({ ...a, restante: 0 }))
  const libre = new Map(lineasOV.map((l) => [String(l.uniqueId), Number(l.restante) || 0]))
  return articulos.map((a) => ({ ...a, restante: (libre.get(String(a.uniqueId)) ?? 0) + (Number(a.cantidad) || 0) }))
}

/** Restante que queda en la línea con la cantidad que se está escribiendo (nunca negativo). */
export function restanteConCantidad(articulo, raw) {
  const n = Number(raw)
  return Math.max(0, articulo.restante - (Number.isFinite(n) && n > 0 ? n : 0))
}

/*
 * Disponible por ubicación. porUbicacion viene de getDisponibleUbicaciones:
 * { [ubicacionId]: { [lineaOv]: disponible } } (unidad de venta; las ubicaciones sin stock no vienen).
 */

/** Artículos con el disponible de la ubicación elegida (0 si no hay ubicación o no hay stock ahí). */
export function conDisponibleEnUbicacion(articulos, porUbicacion, ubicacion) {
  const enUbicacion = (ubicacion && porUbicacion?.[ubicacion]) || {}
  return articulos.map((a) => ({ ...a, disponible: enUbicacion[a.lineaOv] ?? 0 }))
}

/**
 * Ubicaciones con el total disponible de los artículos de la OV entre corchetes: "Depósito [120]".
 * Si un artículo está en varias líneas, se cuenta una sola vez (el stock es por artículo).
 */
export function ubicacionesConDisponible(ubicaciones, porUbicacion, articulos, formatear) {
  if (!porUbicacion) return ubicaciones
  const lineaPorItem = new Map()
  for (const a of articulos) if (!lineaPorItem.has(a.item)) lineaPorItem.set(a.item, a.lineaOv)
  return ubicaciones.map((u) => {
    const enUbicacion = porUbicacion[u.value] ?? {}
    const total = [...lineaPorItem.values()].reduce((acc, linea) => acc + (enUbicacion[linea] ?? 0), 0)
    return { ...u, label: `${u.label} [${formatear(total)}]` }
  })
}
