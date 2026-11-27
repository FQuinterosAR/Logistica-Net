import { Fragment, useState } from 'react'
import IconButton from './IconButton'
import { ChevronIcon, SortIcon } from './icons'

/** Números como números; textos con orden natural ('OV12312330' > 'OV12312321'). Vacíos al final. */
function compare(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' })
}

/**
 * Lista por columnas estilo NetSuite.
 * columns: [{ key, label, width?, align?: 'left'|'right', render?: (row) => node, className?: (row) => string,
 *             sortable?: boolean, sortValue?: (row) => any }]
 * defaultSort: { key, dir: 'asc'|'desc' } para arrancar ordenado (opcional)
 * renderExpanded: (row) => node  → si se pasa, agrega la columna con el chevron
 * minWidth: ancho mínimo en px antes de que aparezca el scroll horizontal
 * dense:    filas más bajas (tablas anidadas)
 * bordered: recuadro con borde y fondo blanco (tablas dentro de un detalle)
 */
export default function DataList({
  columns,
  rows,
  rowKey = 'id',
  renderExpanded,
  defaultExpandedId = null,
  emptyText = 'Sin resultados',
  minWidth = 760,
  dense = false,
  bordered = false,
  expandLabel = 'Ver detalle',
  defaultSort = null,
}) {
  const [expandedId, setExpandedId] = useState(defaultExpandedId)
  const [sort, setSort] = useState(defaultSort)

  const toggleSort = (key) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const sortCol = sort && columns.find((c) => c.key === sort.key)
  const sortedRows = sortCol
    ? [...rows].sort((a, b) => {
        const get = sortCol.sortValue ?? ((r) => r[sortCol.key])
        return (sort.dir === 'desc' ? -1 : 1) * compare(get(a), get(b))
      })
    : rows

  const expandable = typeof renderExpanded === 'function'
  const gridStyle = {
    gridTemplateColumns: [...columns.map((c) => c.width ?? '1fr'), ...(expandable ? ['48px'] : [])].join(' '),
  }
  const align = (c) => (c.align === 'right' ? 'text-right' : '')
  const headPadding = dense ? 'px-3 py-[7px]' : 'px-3 py-2'
  const cellPadding = dense ? 'px-3 py-[7px]' : 'px-3 py-[9px]'

  return (
    <div className={`overflow-x-auto ${bordered ? 'rounded-[3px] border border-ns-border bg-white' : ''}`}>
      <div style={{ minWidth }}>
        <div
          className="grid items-center border-b border-ns-border-strong bg-ns-header text-[11px] font-bold uppercase text-ns-muted"
          style={gridStyle}
        >
          {columns.map((c) => (
            <div key={c.key} className={`${headPadding} ${align(c)}`}>
              {c.sortable ? (
                <button
                  type="button"
                  onClick={() => toggleSort(c.key)}
                  aria-label={`Ordenar por ${c.label}`}
                  className={`inline-flex cursor-pointer items-center gap-1 font-bold uppercase hover:text-ns-navy ${c.align === 'right' ? 'flex-row-reverse' : ''}`}
                >
                  {c.label}
                  <SortIcon dir={sort?.key === c.key ? sort.dir : null} />
                </button>
              ) : (
                c.label
              )}
            </div>
          ))}
          {expandable && <div className={headPadding} />}
        </div>

        {rows.length === 0 && <div className="p-6 text-center text-ns-muted-2">{emptyText}</div>}

        {sortedRows.map((row, i) => {
          const id = row[rowKey]
          const open = expandable && expandedId === id
          const bg = open ? 'bg-ns-row-open' : i % 2 ? 'bg-ns-row-alt' : 'bg-white'
          return (
            <Fragment key={id}>
              <div className={`grid items-center border-b border-ns-header ${bg}`} style={gridStyle}>
                {columns.map((c) => (
                  <div key={c.key} className={`${cellPadding} ${align(c)} ${c.className?.(row) ?? ''}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </div>
                ))}
                {expandable && (
                  <div className="flex justify-center px-2 py-1">
                    <IconButton label={expandLabel} aria-expanded={open} onClick={() => setExpandedId(open ? null : id)}>
                      <ChevronIcon open={open} />
                    </IconButton>
                  </div>
                )}
              </div>
              {open && (
                <div className="border-b border-l-[3px] border-b-ns-border border-l-ns-blue bg-ns-detail px-4 pt-3.5 pb-4">
                  {renderExpanded(row)}
                </div>
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
