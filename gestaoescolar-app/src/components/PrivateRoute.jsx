import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MODULOS_POR_PERFIL = {
  diretor:     ['dashboard','turmas','alunos','chamada','notas','financeiro','ocorrencias','projetos','relatorios','usuarios','configuracoes'],
  coordenador: ['dashboard','turmas','alunos','chamada','notas','ocorrencias','projetos','relatorios'],
  professor:   ['dashboard','turmas','chamada','notas'],
  admin:       ['dashboard','financeiro','projetos','usuarios','configuracoes','relatorios'],
  secretaria:  ['dashboard','relatorios'],
}

export default function PrivateRoute({ children, modulo }) {
  const { user, perfil, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !perfil) {
    return <Navigate to="/login" replace />
  }

  if (modulo && !MODULOS_POR_PERFIL[perfil.perfil]?.includes(modulo)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
