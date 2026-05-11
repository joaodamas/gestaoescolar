import { X } from 'lucide-react'
import { useEffect } from 'react'

const TAMANHOS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({
  aberto,
  onFechar,
  titulo,
  descricao,
  tamanho = 'md',
  children,
  footer,
}) {
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop com blur */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onFechar}
      />

      {/* Modal centralizado */}
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className={`relative w-full ${TAMANHOS[tamanho]} bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200/50 animate-in zoom-in-95 duration-200`}>
          {/* Header */}
          {(titulo || onFechar) && (
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
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
          )}

          {/* Conteúdo */}
          <div className="px-6 py-5 max-h-[calc(100vh-180px)] overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
