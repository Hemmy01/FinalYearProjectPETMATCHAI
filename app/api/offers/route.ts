import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient, verifyToken } from "@/lib/supabase"
import { emailNewOffer, emailOfferAccepted } from "@/lib/email"
import { smsNewOffer, smsOfferAccepted } from "@/lib/sms"
import { sendPushToUser } from "@/lib/push"

const OfferSchema = z.object({
  petId: z.string().uuid(),
  amount: z.number().positive().max(100_000_000),
  note: z.string().max(500).optional().nullable(),
})

const OfferPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["accepted", "rejected", "countered"]),
  counterAmount: z.number().positive().optional(),
})

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const petId = new URL(req.url).searchParams.get("petId")
  const db = createAdminClient()

  let query = db.from("offers").select(`
    *,
    buyer:profiles!offers_buyer_id_fkey(id, name),
    seller:profiles!offers_seller_id_fkey(id, name),
    pet:pets!offers_pet_id_fkey(id, name, price)
  `).or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false })

  if (petId) query = query.eq("pet_id", petId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const raw = await req.json()
  const parsed = OfferSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = parsed.data

  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()

  // Get seller from pet (include seller contact details for notifications)
  const { data: pet } = await db
    .from("pets")
    .select("seller_id, name, price, seller:profiles!pets_seller_id_fkey(email, phone, name, notification_prefs)")
    .eq("id", body.petId)
    .single()
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 })

  // A seller can't make an offer on their own listing.
  if (pet.seller_id === user.id) {
    return NextResponse.json({ error: "You can't make an offer on your own listing." }, { status: 400 })
  }

  // Get buyer name
  const { data: buyer } = await db.from("profiles").select("name").eq("id", user.id).single()

  const { data, error } = await db.from("offers").insert({
    pet_id: body.petId,
    buyer_id: user.id,
    seller_id: pet.seller_id,
    amount: Number(body.amount),
    note: body.note ?? null,
    status: "pending",
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify and email seller
  void db.from("notifications").insert({
    user_id: pet.seller_id,
    type: "offer",
    title: "New offer received",
    message: `You received an offer of ₦${Number(body.amount).toLocaleString()} on your listing.`,
    data: { offer_id: data.id, pet_id: body.petId },
  })

  void sendPushToUser(pet.seller_id, {
    title: "New offer received",
    body: `${buyer?.name ?? "A buyer"} offered ₦${Number(body.amount).toLocaleString()} for ${pet.name ?? "your pet"}.`,
    url: `/offers`,
  })

  const seller = pet.seller as { email?: string; phone?: string; notification_prefs?: Record<string, boolean> } | null
  if (seller?.email && seller.notification_prefs?.channel_email !== false) {
    void emailNewOffer(seller.email, buyer?.name ?? "A buyer", pet.name ?? "your pet", Number(body.amount))
  }
  if (seller?.phone && seller.notification_prefs?.channel_sms === true) {
    void smsNewOffer(seller.phone, buyer?.name ?? "A buyer", pet.name ?? "your pet", Number(body.amount))
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const raw = await req.json()
  const parsed = OfferPatchSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = parsed.data

  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()

  const { data, error } = await db
    .from("offers")
    .update({
      status: body.status,
      counter_amount: body.counterAmount ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .select("*, buyer:profiles!offers_buyer_id_fkey(email, phone, name, notification_prefs), pet:pets!offers_pet_id_fkey(name)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify + email/SMS buyer when offer is accepted
  if (body.status === "accepted" && data) {
    const buyer2 = data.buyer as { email?: string; phone?: string; notification_prefs?: Record<string, boolean> } | null
    const petName = (data.pet as { name?: string } | null)?.name ?? "a pet"
    void db.from("notifications").insert({
      user_id: data.buyer_id,
      type: "offer",
      title: "Offer accepted! 🎉",
      message: `Your offer of ₦${Number(data.amount).toLocaleString()} for ${petName} was accepted.`,
      data: { offer_id: data.id },
    })
    if (buyer2?.email && buyer2.notification_prefs?.channel_email !== false) {
      void emailOfferAccepted(buyer2.email, petName, Number(data.amount))
    }
    if (buyer2?.phone && buyer2.notification_prefs?.channel_sms === true) {
      void smsOfferAccepted(buyer2.phone, petName, Number(data.amount))
    }
    void sendPushToUser(data.buyer_id, {
      title: "Offer accepted!",
      body: `Your offer of ₦${Number(data.amount).toLocaleString()} for ${petName} was accepted.`,
      url: `/offers`,
    })
  }

  return NextResponse.json({ success: true, data })
}
