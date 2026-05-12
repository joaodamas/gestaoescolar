import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, ClipboardList, BookOpen,
  Wallet, AlertTriangle, FolderKanban, BarChart3,
  Settings, LogOut, GraduationCap, ChevronDown,
  School, Shield, ShieldCheck, BookMarked, Calendar,
  X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import NotificationBell from './NotificationBell'
import { MODULOS_POR_PERFIL } from '../../config/permissoes'
import Avatar from '../ui/Avatar'

const MENU = [
  { secao: 'Visão Geral', items: [
    { path: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard, modulo: 'dashboard' },
  ]},
  { secao: 'Secretaria', items: [
    { path: '/secretaria',    label: 'Secretaria',     icon: ClipboardList,   modulo: 'secretaria' },
  ]},
  { secao: 'Pedagógico', items: [
    { path: '/turmas',        label: 'Turmas',         icon: School,          modulo: 'turmas' },
    { path: '/alunos',        label: 'Alunos',         icon: Users,           modulo: 'alunos' },
    { path: '/chamada',       label: 'Chamada',        icon: ClipboardList,   modulo: 'chamada' },
    { path: '/calendario',    label: 'Calendário',     icon: Calendar,        modulo: 'calendario' },
    { path: '/notas',         label: 'Notas',          icon: BookOpen,        modulo: 'notas' },
    { path: '/disciplinas',   label: 'Disciplinas',    icon: BookMarked,      modulo: 'disciplinas' },
    { path: '/ocorrencias',   label: 'Ocorrências',    icon: AlertTriangle,   modulo: 'ocorrencias' },
  ]},
  { secao: 'Administrativo', items: [
    { path: '/financeiro',    label: 'Financeiro',     icon: Wallet,          modulo: 'financeiro' },
    { path: '/projetos',      label: 'Projetos',       icon: FolderKanban,    modulo: 'projetos' },
    { path: '/relatorios',    label: 'Relatórios',     icon: BarChart3,       modulo: 'relatorios' },
  ]},
  { secao: 'Sistema', items: [
    { path: '/usuarios',      label: 'Usuários',       icon: Shield,          modulo: 'usuarios' },
    { path: '/auditoria',     label: 'Auditoria',      icon: ShieldCheck,     modulo: 'auditoria' },
    { path: '/configuracoes', label: 'Configurações',  icon: Settings,        modulo: 'configuracoes' },
  ]},
]

const BADGE_PERFIL = {
  diretor:     { label: 'Diretor(a)',     cor: 'bg-purple-500/15 text-purple-300 ring-purple-500/30' },
  coordenador: { label: 'Coordenador(a)', cor: 'bg-blue-500/15 text-blue-300 ring-blue-500/30' },
  professor:   { label: 'Professor(a)',   cor: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  admin:       { label: 'Administrativo', cor: 'bg-orange-500/15 text-orange-300 ring-orange-500/30' },
  secretaria:  { label: 'Secretaria',     cor: 'bg-slate-500/15 text-slate-300 ring-slate-500/30' },
}

const SELETOR_FOCAVEIS = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Sidebar({ aberta = false, onFechar }) {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const asideRef = useRef(null)
  const botaoFecharRef = useRef(null)

  const modulosDisponiveis = MODULOS_POR_PERFIL[perfil?.perfil] ?? []
  const badge = BADGE_PERFIL[perfil?.perfil]

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // Focus trap mobile: foca o X ao abrir e prende Tab/Shift+Tab dentro do drawer.
  useEffect(() => {
    if (!aberta) return
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    if (mq.matches) return // Desktop não precisa de focus trap.

    botaoFecharRef.current?.focus()

    function handleKey(event) {
      if (event.key !== 'Tab') return
      const focaveis = asideRef.current?.querySelectorAll(SELETOR_FOCAVEIS)
      if (!focaveis || focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault()
        ultimo.focus()
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [aberta])

  return (
    <aside
      ref={asideRef}
      id="sidebar-principal"
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal"
      className={`fixed inset-y-0 left-0 z-40 flex w-[82vw] max-w-72 shrink-0 flex-col border-r border-slate-800/50 bg-gradient-to-b from-slate-950 to-slate-900 shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:min-h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
        aberta ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <GraduationCap size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">Gestão Escolar</p>
            <p className="text-slate-400 text-[11px] font-medium">À Vista · v2.0</p>
          </div>
          <button
            ref={botaoFecharRef}
            type="button"
            onClick={onFechar}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Navegação por seções */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {MENU.map(secao => {
          const itensVisiveis = secao.items.filter(item => modulosDisponiveis.includes(item.modulo))
          if (itensVisiveis.length === 0) return null

          return (
            <div key={secao.secao} className="mb-6">
              <p className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {secao.secao}
              </p>
              <div className="space-y-0.5">
                {itensVisiveis.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onFechar}
                    className={({ isActive }) =>
                      `relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 lg:min-h-0 lg:py-2 ${
                        isActive
                          ? 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-500/20'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-400 rounded-r-full" />
                        )}
                        <item.icon size={17} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                        <span className={isActive ? 'font-semibold' : 'font-medium'}>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Perfil do usuário */}
      <div className="px-3 py-3 border-t border-slate-800/50 relative">
        {userMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-800 rounded-xl shadow-2xl ring-1 ring-slate-700 overflow-hidden animate-in slide-up duration-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={15} />
              Sair da conta
            </button>
          </div>
        )}

        <button
          onClick={() => setUserMenuOpen(v => !v)}
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 transition-colors group"
        >
          <Avatar nome={perfil?.nome} src={perfil?.foto_url} tamanho="md" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-xs font-semibold truncate">{perfil?.nome ?? 'Usuário'}</p>
            {badge && (
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 ${badge.cor} mt-0.5`}>
                {badge.label}
              </span>
            )}
          </div>
          <ChevronDown size={14} className={`text-slate-500 group-hover:text-slate-300 transition-all ${userMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Sino de notificações */}
        <div className="absolute top-3 right-3">
          <NotificationBell />
        </div>
      </div>
    </aside>
  )
}
