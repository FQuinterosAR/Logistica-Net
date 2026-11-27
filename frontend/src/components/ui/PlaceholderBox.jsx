export default function PlaceholderBox({ dashed = false, minHeight = 96, children }) {
  return (
    <div
      className={`bg-white ${dashed ? 'rounded-[3px] border border-dashed border-ns-input' : ''}`}
      style={{ minHeight }}
    >
      {children}
    </div>
  )
}
