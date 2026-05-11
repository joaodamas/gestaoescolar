export default function Tabs({ value, onChange, items = [], className = '' }) {
  return (
    <div className={`flex gap-1 bg-slate-100 rounded-xl p-1 w-fit overflow-x-auto ${className}`}>
      {items.map(item => {
        const Icon = item.icon
        const ativo = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange?.(item.id)}
            disabled={item.disabled}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              ativo
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed'
            }`}
          >
            {Icon && <Icon size={14} />}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
