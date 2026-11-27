const LABEL = 'text-[11px] font-semibold uppercase text-ns-muted'

export default function Field({ label, htmlFor, required = false, children }) {
  const content = (
    <>
      {label}
      {required && <span className="ml-0.5 text-ns-error" aria-hidden="true">*</span>}
    </>
  )
  return (
    <div className="flex flex-col gap-1">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={LABEL}>{content}</label>
      ) : (
        <span className={LABEL}>{content}</span>
      )}
      {children}
    </div>
  )
}
