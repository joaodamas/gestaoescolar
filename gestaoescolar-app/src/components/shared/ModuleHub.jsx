import { Link } from 'react-router-dom'
import { ArrowRight, LayoutGrid } from 'lucide-react'

const statusClasses = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
}

function Metric({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{value ?? '—'}</p>
    </div>
  )
}

function ModuleCard({ module }) {
  const Icon = module.icon ?? LayoutGrid
  const statusColor = module.statusColor ?? 'slate'
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Icon size={18} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">{module.title}</h3>
            {module.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{module.description}</p>
            )}
          </div>
        </div>

        {(module.href || module.onClick) && (
          <ArrowRight size={17} className="mt-1 shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-600" />
        )}
      </div>

      {(module.status || module.badge || module.metrics?.length > 0) && (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          {module.metrics?.length > 0 && (
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
              {module.metrics.slice(0, 2).map((metric) => (
                <Metric key={metric.key ?? metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          )}

          {(module.status || module.badge) && (
            <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClasses[statusColor] ?? statusClasses.slate}`}>
              {module.status ?? module.badge}
            </span>
          )}
        </div>
      )}
    </>
  )

  const className = `
    group block h-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm shadow-slate-200/40
    transition-all duration-150 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30
  `

  if (module.href) {
    const ehInterno = typeof module.href === 'string' && module.href.startsWith('/')
    if (ehInterno) {
      return (
        <Link to={module.href} className={className} aria-label={module.ariaLabel ?? module.title}>
          {content}
        </Link>
      )
    }
    return (
      <a
        href={module.href}
        target={module.external ? '_blank' : undefined}
        rel={module.external ? 'noopener noreferrer' : undefined}
        className={className}
        aria-label={module.ariaLabel ?? module.title}
      >
        {content}
      </a>
    )
  }

  if (module.onClick) {
    return (
      <button type="button" onClick={module.onClick} className={className} aria-label={module.ariaLabel ?? module.title}>
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}

export default function ModuleHub({
  titulo,
  descricao,
  actions,
  modules = [],
  columns = 'auto',
  className = '',
  empty,
}) {
  const gridClass = columns === 2
    ? 'sm:grid-cols-2'
    : columns === 3
      ? 'sm:grid-cols-2 xl:grid-cols-3'
      : 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'

  return (
    <section className={`w-full ${className}`}>
      {(titulo || descricao || actions) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {(titulo || descricao) && (
            <div className="min-w-0">
              {titulo && <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>}
              {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
            </div>
          )}
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}

      {modules.length > 0 ? (
        <div className={`grid grid-cols-1 gap-3 ${gridClass}`}>
          {modules.map((module) => (
            <ModuleCard key={module.key ?? module.title} module={module} />
          ))}
        </div>
      ) : (
        empty ?? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Nenhum módulo disponível
          </div>
        )
      )}
    </section>
  )
}
