export default function Tabs({ tabs, active, onChange, children }) {
  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-0.5 border-b-2 border-ns-navy">
        {tabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${t.id}`}
              onClick={() => onChange(t.id)}
              className={`h-8 cursor-pointer rounded-t-[3px] border border-b-0 px-4 font-ns text-[13px] font-semibold ${
                isActive ? 'border-ns-navy bg-ns-navy text-white' : 'border-ns-border-strong bg-ns-tab text-ns-text'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} className="border border-t-0 border-ns-border">
        {children}
      </div>
    </div>
  )
}
