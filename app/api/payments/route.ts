import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"
import { paystackEnabled, paystackInitialize, paystackVerify } from "@/lib/paystack"

// GET /api/payments?offerId=...  → the transaction for that offer (participant only)
export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const db = createAdminClient()

  // Admin: list all transactions for the Payments tab.
  if (sp.get("admin") === "true") {
    const { data: me } = await db.from("profiles").select("role").eq("id", user.id).single()
    if (me?.role !== "administrator") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { data, error } = await db
      .from("transactions")
      .select("*, buyer:profiles!transactions_buyer_id_fkey(name, email), seller:profiles!transactions_seller_id_fkey(name, email), pet:pets!transactions_pet_id_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  }

  const offerId = sp.get("offerId")
  if (!offerId) return NextResponse.json({ error: "offerId required" }, { status: 400 })

  const { data } = await db
    .from("transactions")
    .select("*")
    .eq("offer_id", offerId)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ data: data ?? null })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()

  // ─── Initialize a payment for an accepted offer (buyer) ───────────────
  if (body.type === "initialize") {
    const { data: offer } = await db
      .from("offers")
      .select("*, pet:pets!offers_pet_id_fkey(id, name), buyer:profiles!offers_buyer_id_fkey(email)")
      .eq("id", body.offerId)
      .single()
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 })
    if (offer.buyer_id !== user.id) return NextResponse.json({ error: "Only the buyer can pay for this offer." }, { status: 403 })
    if (offer.status !== "accepted") return NextResponse.json({ error: "This offer is not accepted yet." }, { status: 400 })

    // Don't allow a second payment once one is already in escrow / released.
    const { data: existing } = await db.from("transactions").select("*").eq("offer_id", offer.id)
      .in("status", ["paid_escrow", "released"]).maybeSingle()
    if (existing) return NextResponse.json({ data: existing, mode: existing.provider, alreadyPaid: true })

    const amount = Number(offer.counter_amount ?? offer.amount)
    const reference = `pmx-${crypto.randomUUID()}`
    const provider = paystackEnabled ? "paystack" : "demo"

    const { error } = await db.from("transactions").insert({
      offer_id: offer.id,
      pet_id: offer.pet_id,
      buyer_id: offer.buyer_id,
      seller_id: offer.seller_id,
      amount,
      provider,
      reference,
      status: "pending",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (provider === "paystack") {
      try {
        const email = (offer.buyer as { email?: string } | null)?.email ?? "buyer@petmatchai.app"
        const origin = new URL(req.url).origin
        const { authorizationUrl } = await paystackInitialize({
          email,
          amountKobo: Math.round(amount * 100),
          reference,
          callbackUrl: `${origin}/offers?pay_ref=${reference}`,
        })
        return NextResponse.json({ mode: "paystack", reference, amount, authorization_url: authorizationUrl })
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Payment init failed" }, { status: 502 })
      }
    }
    return NextResponse.json({ mode: "demo", reference, amount })
  }

  // ─── Verify / confirm payment → move funds into escrow ────────────────
  if (body.type === "verify") {
    const { data: tx } = await db.from("transactions").select("*").eq("reference", body.reference).single()
    if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    if (tx.buyer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (tx.status === "paid_escrow" || tx.status === "released") return NextResponse.json({ data: tx })

    if (tx.provider === "paystack") {
      const ok = await paystackVerify(tx.reference)
      if (!ok) return NextResponse.json({ error: "Payment not confirmed. Please try again." }, { status: 402 })
    }

    const { data: updated, error } = await db.from("transactions")
      .update({ status: "paid_escrow", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", tx.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Reserve the pet and let the seller know the money is safely held.
    await db.from("pets").update({ status: "pending" }).eq("id", tx.pet_id)
    await db.from("notifications").insert({
      user_id: tx.seller_id,
      type: "system",
      title: "Payment received — held in escrow 🔒",
      message: `A buyer has paid ₦${Number(tx.amount).toLocaleString()} into escrow. Funds are released to you once the buyer confirms handover.`,
      data: { transaction_id: tx.id, reference: tx.reference },
    })
    return NextResponse.json({ data: updated })
  }

  // ─── Release escrow (buyer confirms handover) → complete sale ─────────
  if (body.type === "release") {
    const { data: tx } = await db.from("transactions").select("*").eq("reference", body.reference).single()
    if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    if (tx.buyer_id !== user.id) return NextResponse.json({ error: "Only the buyer can confirm handover." }, { status: 403 })
    if (tx.status !== "paid_escrow") return NextResponse.json({ error: "This payment is not in escrow." }, { status: 400 })

    const { data: updated, error } = await db.from("transactions")
      .update({ status: "released", released_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", tx.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from("pets").update({ status: "sold" }).eq("id", tx.pet_id)
    await db.from("notifications").insert({
      user_id: tx.seller_id,
      type: "system",
      title: "Funds released — sale complete ✅",
      message: `The buyer confirmed handover. ₦${Number(tx.amount).toLocaleString()} has been released to you.`,
      data: { transaction_id: tx.id, reference: tx.reference },
    })
    return NextResponse.json({ data: updated })
  }

  // ─── Refund (admin only — e.g. after a dispute) ──────────────────────
  if (body.type === "refund") {
    const { data: me } = await db.from("profiles").select("role").eq("id", user.id).single()
    if (me?.role !== "administrator") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data: tx } = await db.from("transactions").select("*").eq("reference", body.reference).single()
    if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    if (tx.status !== "paid_escrow") return NextResponse.json({ error: "Only escrowed payments can be refunded." }, { status: 400 })

    const { data: updated, error } = await db.from("transactions")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", tx.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from("pets").update({ status: "active" }).eq("id", tx.pet_id)
    await db.from("notifications").insert([
      { user_id: tx.buyer_id, type: "system", title: "Payment refunded", message: `Your escrow payment of ₦${Number(tx.amount).toLocaleString()} has been refunded.`, data: { transaction_id: tx.id } },
      { user_id: tx.seller_id, type: "system", title: "Escrow refunded", message: `An escrowed payment of ₦${Number(tx.amount).toLocaleString()} was refunded to the buyer.`, data: { transaction_id: tx.id } },
    ])
    return NextResponse.json({ data: updated })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
