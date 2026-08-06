import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

// Reporting data for the Buyers / Sellers / Finance PDF reports.
//
// Access model:
//   • administrator → platform-wide data for any report type.
//   • buyer         → only their own buyer + finance (as buyer) data.
//   • seller        → only their own seller + finance (as seller) data.
//
// Date scoping has two modes, driven by the filters on /reports:
//   • range    → every figure is bounded by [from, to]. A person is listed if
//                they joined inside the window OR were active inside it, so the
//                start date genuinely changes the result and a long-standing
//                buyer who traded during the period is never dropped.
//   • all-time → ?allTime=1 removes every date bound for the overall report.
// Bounds are explicit UTC (matching how Postgres reads the timestamps) so the
// server-side cut and the JS-side cut agree on the boundary.

type Role = "buyer" | "seller" | "administrator"

const ALLOWED: Record<Role, string[]> = {
  administrator: ["buyers", "sellers", "finance"],
  buyer: ["buyers", "finance"],
  seller: ["sellers", "finance"],
}

const sum = <T,>(rows: T[], pick: (r: T) => number) => rows.reduce((s, r) => s + (pick(r) || 0), 0)

// Apply the [from, to] bounds to a query, skipping whichever end is null
// (all-time mode passes null for both).
function dateWindow<T>(q: T, col: string, fromISO: string | null, toISO: string | null): T {
  let out: any = q
  if (fromISO) out = out.gte(col, fromISO)
  if (toISO) out = out.lte(col, toISO)
  return out as T
}

