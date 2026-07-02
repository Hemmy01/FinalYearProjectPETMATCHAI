import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient, verifyToken } from "@/lib/supabase"

const ReviewSchema = z.object({
  sellerId: z.string().uuid(),
  petId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5).optional().nullable(),
  healthRating: z.number().int().min(1).max(5).optional().nullable(),
  accuracyRating: z.number().int().min(1).max(5).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  photoUrls: z.array(z.string().url()).max(3).optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sellerId = searchParams.get("sellerId")
  const petId = searchParams.get("petId")
  const reviewerId = searchParams.get("reviewerId")
  const adminAll = searchParams.get("adminAll") === "true"

  const db = createAdminClient()
  let query = db.from("reviews").select(`
    *,
    reviewer:profiles!reviews_reviewer_id_fkey(id, name, avatar_url),
    seller:profiles!reviews_seller_id_fkey(id, name)
  `).order("created_at", { ascending: false })

  if (sellerId) query = query.eq("seller_id", sellerId)
  else if (petId) query = query.eq("pet_id", petId)
  else if (reviewerId) query = query.eq("reviewer_id", reviewerId)
  else if (!adminAll) query = query.limit(50)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const raw = await req.json()
  const parsed = ReviewSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = parsed.data

  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Auto-verify if reviewer has an accepted offer for this seller/pet
  const { data: acceptedOffer } = await db
    .from("offers")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("seller_id", body.sellerId)
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle()

  const isVerified = !!acceptedOffer

  const { data, error } = await db.from("reviews").insert({
    reviewer_id: user.id,
    seller_id: body.sellerId,
    pet_id: body.petId ?? null,
    rating: body.rating,
    communication_rating: body.communicationRating ?? null,
    accuracy_rating: body.accuracyRating ?? null,
    health_rating: body.healthRating ?? null,
    comment: body.comment ?? null,
    photo_urls: body.photoUrls ?? [],
    is_verified: isVerified,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data, isVerified }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, sellerReply } = body
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token || !id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Only the seller for this review can reply
  const { data: review } = await db.from("reviews").select("seller_id").eq("id", id).single()
  if (!review || review.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await db
    .from("reviews")
    .update({ seller_reply: sellerReply, seller_reply_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token || !id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "administrator") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const { error } = await db.from("reviews").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
