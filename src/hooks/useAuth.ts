import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { PERMISOS } from '@/lib/constants'
import type { AuthUser, Profile } from '@/types'

export function useAuth() {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return { id: userId, email, profile: data as Profile }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const authUser = await fetchProfile(session.user.id, session.user.email ?? '')
        setUser(authUser)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const authUser = await fetchProfile(session.user.id, session.user.email ?? '')
        setUser(authUser)
      } else {
        setUser(null)
      }
    })

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
      email,
      password,
      options: { data: meta },
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const canDo = (permission: string): boolean => {
    if (!user) return false
    const allowed: string[] = PERMISOS[permission] ?? []
    return user.profile.rol === 'admin' || allowed.includes(user.profile.rol)
  }

  return { user, loading, signIn, signUp, signOut, canDo }
}
