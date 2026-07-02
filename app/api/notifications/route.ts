import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const notifications = data ?? []
  return NextResponse.json({
    data: notifications,
    unread: notifications.filter((n) => !n.is_read).length,
  })
}

export async function PATCH(req: NextRequest) {
  const { id, markAllRead } = await req.json()
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (markAllRead) {
    await db.from("notifications").update({ is_read: true }).eq("user_id", user.id)
    return NextResponse.json({ success: true })
  }

  const { error } = await db
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db.from("notifications").insert({
    user_id: body.userId ?? user.id,
    type: body.type,
    title: body.title,
    message: body.message,
    data: body.data ?? {},
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data }, { status: 201 })
}

