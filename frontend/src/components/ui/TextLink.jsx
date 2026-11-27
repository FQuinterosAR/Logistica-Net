/** Link de texto estilo NetSuite (azul, semibold, sin subrayado). */
export default function TextLink({ className = '', ...props }) {
  return (
    <a
      className={`font-semibold text-ns-blue no-underline hover:text-ns-blue-hover ${className}`.trim()}
      {...props}
    />
  )
}
