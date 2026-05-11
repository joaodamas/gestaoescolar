import { useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, AlertTriangle, Calendar, Wallet, BookOpen, X } from 'lucide-react'
import { observarNotificacoes, marcarComoLida, marcarTodasComoLidas } from '../../services/notificacoes'
import { useAuth } from '../../context/AuthContext'

const ICONE_POR_TIPO = {
  alerta_faltas:   { icon: AlertTriangle, cor: 'text-rose-600 bg-rose-100' },
  prazo_pendencia: { icon: Calendar,      cor: 'text-amber-600 bg-amber-100' },
  pdde_prazo:      { icon: Calendar,      cor: 'text-blue-600 bg-blue-100' },
  nota_alterada:   { icon: BookOpen,      cor: 'text-purple-600 bg-purple-100' },
  ocorrencia_grave:{ icon: AlertTriangle, cor: 'text-rose-600 bg-rose-100' },
  despesa:         { icon: Wallet,        cor: 'text-emerald-600 bg-emerald-100' },
  despesa_pendente:{ icon: Wallet,        cor: 'text-amber-600 bg-amber-100' },
  default:         { icon: Bell,          cor: 'text-blue-600 bg-blue-100' },
}

function tempoRelativo(timestamp) {
  if (!timestamp) return '—'
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const seg = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seg < 60) return 'Agora'
  if (seg < 3600) return `${Math.floor(seg / 60)}min`
  if (seg < 86400) return `${Math.floor(seg / 3600)}h`
  if (seg < 604800) return `${Math.floor(seg / 86400)}d`
  return d.toLocaleDateString('pt-BR')
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [notificacoes, setNotificacoes] = useState([])
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!user?.uid) return
    return observarNotificacoes(user.uid, setNotificacoes)
  }, [user?.uid])

  useEffect(() => {
    function onClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setAberto(false)
    }
    if (aberto) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [aberto])

  const naoLidas = notificacoes.filter(n => !n.lida).length

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setAberto(v => !v)}
        className="relative p-2 hover:bg-slate-800/60 rounded-lg transition-colors group"
        aria-label="Notificações"
      >
        <Bell size={17} className="text-slate-300 group-hover:text-white" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-slate-900">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute left-0 bottom-full mb-2 w-80 bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden z-50 animate-in slide-up duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notificações</p>
              <p className="text-[11px] text-slate-500">
                {naoLidas > 0 ? `${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}` : 'Tudo em dia'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button
                  onClick={() => marcarTodasComoLidas(user.uid)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button onClick={() => setAberto(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell size={32} className="text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Nenhuma notificação ainda</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notificacoes.map(n => {
                  const cfg = ICONE_POR_TIPO[n.tipo] ?? ICONE_POR_TIPO.default
                  const Icon = cfg.icon
                  return (
                    <button
                      key={n.id}
                      onClick={() => !n.lida && marcarComoLida(n.id)}
                      className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left ${!n.lida ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${cfg.cor} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${!n.lida ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'} leading-snug`}>
                          {n.titulo}
                        </p>
                        {n.mensagem && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.mensagem}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          {tempoRelativo(n.data_envio)}
                          {n.lida && <Check size={10} />}
                        </p>
                      </div>
                      {!n.lida && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
