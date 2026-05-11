export default function PageHeader({ titulo, descricao, icon: Icon, acoes }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-11 h-11 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
            <Icon size={20} className="text-slate-700" strokeWidth={2.25} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{titulo}</h1>
          {descricao && <p className="text-sm text-slate-500 mt-0.5">{descricao}</p>}
        </div>
      </div>
      {acoes && <div className="flex items-center gap-2 shrink-0">{acoes}</div>}
    </div>
  )
}
