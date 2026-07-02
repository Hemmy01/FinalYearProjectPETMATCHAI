import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
  const isAdmin = profile?.role === "administrator"

  if (isAdmin) {
    // Admin sees all pending requests with user profile info
    const status = new URL(req.url).searchParams.get("status") ?? "pending"
    const { data, error } = await db
      .from("user_verification_requests")
      .select("*, user:profiles!user_verification_requests_user_id_fkey(id, name, email, location, role)")
      .eq("status", status)
      .order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  }

  // Seller sees their own request
  const { data, error } = await db
    .from("user_verification_requests")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data: data ?? null })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { idType, idImageUrl, selfieUrl } = body

  if (!idType || !idImageUrl) {
    return NextResponse.json({ error: "idType and idImageUrl are required" }, { status: 400 })
  }

  const validTypes = ["passport", "national_id", "drivers_license", "cac_certificate"]
  if (!validTypes.includes(idType)) {
    return NextResponse.json({ error: "Invalid ID type" }, { status: 400 })
  }

  const db = createAdminClient()

  // Upsert — user can resubmit after rejection
  const { data, error } = await db
    .from("user_verification_requests")
    .upsert({
      user_id: user.id,
      id_type: idType,
      id_image_url: idImageUrl,
      selfie_url: selfieUrl ?? null,
      status: "pending",
      admin_note: null,
      reviewed_at: null,
      reviewed_by: null,
      created_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify admins
  const { data: admins } = await db.from("profiles").select("id").eq("role", "administrator")
  if (admins?.length) {
    await db.from("notifications").insert(
      admins.map((a: { id: string }) => ({
        user_id: a.id,
        type: "system",
        title: "New identity verification request",
        message: `A seller has submitted their ${idType.replace("_", " ")} for identity verification.`,
        data: { request_id: data.id, user_id: user.id },
      }))
    )
  }

  void db.from("audit_logs").insert({
    user_id: user.id,
    action: "submit_identity_verification",
    entity_type: "user_verification_request",
    entity_id: data.id,
    details: { id_type: idType },
  })

  return NextResponse.json({ success: true, data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "administrator") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const body = await req.json()
  const { requestId, status, adminNote } = body

  if (!requestId || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "requestId and valid status required" }, { status: 400 })
  }

  const { data: req_, error: reqErr } = await db
    .from("user_verification_requests")
    .update({
      status,
      admin_note: adminNote ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", requestId)
    .select("user_id")
    .single()

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 })

  // On approval — mark the user's profile as verified
  if (status === "approved") {
    await db.from("profiles").update({ is_verified: true }).eq("id", req_.user_id)
  } else {
    // On rejection — ensure is_verified stays false (in case of re-review)
    await db.from("profiles").update({ is_verified: false }).eq("id", req_.user_id)
  }

  // Notify the seller
  await db.from("notifications").insert({
    user_id: req_.user_id,
    type: "system",
    title: status === "approved" ? "Identity Verified! ✅" : "Verification rejected",
    message: status === "approved"
      ? "Your identity has been verified. All your listings now show the Verified Seller badge."
      : `Your identity verification was rejected${adminNote ? `: ${adminNote}` : ". Please resubmit with a clearer document photo."}`,
    data: { request_id: requestId },
  })

  await db.from("audit_logs").insert({
    user_id: user.id,
    action: `identity_verification_${status}`,
    entity_type: "user_verification_request",
    entity_id: requestId,
    details: { adminNote: adminNote ?? null, target_user: req_.user_id },
  })

  return NextResponse.json({ success: true })
}
