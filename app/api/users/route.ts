import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = new URL(req.url).searchParams.get("admin") === "true"

  if (isAdmin) {
    // Check if user is admin
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "administrator") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data: users, error } = await db.from("profiles").select("*").order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: users })
  }

  const { data: profile, error } = await db.from("profiles").select("*").eq("id", user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: profile })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updateData.name = body.name
  if (body.phone !== undefined) updateData.phone = body.phone
  if (body.location !== undefined) updateData.location = body.location
  if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url
  if (body.notification_prefs !== undefined) updateData.notification_prefs = body.notification_prefs
  if (body.business_name !== undefined) updateData.business_name = body.business_name
  if (body.license_number !== undefined) updateData.license_number = body.license_number

  const { data, error } = await db
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}

