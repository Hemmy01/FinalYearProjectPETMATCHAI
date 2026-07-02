import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { emailWeeklyReport } from "@/lib/email"

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = createAdminClient()
  const { data: sellers } = await db
    .from("profiles")
    .select("id, name, email, notification_prefs")
    .eq("role", "seller")
    .not("email", "is", null)

  if (!sellers?.length) return NextResponse.json({ sent: 0 })

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let sent = 0

  for (const seller of sellers) {
    const prefs = seller.notification_prefs as Record<string, boolean> | null
    if (prefs?.channel_email === false || !seller.email) continue

    const [petsRes, inqRes] = await Promise.all([
      db.from("pets").select("views, status").eq("seller_id", seller.id),
      db.from("message_threads").select("id", { count: "exact", head: true }).eq("seller_id", seller.id).gte("created_at", weekAgo),
    ])

    const pets = petsRes.data ?? []
    const totalViews = pets.reduce((s: number, p: { views: number }) => s + (p.views ?? 0), 0)
    const activeListings = pets.filter((p: { status: string }) => p.status === "active").length
    const weeklyInquiries = inqRes.count ?? 0

    await emailWeeklyReport(seller.email, seller.name, { totalViews, weeklyInquiries, activeListings })
    sent++
  }

  return NextResponse.json({ success: true, sent })
}
