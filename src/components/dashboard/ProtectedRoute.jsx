import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function ProtectedRoute({ children }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-brand-base text-sm text-brand-muted">Checking your session...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
