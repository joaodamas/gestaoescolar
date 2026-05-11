import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Drawer({
  aberto,
  onFechar,
  titulo,
  descricao,
  tamanho = 'md',
  children,
  footer,
}) {
  const larguras = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
      const handler = (e) => e.key === 'Escape' && onFechar?.()
      window.addEventListener('keydown', handler)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handler)
      }
    }
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onFechar}
      />
      <div className={`w-full ${larguras[tamanho]} bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300`}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            {titulo && <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>}
            {descricao && <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>}
          </div>
          <button
            onClick={onFechar}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1 transition-colors -mr-1 -mt-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
