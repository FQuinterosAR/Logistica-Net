/** Encabezado de la página. Sin `title` (p. ej. dentro de NetSuite, que ya muestra el título) solo muestra las acciones. */
export default function PageHeader({ title, actions }) {
  return (
    <header
      className={`flex flex-wrap items-center gap-3 border-b border-ns-border pb-3 ${title ? 'justify-between' : 'justify-end'}`}
    >
      {title && <h1 className="m-0 text-[22px] font-semibold text-ns-text">{title}</h1>}
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  )
}
