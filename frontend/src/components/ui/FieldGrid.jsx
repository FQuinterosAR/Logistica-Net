const COLS = {
  auto: 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

/** Grilla de campos de formulario. cols: 'auto' | 2 | 3 | 4 */
export default function FieldGrid({ cols = 'auto', children }) {
  return <div className={`grid gap-x-6 gap-y-4 ${COLS[cols] ?? COLS.auto}`}>{children}</div>
}
