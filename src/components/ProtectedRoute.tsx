import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/store/authStore'
import type { Rol } from '@/types'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  roles?: Rol[]
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-verde-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.rol) && user.rol !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
