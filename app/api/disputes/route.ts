import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { respondentId, subject, description, context } = body

  if (!respondentId || !subject?.trim()) {
    return NextResponse.json({ error: "respondentId and subject are required" }, { status: 400 })
  }

  const { data, error } = await db.from("disputes").insert({
    reporter_id: user.id,
    respondent_id: respondentId,
    subject: subject.trim(),
    description: description?.trim() ?? null,
    context: context?.trim() ?? null,
    status: "pending",
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
