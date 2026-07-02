import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db
    .from("buyer_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? null })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db.from("buyer_preferences").upsert({
    user_id: user.id,
    preferred_species: body.preferred_species ?? [],
    preferred_breeds: body.preferred_breeds ?? [],
    age_min: body.age_min ?? 0,
    age_max: body.age_max ?? 120,
    budget_min: body.budget_min ?? 0,
    budget_max: body.budget_max ?? 999999,
    preferred_location: body.preferred_location ?? "",
    preferred_gender: body.preferred_gender ?? "any",
    purpose: body.purpose ?? "companionship",
    health_requirements: body.health_requirements ?? [],
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Preferences changed — wipe only auto-computed scores (no user feedback, not yet accepted/declined)
  // so the next matchmaking call re-scores with the new preferences.
  // Preserves: explicit feedback (interested/not_interested) and accepted/declined decisions.
  await db.from("ai_matches")
    .delete()
    .eq("buyer_id", user.id)
    .is("feedback", null)
    .or("match_status.is.null,match_status.eq.pending")

  return NextResponse.json({ success: true, data })
}

