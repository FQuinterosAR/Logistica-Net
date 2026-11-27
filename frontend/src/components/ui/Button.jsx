const VARIANTS = {
  primary: 'border-ns-blue-dark bg-ns-blue px-4 text-white hover:bg-ns-blue-dark',
  secondary: 'border-ns-input bg-ns-btn px-3.5 text-ns-text hover:bg-ns-btn-hover',
}

const SIZES = {
  sm: 'h-[30px]',
  md: 'h-8',
}

export default function Button({ variant = 'secondary', size = 'sm', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`${SIZES[size]} inline-flex cursor-pointer items-center justify-center gap-2 rounded-[3px] border font-ns text-[13px] font-semibold disabled:cursor-default disabled:opacity-50 ${VARIANTS[variant]} ${className}`.trim()}
      {...props}
    />
  )
}
