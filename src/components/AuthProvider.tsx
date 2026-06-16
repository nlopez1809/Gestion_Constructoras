import { useEffect, useState, type ReactNode } from 'react'
import { AuthContext, canDoHelper } from '@/store/authStore'
import { authApi } from '@/lib/api'
import { TokenStore } from '@/lib/api/client'
import type { AuthUser, Rol } from '@/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!TokenStore.access) { setLoading(false); return }
    authApi.me()
      .then(res => {
        const d = res as { usuario: AuthUser }
        setUser(d.usuario)
      })
      .catch(() => { TokenStore.clear(); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    const res = await authApi.login(email, password) as {
      accessToken: string
      refreshToken: string
      usuario: AuthUser
    }
    TokenStore.set(res.accessToken, res.refreshToken)
    setUser(res.usuario)
  }

  const signUp = async (data: { nombre: string; email: string; password: string; rol: Rol }) => {
    await authApi.register(data)
  }

  const signOut = () => {
    TokenStore.clear()
    setUser(null)
  }

  const canDo    = (permission: string) => canDoHelper(user, permission)
  const hasRole  = (...roles: Rol[]) => !!user && roles.includes(user.rol)

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, canDo, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}
