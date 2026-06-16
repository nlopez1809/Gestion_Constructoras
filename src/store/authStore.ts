import { createContext, useContext } from 'react'
import type { AuthUser } from '@/types'
import { PERMISOS } from '@/lib/constants'
import type { Rol } from '@/types'

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, meta: { nombres: string; apellidos: string; cargo: string }) => Promise<void>
  signOut: () => Promise<void>
  canDo: (permission: string) => boolean
  hasRole: (...roles: Rol[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext debe usarse dentro de AuthProvider')
  return ctx
}

export function canDoHelper(user: AuthUser | null, permission: string): boolean {
  if (!user) return false
  if (user.profile.rol === 'admin') return true
  const allowed: Rol[] = (PERMISOS[permission] as Rol[]) ?? []
  return allowed.includes(user.profile.rol)
}
