import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const CONFIG = {
  success: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  error:   { icon: AlertCircle,  cls: 'border-rose-200 bg-rose-50 text-rose-800' },
  info:    { icon: Info,         cls: 'border-blue-200 bg-blue-50 text-blue-800' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((message, type = 'info', options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const toast = { id, message, type, title: options.title }
    setToasts(prev => [...prev, toast].slice(-4))
    window.setTimeout(() => remove(id), options.duration ?? 4000)
    return id
  }, [remove])

  const api = useMemo(() => ({
    show,
    success: (message, options) => show(message, 'success', options),
    error: (message, options) => show(message, 'error', options),
    info: (message, options) => show(message, 'info', options),
  }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-[70] w-[min(360px,calc(100vw-32px))] space-y-2">
        {toasts.map(toast => {
          const cfg = CONFIG[toast.type] ?? CONFIG.info
          const Icon = cfg.icon
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-slate-200/70 animate-in slide-in-from-right duration-200 ${cfg.cls}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                {toast.title && <p className="text-sm font-semibold leading-tight">{toast.title}</p>}
                <p className="text-sm leading-snug">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="rounded-lg p-1 opacity-70 hover:bg-white/60 hover:opacity-100 transition-colors"
                aria-label="Fechar aviso"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de ToastProvider.')
  return ctx
}
