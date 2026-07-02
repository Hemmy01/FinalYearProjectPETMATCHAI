import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email")
  if (!email) return NextResponse.json({ locked: false, attempts: 0 })

  const db = createAdminClient()
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString()

  const { count } = await db
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email.toLowerCase())
    .eq("succeeded", false)
    .gte("created_at", windowStart)

  const attempts = count ?? 0
  const locked = attempts >= MAX_ATTEMPTS

  // Compute unlock time from oldest failed attempt in the window
  let unlockAt: string | null = null
  if (locked) {
    const { data: oldest } = await db
      .from("login_attempts")
      .select("created_at")
      .eq("email", email.toLowerCase())
      .eq("succeeded", false)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: true })
      .limit(1)
      .single()
    if (oldest) {
      unlockAt = new Date(new Date(oldest.created_at).getTime() + WINDOW_MS).toISOString()
    }
  }

  return NextResponse.json({ locked, attempts, max: MAX_ATTEMPTS, unlockAt })
}

export async function POST(req: NextRequest) {
  const { email, succeeded } = await req.json()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  const db = createAdminClient()
  await db.from("login_attempts").insert({ email: email.toLowerCase(), succeeded: !!succeeded })

  return NextResponse.json({ success: true })
}
