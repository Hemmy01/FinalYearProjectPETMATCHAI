import { NextRequest, NextResponse, after } from "next/server"
import { z } from "zod"
import { createAdminClient, verifyToken } from "@/lib/supabase"

const EXPIRY_DAYS = 30
const expiryDate = () => new Date(Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

const WantAdSchema = z.object({
  title: z.string().min(3).max(120),
  species: z.string().optional().nullable(),
  breeds: z.array(z.string()).max(5).optional(),
  budgetMax: z.number().positive().max(100_000_000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const db = createAdminClient()
  const { searchParams } = new URL(req.url)
  const sellerId = searchParams.get("sellerId")
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")

  // All want-ad access requires authentication
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Seller dashboard view: want_ads filtered to match their active listings
  if (sellerId) {
    if (user.id !== sellerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: sellerPets } = await db
      .from("pets")
      .select("species, price")
      .eq("seller_id", sellerId)
      .eq("status", "active")

    if (!sellerPets || sellerPets.length === 0) return NextResponse.json({ data: [] })

    const species = [...new Set(sellerPets.map((p) => p.species).filter(Boolean))]
    const minPrice = Math.min(...sellerPets.map((p) => Number(p.price)))

    let query = db
      .from("want_ads")
      .select("*, buyer:profiles!want_ads_buyer_id_fkey(id, name, avatar_url, location)")
      .eq("is_active", true)
      .gte("budget_max", minPrice)
      .gte("created_at", expiryDate())   // only show non-expired ads
      .order("created_at", { ascending: false })
      .limit(20)

    if (species.length > 0) query = query.in("species", species)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  }

  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
  const isSeller = profile?.role === "seller" || profile?.role === "administrator"

  if (isSeller) {
    // Sellers browse ALL active, non-expired want-ads
    const { data, error } = await db
      .from("want_ads")
      .select("*, buyer:profiles!want_ads_buyer_id_fkey(id, name, location)")
      .eq("is_active", true)
      .gte("created_at", expiryDate())   // 30-day expiry
      .order("created_at", { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  }

  // Buyer: return ALL their own want-ads (including expired, so they can manage them)
  const { data, error } = await db
    .from("want_ads")
    .select("*")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await req.json()
  const parsed = WantAdSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = parsed.data

  const db = createAdminClient()
  const { data, error } = await db.from("want_ads").insert({
    buyer_id: user.id,
    title: body.title,
    species: body.species ?? null,
    breeds: body.breeds ?? [],
    budget_max: body.budgetMax ?? null,
    location: body.location ?? null,
    description: body.description ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify matching sellers (fire-and-forget after response)
  after(async () => {
    let petQuery = db
      .from("pets")
      .select("seller_id")
      .eq("status", "active")
      .neq("seller_id", user.id)

    if (body.species) petQuery = petQuery.eq("species", body.species)
    if (body.budgetMax) petQuery = petQuery.lte("price", body.budgetMax)

    const { data: matchingPets } = await petQuery
    if (!matchingPets?.length) return

    const sellerIds = [...new Set(matchingPets.map((p: { seller_id: string }) => p.seller_id).filter(Boolean))]
    if (!sellerIds.length) return

    await db.from("notifications").insert(
      sellerIds.map((sellerId) => ({
        user_id: sellerId,
        type: "match",
        title: "New buyer request",
        message: `A buyer is looking for ${body.species ? `a ${body.species}` : "a pet"}: "${body.title}"${body.budgetMax ? ` — budget up to ₦${Number(body.budgetMax).toLocaleString()}` : ""}`,
        data: { want_ad_id: data.id },
      }))
    )
  })

  return NextResponse.json({ success: true, data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.isActive !== undefined) updates.is_active = body.isActive
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.budgetMax !== undefined) updates.budget_max = body.budgetMax

  const { data, error } = await db
    .from("want_ads")
    .update(updates)
    .eq("id", body.id)
    .eq("buyer_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db.from("want_ads").delete().eq("id", id).eq("buyer_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
