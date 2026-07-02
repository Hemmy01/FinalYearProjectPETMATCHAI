import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const { reviewId } = await req.json()
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token || !reviewId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Toggle: insert or delete
  const { data: existing } = await db
    .from("review_helpful_votes")
    .select("id")
    .eq("review_id", reviewId)
    .eq("user_id", user.id)
    .maybeSingle()

  // Verify review exists
  const { data: reviewExists } = await db.from("reviews").select("id").eq("id", reviewId).maybeSingle()
  if (!reviewExists) return NextResponse.json({ error: "Review not found" }, { status: 404 })

  let delta = 0
  if (existing) {
    await db.from("review_helpful_votes").delete().eq("id", existing.id)
    delta = -1
  } else {
    await db.from("review_helpful_votes").insert({ review_id: reviewId, user_id: user.id })
    delta = 1
  }

  // Update cached count on reviews table
  const { data: review } = await db.from("reviews").select("helpful_count").eq("id", reviewId).single()
  const newCount = Math.max(0, (review?.helpful_count ?? 0) + delta)
  await db.from("reviews").update({ helpful_count: newCount }).eq("id", reviewId)

  return NextResponse.json({ success: true, voted: delta > 0, helpfulCount: newCount })
}
