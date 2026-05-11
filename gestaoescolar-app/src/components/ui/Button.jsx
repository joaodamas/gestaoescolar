const VARIANTES = {
  primary:   'bg-slate-900 hover:bg-slate-800 text-white shadow-sm',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-700',
  danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  success:   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  accent:    'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200',
}

const TAMANHOS = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

export default function Button({
  children,
  variante = 'primary',
  tamanho = 'md',
  loading = false,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
      ) : Icon ? (
        <Icon size={tamanho === 'sm' ? 13 : 15} />
      ) : null}
      {children}
    </button>
  )
}
