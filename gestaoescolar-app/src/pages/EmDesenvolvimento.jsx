import { Construction } from 'lucide-react'

export default function EmDesenvolvimento({ titulo }) {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center min-h-96 bg-white rounded-2xl border border-dashed border-slate-200">
        <Construction size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-600">{titulo}</h2>
        <p className="text-slate-400 text-sm mt-2">Em desenvolvimento — em breve disponível</p>
      </div>
    </div>
  )
}
