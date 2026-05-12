import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import AppLayout from './components/Layout/AppLayout'
import { ToastProvider } from './components/ui/Toast'
import { MODULOS_APP } from './config/modulos'

const LoginPage = lazy(() => import('./pages/Login/LoginPage'))
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'))
const AlunosPage = lazy(() => import('./pages/Alunos/AlunosPage'))
const TurmasPage = lazy(() => import('./pages/Turmas/TurmasPage'))
const ChamadaPage = lazy(() => import('./pages/Chamada/ChamadaPage'))
const CalendarioPage = lazy(() => import('./pages/Calendario/CalendarioPage'))
const NotasPage = lazy(() => import('./pages/Notas/NotasPage'))
const DisciplinasPage = lazy(() => import('./pages/Disciplinas/DisciplinasPage'))
const FinanceiroPage = lazy(() => import('./pages/Financeiro/FinanceiroPage'))
const OcorrenciasPage = lazy(() => import('./pages/Ocorrencias/OcorrenciasPage'))
const ProjetosPage = lazy(() => import('./pages/Projetos/ProjetosPage'))
const RelatoriosPage = lazy(() => import('./pages/Relatorios/RelatoriosPage'))
const ConfiguracoesPage = lazy(() => import('./pages/Configuracoes/ConfiguracoesPage'))
const UsuariosPage = lazy(() => import('./pages/Usuarios/UsuariosPage'))
const AuditoriaPage = lazy(() => import('./pages/Auditoria/AuditoriaPage'))
const SecretariaPage = lazy(() => import('./pages/Secretaria/SecretariaPage'))
const AreaHubPage = lazy(() => import('./pages/Modulos/AreaHubPage'))

const COMPONENTES_POR_MODULO = {
  dashboard: DashboardPage,
  turmas: TurmasPage,
  alunos: AlunosPage,
  secretaria: SecretariaPage,
  diario: AreaHubPage,
  saude: AreaHubPage,
  nutricao: AreaHubPage,
  colegio: AreaHubPage,
  paesp: AreaHubPage,
  integracoes: AreaHubPage,
  supervisao: AreaHubPage,
  chamada: ChamadaPage,
  calendario: CalendarioPage,
  notas: NotasPage,
  disciplinas: DisciplinasPage,
  financeiro: FinanceiroPage,
  ocorrencias: OcorrenciasPage,
  projetos: ProjetosPage,
  relatorios: RelatoriosPage,
  usuarios: UsuariosPage,
  auditoria: AuditoriaPage,
  configuracoes: ConfiguracoesPage,
}

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }>
              {MODULOS_APP.map((item) => {
                const Component = COMPONENTES_POR_MODULO[item.modulo]
                if (!Component) return null
                return (
                  <Route
                    key={item.modulo}
                    path={item.path}
                    element={
                      <PrivateRoute modulo={item.modulo}>
                        <Component />
                      </PrivateRoute>
                    }
                  />
                )
              })}
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
