import { useState } from 'react'
import { ChevronIcon } from './icons'

/**
 * Panel colapsable estilo NetSuite.
 * flush        → el cuerpo no lleva padding (tablas de borde a borde)
 * compact      → título y padding más chicos (secciones anidadas dentro de un detalle)
 * headingLevel → nivel del título (2 por defecto; 3 dentro de un modal o detalle)
 */
export default function Section({ title, defaultOpen = true, flush = false, compact = false, headingLevel = 2, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const Heading = `h${headingLevel}`
  const titleSize = compact ? 'text-xs' : 'text-[13px]'
  const bodyPadding = flush ? '' : compact ? 'px-4 pt-3 pb-3.5' : 'px-4 pt-3.5 pb-4'

  return (
    <section className="rounded-[3px] border border-ns-border bg-white">
      <Heading className="m-0">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          // Línea azul a la izquierda (como los subtítulos de sección de NetSuite) para separar bien los bloques.
          className={`flex w-full cursor-pointer items-center gap-2 rounded-tl-[3px] border-l-[3px] border-l-ns-blue bg-ns-section py-1.5 pr-3 pl-2.5 text-left font-ns font-bold uppercase tracking-[0.3px] text-ns-navy ${titleSize} ${open ? 'border-b border-b-ns-border' : 'rounded-bl-[3px]'}`}
        >
          <ChevronIcon open={open} />
          {title}
        </button>
      </Heading>
      {open && <div className={bodyPadding}>{children}</div>}
    </section>
  )
}
