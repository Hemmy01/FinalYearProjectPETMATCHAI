"use client"
import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { Session } from "@supabase/supabase-js"
import { supabase } from "./supabase"

export type Role = "buyer" | "seller" | "administrator"

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  phone?: string
  location?: string
  avatar_url?: string
  is_verified?: boolean
  onboarded?: boolean
}

interface AuthCtx {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  loginWithGoogle: () => Promise<{ error?: string }>
  register: (email: string, password: string, name: string, role: Role) => Promise<{ error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  login: async () => ({}),
  loginWithGoogle: async () => ({}),
  register: async () => ({}),
  logout: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
    if (data) {
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role as Role,
        phone: data.phone ?? undefined,
        location: data.location ?? undefined,
        avatar_url: data.avatar_url ?? undefined,
        is_verified: data.is_verified,
        // If the column doesn't exist yet (migration not run), treat as onboarded
        // so existing email/password users are never forced into role selection.
        onboarded: data.onboarded ?? true,
      })
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setLoading(true)
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    // Check lockout before attempting Supabase auth
    try {
      const lockRes = await fetch(`/api/auth/lockout?email=${encodeURIComponent(email)}`)
      const lock = await lockRes.json()
      if (lock.locked) {
        const unlockTime = lock.unlockAt ? new Date(lock.unlockAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "15 minutes"
        return { error: `Account temporarily locked after too many failed attempts. Try again after ${unlockTime}.` }
      }
    } catch {
      // Network error on lockout check — proceed anyway
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    // Record the attempt result for lockout tracking
    fetch("/api/auth/lockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, succeeded: !error }),
    }).catch(() => {})

    if (error) return { error: error.message }
    return {}
  }

  function oauthError(error: { message: string }) {
    const msg = error.message.toLowerCase()
    if (msg.includes("provider is not enabled") || msg.includes("unsupported provider") || msg.includes("validation_failed")) {
      return { error: "This sign-in method is not yet enabled. Please use email and password instead." }
    }
    return { error: error.message }
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    })
    return error ? oauthError(error) : {}
  }

  async function register(email: string, password: string, name: string, role: Role) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes("already registered") || msg.includes("already in use") || msg.includes("already exists")) {
        return { error: "An account with this email already exists. Please sign in instead." }
      }
      return { error: error.message }
    }
    // Supabase in email-confirm mode returns an empty identities array for duplicate emails
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      return { error: "An account with this email already exists. Please sign in instead." }
    }
    return {}
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  async function refreshUser() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) await loadProfile(u.id)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, login, loginWithGoogle, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
