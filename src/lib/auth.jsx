import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isConfigured, safeQuery } from './supabase.js'

/**
 * auth.jsx — accounts for Phase 2.
 *
 * Account age is exposed as `accountAgeDays` because the roadmap's anti-gaming
 * rule (Stage 2) depends on it. It is derived from the auth record's created_at,
 * which is the one timestamp a user cannot forge.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isConfigured)

  useEffect(() => {
    if (!supabase) return

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data?.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => {
      active = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  // Role comes from the profiles table, never from the client.
  useEffect(() => {
    if (!supabase || !user) {
      setProfile(null)
      return
    }
    let active = true
    safeQuery(
      (sb) => sb.from('profiles').select('id, display_name, role, created_at').eq('id', user.id).maybeSingle(),
      null
    ).then(({ data }) => {
      if (active) setProfile(data ?? null)
    })
    return () => {
      active = false
    }
  }, [user])

  const signUp = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Supabase is not configured' } }
    return supabase.auth.signUp({ email, password })
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Supabase is not configured' } }
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: { message: 'Supabase is not configured' } }
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/directory` },
    })
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const accountAgeDays = user?.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86_400_000)
    : null

  const value = {
    user,
    profile,
    loading,
    isFounder: profile?.role === 'founder',
    accountAgeDays,
    configured: isConfigured,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
