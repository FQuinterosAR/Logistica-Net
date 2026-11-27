import Badge from '../../components/ui/Badge'
import TextLink from '../../components/ui/TextLink'
import { ESTADOS_REMITO } from './estadosRemito'

/** estado: 0 sin remito, 1 preparación, 2 listo para despacho, 3 despachado. */
export function EstadoRemitoBadge({ estado }) {
  const config = ESTADOS_REMITO[Number(estado)] ?? ESTADOS_REMITO[0]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

/** Número de remito; como link salvo link={false}. Si todavía no hay remito muestra un guion. */
export function RemitoLink({ remito, href = '#', link = true }) {
  if (!remito) return <span className="text-ns-placeholder">—</span>
  if (!link) return <span>{remito}</span>
  return <TextLink href={href} target="_blank" rel="noreferrer">{remito}</TextLink>
}
