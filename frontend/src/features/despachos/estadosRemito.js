/**
 * Estado del remito unificado por el Suitelet (estadoRemito):
 * ejecución de pedido → shipstatus A/B/C; traslado → custbodyestado_remito 1/2/3.
 */
export const ESTADOS_REMITO = {
  0: { label: 'Sin remito', variant: 'neutral' },
  1: { label: 'Preparación de pedido', variant: 'warning' },
  2: { label: 'Listo para despacho', variant: 'info' },
  3: { label: 'Despachado', variant: 'success' },
}

export const opcionesEstadoRemito = Object.entries(ESTADOS_REMITO).map(([value, e]) => ({ value, label: e.label }))
