export function Card({ children, className = '', hover = false }) {
  return (
    <div className={`
      bg-white rounded-2xl border border-slate-200/60
      shadow-sm shadow-slate-200/40
      ${hover ? 'hover:shadow-md hover:border-slate-300/60 transition-all duration-200' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}

export function CardHeader({ titulo, descricao, acao, className = '' }) {
  return (
    <div className={`flex items-start justify-between px-5 py-4 border-b border-slate-100 ${className}`}>
      <div>
        {titulo && <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>}
        {descricao && <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

export function KpiCard({ label, valor, sufixo, icon: Icon, cor = 'blue', tendencia, descricao }) {
  const cores = {
    blue:   { bg: 'from-blue-500/10 to-blue-500/0',   icon: 'bg-blue-100 text-blue-600',     border: 'border-blue-100' },
    green:  { bg: 'from-emerald-500/10 to-emerald-500/0', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100' },
    purple: { bg: 'from-purple-500/10 to-purple-500/0', icon: 'bg-purple-100 text-purple-600', border: 'border-purple-100' },
    orange: { bg: 'from-orange-500/10 to-orange-500/0', icon: 'bg-orange-100 text-orange-600', border: 'border-orange-100' },
    rose:   { bg: 'from-rose-500/10 to-rose-500/0',   icon: 'bg-rose-100 text-rose-600',     border: 'border-rose-100' },
  }
  const c = cores[cor]

  return (
    <div className={`relative overflow-hidden bg-white rounded-2xl border ${c.border} shadow-sm shadow-slate-200/40 p-5 hover:shadow-md transition-all duration-200 group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-50 group-hover:opacity-100 transition-opacity`} />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          {Icon && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
              <Icon size={18} strokeWidth={2.5} />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-1">
          <p className="text-3xl font-bold text-slate-900 tracking-tight">
            {valor === null || valor === undefined ? '—' : (typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor)}
          </p>
          {sufixo && <span className="text-lg font-semibold text-slate-400">{sufixo}</span>}
        </div>

        {(descricao || tendencia) && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            {tendencia && (
              <span className={`font-semibold ${tendencia.startsWith('+') ? 'text-emerald-600' : tendencia.startsWith('-') ? 'text-rose-600' : 'text-slate-500'}`}>
                {tendencia}
              </span>
            )}
            {descricao && <span>{descricao}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export function Badge({ children, variante = 'slate', tamanho = 'sm' }) {
  const variantes = {
    slate:   'bg-slate-100 text-slate-700 ring-slate-200',
    blue:    'bg-blue-50 text-blue-700 ring-blue-200',
    green:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
    yellow:  'bg-amber-50 text-amber-700 ring-amber-200',
    red:     'bg-rose-50 text-rose-700 ring-rose-200',
    purple:  'bg-purple-50 text-purple-700 ring-purple-200',
    orange:  'bg-orange-50 text-orange-700 ring-orange-200',
  }
  const tamanhos = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }
  return (
    <span className={`inline-flex items-center font-medium rounded-full ring-1 ${variantes[variante]} ${tamanhos[tamanho]}`}>
      {children}
    </span>
  )
}

export function EmptyState({ icon: Icon, titulo, descricao, acao }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon size={28} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-700">{titulo}</h3>
      {descricao && <p className="text-xs text-slate-500 mt-1.5 max-w-xs">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

export function Spinner({ size = 'md', className = '' }) {
  const tamanhos = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-[3px]', lg: 'w-10 h-10 border-4' }
  return <span className={`block ${tamanhos[size]} border-blue-600 border-t-transparent rounded-full animate-spin ${className}`} />
}
