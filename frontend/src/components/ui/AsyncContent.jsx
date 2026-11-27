import Spinner from './Spinner'
import Alert from './Alert'

/** Muestra el círculo de carga, el error (con Reintentar) o el contenido. */
export default function AsyncContent({ loading, error, onRetry, minHeight = 120, children }) {
  if (error) {
    return (
      <div className="p-3">
        <Alert variant="error" onRetry={onRetry}>{error.message || String(error)}</Alert>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-ns-muted-2" style={{ minHeight }}>
        <Spinner />
        <span>Cargando…</span>
      </div>
    )
  }
  return children
}
