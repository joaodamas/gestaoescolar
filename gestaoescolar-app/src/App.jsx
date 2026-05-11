import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import AppLayout from './components/Layout/AppLayout'
import LoginPage from './pages/Login/LoginPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import AlunosPage from './pages/Alunos/AlunosPage'
import TurmasPage from './pages/Turmas/TurmasPage'
import ChamadaPage from './pages/Chamada/ChamadaPage'
import NotasPage from './pages/Notas/NotasPage'
import FinanceiroPage from './pages/Financeiro/FinanceiroPage'
import OcorrenciasPage from './pages/Ocorrencias/OcorrenciasPage'
import EmDesenvolvimento from './pages/EmDesenvolvimento'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route path="/notas" element={
              <PrivateRoute modulo="notas"><NotasPage /></PrivateRoute>
            } />
            <Route path="/financeiro" element={
              <PrivateRoute modulo="financeiro"><FinanceiroPage /></PrivateRoute>
            } />
            <Route path="/ocorrencias" element={
              <PrivateRoute modulo="ocorrencias"><OcorrenciasPage /></PrivateRoute>
            } />
            <Route path="/projetos" element={
              <PrivateRoute modulo="projetos"><EmDesenvolvimento titulo="Projetos & Pendências" /></PrivateRoute>
            } />
            <Route path="/relatorios" element={
              <PrivateRoute modulo="relatorios"><EmDesenvolvimento titulo="Relatórios & Exportação" /></PrivateRoute>
            } />
            <Route path="/configuracoes" element={
              <PrivateRoute modulo="configuracoes"><EmDesenvolvimento titulo="Configurações da Escola" /></PrivateRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
