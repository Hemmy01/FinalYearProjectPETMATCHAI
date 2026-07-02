import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

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
    return NextResponse.json({ data: data ?? [] })
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

  if (body.type === "suspendUser") {
    const { data, error } = await db
      .from("profiles")
      .update({ is_verified: false })
      .eq("id", body.userId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from("audit_logs").insert({
      user_id: admin.id,
      action: "suspend_user",
      entity_type: "profile",
      entity_id: body.userId,
      details: {},
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
    if (!disputeId || !resolution) return NextResponse.json({ error: "disputeId and resolution required" }, { status: 400 })
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
      details: { resolution: resolution.slice(0, 200) },
    })
    return NextResponse.json({ success: true })
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
