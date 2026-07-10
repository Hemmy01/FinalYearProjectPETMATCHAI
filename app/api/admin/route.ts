import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"
import { emailAccountStatus } from "@/lib/email"
import { paystackRefund } from "@/lib/paystack"

async function requireAdmin(token: string | null) {
  if (!token) return null
  const db = createAdminClient()
  const { user } = await verifyToken(token)
  if (!user) return null
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
  return profile?.role === "administrator" ? user : null
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  const admin = await requireAdmin(token ?? null)
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const sp = new URL(req.url).searchParams
  const type = sp.get("type")
  const db = createAdminClient()

  if (type === "auditLogs") {
    const from = sp.get("from")
    const to = sp.get("to")
    const action = sp.get("action")
    const userId = sp.get("userId")
    const hasFilter = !!(from || to || action || userId)

    let query = db
      .from("audit_logs")
      .select("*, user:profiles!audit_logs_user_id_fkey(id, name, email)")
      .order("created_at", { ascending: false })

    if (from) query = query.gte("created_at", `${from}T00:00:00`)
    if (to) query = query.lte("created_at", `${to}T23:59:59`)
    if (action) query = query.eq("action", action)
    if (userId) query = query.eq("user_id", userId)
    if (!hasFilter) query = query.limit(200)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  }

  if (type === "disputes") {
    const { data, error } = await db
      .from("disputes")
      .select("*, reporter:profiles!disputes_reporter_id_fkey(id, name, email), respondent:profiles!disputes_respondent_id_fkey(id, name, email)")
      .order("created_at", { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // For each dispute, attach any escrowed payment AND the underlying chat
    // thread, so the admin can open the conversation straight from the tab.
    const disputes = data ?? []
    const offerIds = disputes.map((d) => d.offer_id).filter(Boolean)

    // Escrow + offer→thread linking (only for offer-linked disputes).
    const offerById = new Map<string, { id: string; pet_id: string; buyer_id: string; seller_id: string }>()
    const byOffer: Record<string, { reference: string; amount: number; status: string }> = {}
    let offerThreads: { id: string; pet_id: string; buyer_id: string; seller_id: string }[] = []
    if (offerIds.length > 0) {
      const { data: offers } = await db
        .from("offers")
        .select("id, pet_id, buyer_id, seller_id")
        .in("id", offerIds)
      for (const o of offers ?? []) offerById.set(o.id, o)
      const petIds = [...new Set((offers ?? []).map((o) => o.pet_id).filter(Boolean))]

      const { data: txs } = await db
        .from("transactions")
        .select("offer_id, reference, amount, status")
        .in("offer_id", offerIds)
        .eq("status", "paid_escrow")
      for (const t of txs ?? []) byOffer[t.offer_id] = { reference: t.reference, amount: Number(t.amount), status: t.status }

      if (petIds.length > 0) {
        const { data: th } = await db.from("message_threads").select("id, pet_id, buyer_id, seller_id").in("pet_id", petIds)
        offerThreads = th ?? []
      }
    }

    // Fallback: link any dispute to the conversation between its two parties
    // (reporter/respondent, either direction) even when there is no offer.
    const partyIds = [...new Set(disputes.flatMap((d) => [d.reporter_id, d.respondent_id]).filter(Boolean))]
    let pairThreads: { id: string; buyer_id: string; seller_id: string }[] = []
    if (partyIds.length > 0) {
      const inList = `(${partyIds.join(",")})`
      const { data: pt } = await db
        .from("message_threads")
        .select("id, buyer_id, seller_id, last_message_at")
        .or(`buyer_id.in.${inList},seller_id.in.${inList}`)
        .order("last_message_at", { ascending: false })
      pairThreads = pt ?? []
    }

    for (const d of disputes) {
      d.escrow = d.offer_id ? byOffer[d.offer_id] ?? null : null
      const o = d.offer_id ? offerById.get(d.offer_id) : null
      let th: { id: string } | undefined =
        o ? offerThreads.find((t) => t.pet_id === o.pet_id && t.buyer_id === o.buyer_id && t.seller_id === o.seller_id) : undefined
      if (!th) {
        th = pairThreads.find((t) =>
          (t.buyer_id === d.reporter_id && t.seller_id === d.respondent_id) ||
          (t.buyer_id === d.respondent_id && t.seller_id === d.reporter_id))
      }
      d.thread_id = th?.id ?? null
    }
    return NextResponse.json({ data: disputes })
  }

  // Admin read-only view of a disputed conversation (admin isn't a participant,
  // so this is the only way for them to see the chat they're resolving).
  if (type === "disputeThread") {
    const threadId = sp.get("threadId")
    if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 })
    const { data: thread } = await db
      .from("message_threads")
      .select("id, pet:pets!message_threads_pet_id_fkey(name), buyer:profiles!message_threads_buyer_id_fkey(id, name), seller:profiles!message_threads_seller_id_fkey(id, name)")
      .eq("id", threadId)
      .single()
    const { data: messages } = await db
      .from("messages")
      .select("id, sender_id, content, created_at, message_type")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
    return NextResponse.json({ thread, messages: messages ?? [] })
  }

  if (type === "categories") {
    const { data: pets, error } = await db
      .from("pets")
      .select("species, breed")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const speciesMap: Record<string, number> = {}
    const breedMap: Record<string, { species: string; count: number }> = {}

    for (const p of pets ?? []) {
      if (p.species) speciesMap[p.species] = (speciesMap[p.species] ?? 0) + 1
      if (p.breed) {
        const key = p.breed
        if (!breedMap[key]) breedMap[key] = { species: p.species ?? "", count: 0 }
        breedMap[key].count++
      }
    }

    const species = Object.entries(speciesMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const breeds = Object.entries(breedMap)
      .map(([name, { species, count }]) => ({ name, species, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ data: { species, breeds } })
  }

  if (type === "aiStats") {
    const [matchesRes, prefsRes, topPetsRes, recentRes] = await Promise.all([
      db.from("ai_matches").select("score, buyer_id, pet_id"),
      db.from("buyer_preferences").select("user_id"),
      db.from("ai_matches").select("pet_id, score, pet:pets(name, breed, species)").order("score", { ascending: false }).limit(5),
      db.from("ai_matches").select("*, buyer:profiles!ai_matches_buyer_id_fkey(name), pet:pets(name, breed)").order("updated_at", { ascending: false }).limit(10),
    ])

    const matches = matchesRes.data ?? []
    const totalMatches = matches.length
    const avgScore = totalMatches > 0 ? Math.round(matches.reduce((s, m) => s + m.score, 0) / totalMatches) : 0
    const buyersWithCache = new Set(matches.map((m) => m.buyer_id)).size
    const buyersWithPrefs = (prefsRes.data ?? []).length

    return NextResponse.json({
      data: {
        totalMatches,
        avgScore,
        buyersWithCache,
        buyersWithPrefs,
        topPets: topPetsRes.data ?? [],
        recentMatches: recentRes.data ?? [],
      }
    })
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  const admin = await requireAdmin(token ?? null)
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const db = createAdminClient()

  if (body.type === "changeRole") {
    if (body.role === "administrator") return NextResponse.json({ error: "Admin role must be assigned via SQL" }, { status: 403 })
    const { data, error } = await db
      .from("profiles")
      .update({ role: body.role })
      .eq("id", body.userId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from("audit_logs").insert({
      user_id: admin.id,
      action: "change_user_role",
      entity_type: "profile",
      entity_id: body.userId,
      details: { new_role: body.role },
    })
    return NextResponse.json({ success: true, data })
  }

  // Suspend (reversible), permanently disable, or reactivate an account.
  // "suspendUser" is kept as an alias for backward compatibility.
  if (body.type === "suspendUser" || body.type === "setUserStatus") {
    const userId = body.userId as string
    const status = body.type === "suspendUser" ? "suspended" : (body.status as string)
    if (!userId || !["active", "suspended", "disabled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    if (userId === admin.id) {
      return NextResponse.json({ error: "You cannot change your own account status." }, { status: 400 })
    }
    // Protect other administrators from being locked out.
    const { data: target } = await db.from("profiles").select("role, email, name").eq("id", userId).single()
    if (target?.role === "administrator") {
      return NextResponse.json({ error: "Administrator accounts cannot be suspended." }, { status: 403 })
    }
    // Ban (or unban) at the Supabase Auth level so the account genuinely cannot
    // sign in or refresh its session. ~100 years ≈ permanent; "none" lifts it.
    const banDuration = status === "active" ? "none" : "876000h"
    const { error: banErr } = await db.auth.admin.updateUserById(userId, { ban_duration: banDuration })
    if (banErr) return NextResponse.json({ error: banErr.message }, { status: 500 })
    // Persist the moderation status on the profile.
    const { data, error } = await db
      .from("profiles")
      .update({ status })
      .eq("id", userId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Let the affected user know — in-app notification + email.
    const notice = {
      suspended: {
        title: "Your account has been suspended",
        message: "Your PetMatchAI account has been suspended and you can no longer sign in. If you believe this is a mistake, please contact support.",
      },
      disabled: {
        title: "Your account has been disabled",
        message: "Your PetMatchAI account has been permanently disabled following a violation of our community guidelines. You can no longer sign in.",
      },
      active: {
        title: "Your account has been reactivated",
        message: "Good news — your PetMatchAI account has been reactivated. You can sign in and use the platform again.",
      },
    }[status as "suspended" | "disabled" | "active"]
    await db.from("notifications").insert({
      user_id: userId,
      type: "system",
      title: notice.title,
      message: notice.message,
      data: { status, by: admin.id },
    })
    if (target?.email) {
      await emailAccountStatus(target.email, target.name ?? null, status as "suspended" | "disabled" | "active")
    }

    await db.from("audit_logs").insert({
      user_id: admin.id,
      action: status === "active" ? "reactivate_user" : status === "disabled" ? "disable_user" : "suspend_user",
      entity_type: "profile",
      entity_id: userId,
      details: { status },
    })
    return NextResponse.json({ success: true, data })
  }

  if (body.type === "removeListing") {
    const { error } = await db
      .from("pets")
      .update({ status: "rejected" })
      .eq("id", body.petId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from("audit_logs").insert({
      user_id: admin.id,
      action: "remove_listing",
      entity_type: "pet",
      entity_id: body.petId,
      details: {},
    })
    return NextResponse.json({ success: true })
  }

  if (body.type === "resolveDispute") {
    const { disputeId, resolution } = body
    // Admin can settle the escrow either way. `outcome` is the new field;
    // the legacy `refund: true` boolean still maps to a buyer refund.
    const outcome: "refund_buyer" | "release_seller" | "none" =
      body.outcome ?? (body.refund ? "refund_buyer" : "none")
    if (!disputeId || !resolution) return NextResponse.json({ error: "disputeId and resolution required" }, { status: 400 })

    // Settle the escrowed payment tied to this dispute's offer, in the admin's
    // chosen direction — a real intervention for whichever party is in the right.
    let settlement: "refunded" | "released" | null = null
    if (outcome !== "none") {
      const { data: dispute } = await db.from("disputes").select("offer_id").eq("id", disputeId).single()
      if (dispute?.offer_id) {
        const { data: tx } = await db.from("transactions").select("*")
          .eq("offer_id", dispute.offer_id).eq("status", "paid_escrow").maybeSingle()
        if (tx) {
          if (outcome === "refund_buyer") {
            // Reverse the charge at the gateway before recording the refund.
            if (tx.provider === "paystack") {
              const ok = await paystackRefund(tx.reference)
              if (!ok) return NextResponse.json({ error: "Gateway refund could not be initiated. Please try again." }, { status: 502 })
            }
            await db.from("transactions").update({ status: "refunded", updated_at: new Date().toISOString() }).eq("id", tx.id)
            await db.from("pets").update({ status: "active" }).eq("id", tx.pet_id)
            await db.from("notifications").insert([
              { user_id: tx.buyer_id, type: "system", title: "Payment refunded", message: `Following a dispute, your escrow payment of ₦${Number(tx.amount).toLocaleString()} has been refunded.`, data: { transaction_id: tx.id, dispute_id: disputeId } },
              { user_id: tx.seller_id, type: "system", title: "Escrow refunded", message: `An escrowed payment of ₦${Number(tx.amount).toLocaleString()} was refunded to the buyer following a dispute.`, data: { transaction_id: tx.id, dispute_id: disputeId } },
            ])
            settlement = "refunded"
          } else if (outcome === "release_seller") {
            await db.from("transactions").update({ status: "released", released_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", tx.id)
            await db.from("pets").update({ status: "sold" }).eq("id", tx.pet_id)
            await db.from("notifications").insert([
              { user_id: tx.seller_id, type: "system", title: "Funds released — sale complete ✅", message: `A dispute was resolved in your favour. ₦${Number(tx.amount).toLocaleString()} has been released to you.`, data: { transaction_id: tx.id, dispute_id: disputeId } },
              { user_id: tx.buyer_id, type: "system", title: "Dispute resolved", message: `The dispute was resolved and the escrowed ₦${Number(tx.amount).toLocaleString()} was released to the seller.`, data: { transaction_id: tx.id, dispute_id: disputeId } },
            ])
            settlement = "released"
          }
        }
      }
    }

    // Return the related chat thread to normal and post the ruling INTO the chat,
    // so both parties see the admin's decision where the conflict happened.
    // Prefer the offer-linked thread; fall back to the reporter/respondent chat.
    {
      const { data: d2 } = await db.from("disputes").select("offer_id, reporter_id, respondent_id").eq("id", disputeId).single()
      let threadId: string | null = null
      if (d2?.offer_id) {
        const { data: offer } = await db.from("offers").select("pet_id, buyer_id, seller_id").eq("id", d2.offer_id).single()
        if (offer) {
          const { data: t } = await db.from("message_threads").select("id")
            .eq("pet_id", offer.pet_id).eq("buyer_id", offer.buyer_id).eq("seller_id", offer.seller_id)
            .maybeSingle()
          threadId = t?.id ?? null
        }
      }
      if (!threadId && d2?.reporter_id && d2?.respondent_id) {
        const { data: t } = await db.from("message_threads").select("id")
          .or(`and(buyer_id.eq.${d2.reporter_id},seller_id.eq.${d2.respondent_id}),and(buyer_id.eq.${d2.respondent_id},seller_id.eq.${d2.reporter_id})`)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        threadId = t?.id ?? null
      }
      if (threadId) {
        await db.from("message_threads").update({ dispute_status: "resolved" }).eq("id", threadId)
        const settlementLine = settlement === "refunded"
          ? "\n\nOutcome: the escrowed payment has been refunded to the buyer."
          : settlement === "released"
          ? "\n\nOutcome: the escrowed payment has been released to the seller."
          : ""
        const decision = `${resolution}${settlementLine}`
        await db.from("messages").insert({
          thread_id: threadId,
          sender_id: admin.id,
          content: decision,
          message_type: "admin_decision",
        })
        await db.from("message_threads")
          .update({ last_message: "🛡️ Admin decision", last_message_at: new Date().toISOString() })
          .eq("id", threadId)
      }
    }

    const { error } = await db
      .from("disputes")
      .update({
        status: "resolved",
        resolution,
        resolved_by: admin.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from("audit_logs").insert({
      user_id: admin.id,
      action: "resolve_dispute",
      entity_type: "dispute",
      entity_id: disputeId,
      details: { resolution: resolution.slice(0, 200), outcome, settlement },
    })
    return NextResponse.json({ success: true, settlement, refunded: settlement === "refunded" })
  }

  // Admin posts an instruction into a disputed conversation. The admin is not a
  // thread participant, so this goes through the service-role client here.
  if (body.type === "disputeMessage") {
    const { threadId, content } = body
    if (!threadId || !content?.trim()) {
      return NextResponse.json({ error: "threadId and content required" }, { status: 400 })
    }
    const { data: thread } = await db.from("message_threads")
      .select("id, buyer_id, seller_id, pet:pets!message_threads_pet_id_fkey(name)")
      .eq("id", threadId)
      .single()
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 })

    const { data: message, error: msgErr } = await db.from("messages")
      .insert({ thread_id: threadId, sender_id: admin.id, content: content.trim(), message_type: "admin_note" })
      .select("id, sender_id, content, created_at, message_type")
      .single()
    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

    await db.from("message_threads")
      .update({ last_message: "🛡️ Admin: " + content.trim().slice(0, 60), last_message_at: new Date().toISOString() })
      .eq("id", threadId)

    const petName = (thread.pet as { name?: string } | null)?.name ?? "your transaction"
    await db.from("notifications").insert(
      [thread.buyer_id, thread.seller_id].map((uid) => ({
        user_id: uid,
        type: "message",
        title: "Message from PetMatch Admin",
        message: `An admin has posted in your dispute about ${petName}: ${content.trim().slice(0, 80)}`,
        data: { thread_id: threadId },
      }))
    )

    return NextResponse.json({ success: true, data: message })
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  const admin = await requireAdmin(token ?? null)
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const db = createAdminClient()

  if (body.type === "dispute") {
    const { reporterId, respondentId, subject, description, context } = body
    if (!reporterId || !subject) return NextResponse.json({ error: "reporterId and subject required" }, { status: 400 })
    const { data, error } = await db.from("disputes").insert({
      reporter_id: reporterId,
      respondent_id: respondentId ?? null,
      subject,
      description: description ?? null,
      context: context ?? null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  }

  if (body.type === "report") {
    const { reportedUserId, reason, context } = body
    if (!reportedUserId || !reason) return NextResponse.json({ error: "reportedUserId and reason required" }, { status: 400 })

    const { data: admins } = await db.from("profiles").select("id").eq("role", "administrator")
    if (admins && admins.length > 0) {
      await db.from("notifications").insert(
        admins.map((a: { id: string }) => ({
          user_id: a.id,
          type: "system",
          title: "User Report",
          message: `A user was reported. Reason: ${reason}`,
          data: { reported_user_id: reportedUserId, reason, context: context ?? "" },
        }))
      )
    }

    void db.from("audit_logs").insert({
      user_id: admin.id,
      action: "report_user",
      entity_type: "profile",
      entity_id: reportedUserId,
      details: { reason, context: context ?? "" },
    })

    return NextResponse.json({ success: true })
  }

  if (body.type === "announcement") {
    const message = (body.message ?? "").trim()
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })

    const { data: profiles, error } = await db.from("profiles").select("id")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const notifications = (profiles ?? []).map((p: { id: string }) => ({
      user_id: p.id,
      type: "system",
      title: "Platform Announcement",
      message,
      data: { sent_by: admin.id },
    }))

    if (notifications.length > 0) {
      const { error: ne } = await db.from("notifications").insert(notifications)
      if (ne) return NextResponse.json({ error: ne.message }, { status: 500 })
    }

    void db.from("audit_logs").insert({
      user_id: admin.id,
      action: "send_announcement",
      entity_type: "notification",
      details: { recipient_count: notifications.length, preview: message.slice(0, 100) },
    })

    return NextResponse.json({ success: true, sent: notifications.length })
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  const admin = await requireAdmin(token ?? null)
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const type = new URL(req.url).searchParams.get("type")
  const db = createAdminClient()

  if (type === "aiCache") {
    const { error } = await db.from("ai_matches").delete().neq("buyer_id", "00000000-0000-0000-0000-000000000000")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    void db.from("audit_logs").insert({
      user_id: admin.id,
      action: "flush_ai_cache",
      entity_type: "ai_matches",
      details: {},
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 })
}
