import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import AppLayout from './components/Layout/AppLayout'
import { ToastProvider } from './components/ui/Toast'

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
              <Route path="/dashboard" element={
                <PrivateRoute modulo="dashboard"><DashboardPage /></PrivateRoute>
              } />
              <Route path="/turmas" element={
                <PrivateRoute modulo="turmas"><TurmasPage /></PrivateRoute>
              } />
              <Route path="/alunos" element={
                <PrivateRoute modulo="alunos"><AlunosPage /></PrivateRoute>
              } />
              <Route path="/chamada" element={
                <PrivateRoute modulo="chamada"><ChamadaPage /></PrivateRoute>
              } />
              <Route path="/calendario" element={
                <PrivateRoute modulo="calendario"><CalendarioPage /></PrivateRoute>
              } />
              <Route path="/notas" element={
                <PrivateRoute modulo="notas"><NotasPage /></PrivateRoute>
              } />
              <Route path="/disciplinas" element={
                <PrivateRoute modulo="disciplinas"><DisciplinasPage /></PrivateRoute>
              } />
              <Route path="/financeiro" element={
                <PrivateRoute modulo="financeiro"><FinanceiroPage /></PrivateRoute>
              } />
              <Route path="/ocorrencias" element={
                <PrivateRoute modulo="ocorrencias"><OcorrenciasPage /></PrivateRoute>
              } />
              <Route path="/projetos" element={
                <PrivateRoute modulo="projetos"><ProjetosPage /></PrivateRoute>
              } />
              <Route path="/relatorios" element={
                <PrivateRoute modulo="relatorios"><RelatoriosPage /></PrivateRoute>
              } />
              <Route path="/usuarios" element={
                <PrivateRoute modulo="usuarios"><UsuariosPage /></PrivateRoute>
              } />
              <Route path="/auditoria" element={
                <PrivateRoute modulo="auditoria"><AuditoriaPage /></PrivateRoute>
              } />
              <Route path="/configuracoes" element={
                <PrivateRoute modulo="configuracoes"><ConfiguracoesPage /></PrivateRoute>
              } />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
