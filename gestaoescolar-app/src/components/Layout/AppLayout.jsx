import { Outlet } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'

const BREAKPOINT_LG = '(min-width: 1024px)'

export default function AppLayout() {
  const { unidadeAtual } = useAuth()
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const menuButtonRef = useRef(null)
  const mainRef = useRef(null)

  function fecharSidebar() {
    setSidebarAberta(false)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(BREAKPOINT_LG)
    const handle = (event) => {
      if (event.matches) setSidebarAberta(false)
    }
    mq.addEventListener?.('change', handle)
    return () => mq.removeEventListener?.('change', handle)
  }, [])

  useEffect(() => {
    if (!sidebarAberta) return
    if (typeof document === 'undefined') return
    const menuButton = menuButtonRef.current

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSidebarAberta(false)
      }
    }
    document.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = overflowAnterior
      document.removeEventListener('keydown', handleKey)
      // Devolve o foco para o botão que abriu o menu.
      if (menuButton) menuButton.focus()
    }
  }, [sidebarAberta])

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar aberta={sidebarAberta} onFechar={fecharSidebar} />

      {sidebarAberta && (
        <div
          aria-hidden="true"
          onClick={fecharSidebar}
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
        />
      )}

      <main
        ref={mainRef}
        // `inert` impede teclado/foco no conteúdo principal enquanto o drawer está aberto em mobile.
        {...(sidebarAberta ? { inert: '' } : {})}
        className="min-w-0 flex-1 overflow-auto"
      >
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setSidebarAberta(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            aria-label="Abrir menu"
            aria-controls="sidebar-principal"
            aria-expanded={sidebarAberta}
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">Gestão Escolar</p>
            <p className="truncate text-xs text-slate-500">
              {unidadeAtual ? `Voce esta acessando ${unidadeAtual.nome}` : 'À Vista · v2.0'}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] p-4 sm:p-5 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
