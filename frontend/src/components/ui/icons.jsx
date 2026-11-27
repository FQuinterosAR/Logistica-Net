export function ChevronIcon({ open = false, size = 12 }) {
  return (
    <svg
      className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path d="M4.5 3 7.5 6 4.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Flechas de ordenamiento. dir: 'asc' | 'desc' | null (sin ordenar). */
export function SortIcon({ dir = null, size = 10 }) {
  const up = dir === 'asc' ? 1 : dir === 'desc' ? 0.25 : 0.45
  const down = dir === 'desc' ? 1 : dir === 'asc' ? 0.25 : 0.45
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2.5 4 5 1.5 7.5 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity={up} />
      <path d="M2.5 6 5 8.5 7.5 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity={down} />
    </svg>
  )
}

export function CloseIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
