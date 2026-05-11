import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { perfilPodeAcessarModulo } from '../config/permissoes'

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

  if (!perfilPodeAcessarModulo(perfil.perfil, modulo)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
