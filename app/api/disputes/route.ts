import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { respondentId, subject, description, context, offerId } = body

  if (!respondentId || !subject?.trim()) {
    return NextResponse.json({ error: "respondentId and subject are required" }, { status: 400 })
  }

  const { data, error } = await db.from("disputes").insert({
    reporter_id: user.id,
    respondent_id: respondentId,
    subject: subject.trim(),
    description: description?.trim() ?? null,
    context: context?.trim() ?? null,
    offer_id: offerId ?? null,
    status: "pending",
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Look up the disputed offer so we can name the pet and move the related chat
  // into the "under review" state that the inbox groups separately.
  let petName = "your transaction"
  if (offerId) {
    const { data: offer } = await db
      .from("offers")
      .select("pet_id, buyer_id, seller_id, pet:pets!offers_pet_id_fkey(name)")
      .eq("id", offerId)
      .single()
    if (offer) {
      petName = (offer.pet as { name?: string } | null)?.name ?? petName
      await db.from("message_threads")
        .update({ dispute_status: "open" })
        .eq("pet_id", offer.pet_id)
        .eq("buyer_id", offer.buyer_id)
        .eq("seller_id", offer.seller_id)
    }
  }

  // Notify BOTH parties: the filer gets a confirmation, the other party is alerted.
  await db.from("notifications").insert([
    {
      user_id: user.id,
      type: "system",
      title: "Dispute submitted",
      message: `Your dispute about ${petName} has been submitted. An admin will review and resolve it.`,
      data: { dispute_id: data.id, offer_id: offerId ?? null },
    },
    {
      user_id: respondentId,
      type: "system",
      title: "A dispute was filed",
      message: `A dispute has been filed regarding ${petName}. Our team has been notified and will help resolve it.`,
      data: { dispute_id: data.id, offer_id: offerId ?? null },
    },
  ])

  // Notify all admins
  const { data: admins } = await db.from("profiles").select("id").eq("role", "administrator")
  if (admins && admins.length > 0) {
    await db.from("notifications").insert(
      admins.map((a: { id: string }) => ({
        user_id: a.id,
        type: "system",
        title: "New Dispute Filed",
        message: `A user has filed a dispute: "${subject.trim().slice(0, 60)}"`,
        data: { dispute_id: data.id },
      }))
    )
  }

  // Log to audit trail
  void db.from("audit_logs").insert({
    user_id: user.id,
    action: "file_dispute",
    entity_type: "dispute",
    entity_id: data.id,
    details: { subject: subject.trim(), respondent_id: respondentId },
  })

  return NextResponse.json({ success: true, data })
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db
    .from("disputes")
    .select("*, respondent:profiles!disputes_respondent_id_fkey(id, name)")
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
