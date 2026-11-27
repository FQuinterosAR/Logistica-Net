import TextLink from '../../components/ui/TextLink'

/** Teléfono y email del cliente (solo lectura). Lo que no viene se muestra como "—". */
export default function ContactoCliente({ telefono, email }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-ns-muted-2">
      <span>
        <span className="font-semibold text-ns-muted">Teléfono:</span> {telefono || '—'}
      </span>
      <span>
        <span className="font-semibold text-ns-muted">Email:</span>{' '}
        {email ? <TextLink href={`mailto:${email}`}>{email}</TextLink> : '—'}
      </span>
    </div>
  )
}
