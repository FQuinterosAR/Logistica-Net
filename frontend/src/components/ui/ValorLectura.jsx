/**
 * Valor de un campo en modo lectura, como el "modo vista" de NetSuite: texto oscuro sin caja.
 * Vacío → "—" en gris. multilinea → respeta los saltos de línea (ej. direcciones).
 */
export default function ValorLectura({ children, multilinea = false }) {
  const vacio = children == null || children === ''
  return (
    <div
      className={`min-h-7 py-1 font-ns text-[13px] leading-snug ${vacio ? 'text-ns-placeholder' : 'text-ns-text'} ${multilinea ? 'whitespace-pre-line' : 'truncate'}`}
    >
      {vacio ? '—' : children}
    </div>
  )
}
