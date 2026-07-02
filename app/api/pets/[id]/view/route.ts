import { NextRequest, NextResponse, after } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const { data: pet } = await db.from("pets").select("views, seller_id, name, breed").eq("id", id).single()
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const newViews = (pet.views ?? 0) + 1
  await db.from("pets").update({ views: newViews }).eq("id", id)

  // Record per-buyer view history for "Because you viewed..." recommendations — best-effort, anonymous views still count above
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  let viewerId: string | null = null
  if (token) {
    const { user } = await verifyToken(token)
    if (user) {
      viewerId = user.id
      await db.from("pet_views").upsert(
        { user_id: user.id, pet_id: id, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,pet_id" }
      )
    }
  }

  // Notify seller on milestone view counts (every 10 views), not for own views
  if (pet.seller_id && viewerId !== pet.seller_id && newViews % 10 === 0) {
    after(() => db.from("notifications").insert({
      user_id: pet.seller_id,
      type: "listing_view",
      title: `${pet.name} reached ${newViews} views`,
      message: `Your listing for ${pet.name} (${pet.breed}) has been viewed ${newViews} times.`,
      data: { pet_id: id },
    }))
  }

  return NextResponse.json({ success: true })
}
