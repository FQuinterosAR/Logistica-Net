const numberFormat = new Intl.NumberFormat('es-AR')

export const formatNumber = (n) => numberFormat.format(n ?? 0)

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. Si no tiene ese formato, lo devuelve tal cual. */
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '')
}
