import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthContext, canDoHelper } from '@/store/authStore'
import { PERMISOS } from '@/lib/constants'
import type { AuthUser, Profile, Rol } from '@/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string, email: string): Promise<AuthUser | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return { id: userId, email, profile: data as Profile }
  }, [])

  useEffect(() => {
    // Timeout de seguridad: si Supabase no responde en 5s, liberar loading
    const timeout = setTimeout(() => setLoading(false), 5000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) {
        const u = await fetchProfile(session.user.id, session.user.email ?? '')
        setUser(u)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const u = await fetchProfile(session.user.id, session.user.email ?? '')
          setUser(u)
        } else {
          setUser(null)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (
    email: string,
    password: string,
    meta: { nombres: string; apellidos: string; cargo: string }
  ) => {
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: meta },
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const canDo = (permission: string) => canDoHelper(user, permission)

  const hasRole = (...roles: Rol[]) => {
    if (!user) return false
    return roles.includes(user.profile.rol)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, canDo, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}