const atOrAfter = (iso: string | null | undefined, boundary: string | null) => {
  if (!boundary) return true
  if (!iso) return false
  return new Date(iso).getTime() >= new Date(boundary).getTime()
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from("profiles").select("role, name").eq("id", user.id).single()
  const role = (profile?.role ?? "buyer") as Role

  const sp = new URL(req.url).searchParams
  const type = sp.get("type") ?? "buyers"
  if (!ALLOWED[role]?.includes(type)) {
    return NextResponse.json({ error: "You are not allowed to generate this report." }, { status: 403 })
  }

  // allTime=1 → the overall report: no date bounds at all.
  const allTime = sp.get("allTime") === "1"
  const from = sp.get("from") || "2020-01-01"
  const to = sp.get("to") || new Date().toISOString().slice(0, 10)
  const status = sp.get("status") ?? "all"
  const fromISO = allTime ? null : `${from}T00:00:00.000Z`
  const toISO = allTime ? null : `${to}T23:59:59.999Z`
  const isAdmin = role === "administrator"

  try {
    if (type === "buyers") {
      const scopeId = isAdmin ? null : user.id
      return NextResponse.json(await buyersReport(db, { fromISO, toISO, scopeId }))
    }
    if (type === "sellers") {
      const scopeId = isAdmin ? null : user.id
      return NextResponse.json(await sellersReport(db, { fromISO, toISO, scopeId }))
    }
    if (type === "finance") {
      return NextResponse.json(await financeReport(db, { fromISO, toISO, status, role, userId: user.id }))
    }
    return NextResponse.json({ error: "Unknown report type" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Report failed" }, { status: 500 })
  }
}

/* ─────────────────────────── Buyers ─────────────────────────── */

async function buyersReport(
  db: ReturnType<typeof createAdminClient>,
  o: { fromISO: string | null; toISO: string | null; scopeId: string | null },
) {
  // Upper bound only at the DB level — nobody can have joined after the period
  // ends. The lower bound is applied after the activity counts are known, so a
  // buyer who joined earlier but traded inside the window is still reported.
  let buyersQ = db.from("profiles").select("id, name, email, location, created_at").eq("role", "buyer")
  buyersQ = dateWindow(buyersQ, "created_at", null, o.toISO)
  if (o.scopeId) buyersQ = buyersQ.eq("id", o.scopeId)

  let offersQ = dateWindow(db.from("offers").select("buyer_id"), "created_at", o.fromISO, o.toISO)
  if (o.scopeId) offersQ = offersQ.eq("buyer_id", o.scopeId)

  let txQ = dateWindow(
    db.from("transactions").select("buyer_id, amount").eq("status", "released"),
    "created_at", o.fromISO, o.toISO,
  )
  if (o.scopeId) txQ = txQ.eq("buyer_id", o.scopeId)

  const [{ data: buyers }, { data: offers }, { data: txs }] = await Promise.all([buyersQ, offersQ, txQ])

  const offerCount: Record<string, number> = {}
  for (const of of offers ?? []) offerCount[of.buyer_id] = (offerCount[of.buyer_id] ?? 0) + 1
  const spend: Record<string, { n: number; total: number }> = {}
  for (const t of txs ?? []) {
    const s = (spend[t.buyer_id] ??= { n: 0, total: 0 })
    s.n += 1
    s.total += Number(t.amount) || 0
  }

  const rows = (buyers ?? [])
    .map((b) => ({
      name: b.name ?? "", email: b.email ?? "", location: b.location ?? "",
      joinedAt: b.created_at,
      offers: offerCount[b.id] ?? 0,
      purchases: spend[b.id]?.n ?? 0,
      spent: spend[b.id]?.total ?? 0,
    }))
    // Joined inside the window, or active inside it.
    .filter((r) => atOrAfter(r.joinedAt, o.fromISO) || r.offers > 0 || r.purchases > 0)
    .sort((a, b) => b.spent - a.spent || b.offers - a.offers)

  const summary = {
    totalBuyers: rows.length,
    activeBuyers: rows.filter((r) => r.offers > 0 || r.purchases > 0).length,
    totalOffers: sum(rows, (r) => r.offers),
    totalPurchases: sum(rows, (r) => r.purchases),
    totalSpent: sum(rows, (r) => r.spent),
  }
  return { summary, rows }
}

/* ─────────────────────────── Sellers ─────────────────────────── */

async function sellersReport(
  db: ReturnType<typeof createAdminClient>,
  o: { fromISO: string | null; toISO: string | null; scopeId: string | null },
) {
  // Upper bound only — see buyersReport; the lower bound is applied below once
  // listing and revenue activity is known.
  let sellersQ = db.from("profiles").select("id, name, email, location, created_at").eq("role", "seller")
  sellersQ = dateWindow(sellersQ, "created_at", null, o.toISO)
  if (o.scopeId) sellersQ = sellersQ.eq("id", o.scopeId)

  let petsQ = dateWindow(
    db.from("pets").select("seller_id, status, views, inquiries"),
    "created_at", o.fromISO, o.toISO,
  )
  if (o.scopeId) petsQ = petsQ.eq("seller_id", o.scopeId)

  let txQ = dateWindow(
    db.from("transactions").select("seller_id, amount").eq("status", "released"),
    "created_at", o.fromISO, o.toISO,
  )
  if (o.scopeId) txQ = txQ.eq("seller_id", o.scopeId)

  // Deliberately NOT date-bounded: a rating is the seller's standing today, not
  // a figure earned inside the window. Reported as "Rating (all-time)".
  let reviewsQ = db.from("reviews").select("seller_id, rating")
  if (o.scopeId) reviewsQ = reviewsQ.eq("seller_id", o.scopeId)

  const [{ data: sellers }, { data: pets }, { data: txs }, { data: reviews }] = await Promise.all([
    sellersQ, petsQ, txQ, reviewsQ,
  ])

  const agg: Record<string, { listings: number; active: number; sold: number; views: number; inquiries: number }> = {}
  for (const p of pets ?? []) {
    const a = (agg[p.seller_id] ??= { listings: 0, active: 0, sold: 0, views: 0, inquiries: 0 })
    a.listings += 1
    if (p.status === "active") a.active += 1
    if (p.status === "sold") a.sold += 1
    a.views += p.views ?? 0
    a.inquiries += p.inquiries ?? 0
  }
  const rev: Record<string, number> = {}
  for (const t of txs ?? []) rev[t.seller_id] = (rev[t.seller_id] ?? 0) + (Number(t.amount) || 0)
  const rate: Record<string, { sum: number; n: number }> = {}
  for (const r of reviews ?? []) {
    const x = (rate[r.seller_id] ??= { sum: 0, n: 0 })
    x.sum += r.rating
    x.n += 1
  }

  const rows = (sellers ?? [])
    .map((s) => {
      const a = agg[s.id] ?? { listings: 0, active: 0, sold: 0, views: 0, inquiries: 0 }
      const rt = rate[s.id]
      return {
        name: s.name ?? "", email: s.email ?? "", location: s.location ?? "",
        joinedAt: s.created_at,
        listings: a.listings, active: a.active, sold: a.sold,
        views: a.views, inquiries: a.inquiries,
        revenue: rev[s.id] ?? 0,
        rating: rt ? Math.round((rt.sum / rt.n) * 10) / 10 : null,
      }
    })
    // Joined inside the window, or active inside it.
    .filter((r) => atOrAfter(r.joinedAt, o.fromISO) || r.listings > 0 || r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue || b.listings - a.listings)

  const summary = {
    totalSellers: rows.length,
    activeSellers: rows.filter((r) => r.listings > 0).length,
    totalListings: sum(rows, (r) => r.listings),
    totalSold: sum(rows, (r) => r.sold),
    totalViews: sum(rows, (r) => r.views),
    totalRevenue: sum(rows, (r) => r.revenue),
  }
  return { summary, rows }
}

/* ─────────────────────────── Finance ─────────────────────────── */

async function financeReport(
  db: ReturnType<typeof createAdminClient>,
  o: { fromISO: string | null; toISO: string | null; status: string; role: Role; userId: string },
) {
  let q = dateWindow(
    db
      .from("transactions")
      .select(
        "created_at, reference, amount, provider, status, " +
          "buyer:profiles!transactions_buyer_id_fkey(name), " +
          "seller:profiles!transactions_seller_id_fkey(name), " +
          "pet:pets!transactions_pet_id_fkey(name)",
      ),
    "created_at", o.fromISO, o.toISO,
  )
    .order("created_at", { ascending: false })
    .limit(5000)

  // Scope to the caller's own transactions unless they are an administrator.
  if (o.role === "buyer") q = q.eq("buyer_id", o.userId)
  else if (o.role === "seller") q = q.eq("seller_id", o.userId)
  if (o.status && o.status !== "all") q = q.eq("status", o.status)

  const { data } = await q
  const list = (data ?? []) as any[]

  const rows = list.map((t) => ({
    date: t.created_at,
    reference: t.reference,
    buyer: t.buyer?.name ?? "",
    seller: t.seller?.name ?? "",
    pet: t.pet?.name ?? "",
    amount: Number(t.amount) || 0,
    provider: t.provider ?? "",
    status: t.status,
  }))

  const byStatus = (st: string) => sum(rows.filter((r) => r.status === st), (r) => r.amount)
  const summary = {
    count: rows.length,
    gmv: byStatus("paid_escrow") + byStatus("released"),
    released: byStatus("released"),
    inEscrow: byStatus("paid_escrow"),
    refunded: byStatus("refunded"),
    pending: byStatus("pending"),
    cancelled: byStatus("cancelled"),
  }
  return { summary, rows }
}
