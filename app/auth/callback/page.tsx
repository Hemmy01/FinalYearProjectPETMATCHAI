"use client"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Suspense } from "react"

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // next= is set for flows that route through this callback intentionally (e.g. OAuth).
    // Password reset goes directly to /auth/reset-password and never comes here.
    const next = searchParams.get("next") ?? "/dashboard"

    // New OAuth users have no role yet — route them to pick buyer/seller first.
    async function routeAfterAuth(userId: string) {
      const { data } = await supabase.from("profiles").select("onboarded").eq("id", userId).single()
      // onboarded === false → social signup that hasn't chosen a role.
      // null/undefined (column missing) → treat as onboarded, go to next.
      router.replace(data?.onboarded === false ? "/auth/select-role" : next)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If a password recovery token lands here for any reason, send to the reset form
      if (event === "PASSWORD_RECOVERY") {
        subscription.unsubscribe()
        router.replace("/auth/reset-password")
        return
      }
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe()
        routeAfterAuth(session.user.id)
      }
    })

    // Fallback: if the session was already established before this component mounted
    // (Supabase exchanged the OAuth code before React hydrated), check now.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        routeAfterAuth(session.user.id)
      }
    })

    const fallback = setTimeout(() => router.replace("/auth/login"), 5000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
  }, [router, searchParams])

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-4 text-gray-500">
      <Loader2 size={32} className="animate-spin text-indigo-600" />
      <p className="text-sm font-medium">Completing sign in…</p>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-4 text-gray-500">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Completing sign in…</p>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}
