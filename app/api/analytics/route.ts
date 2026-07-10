import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"
import { buildDemandForecast, priceOptimization, priceHint } from "@/lib/forecast"

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const db = createAdminClient()
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { groq, GROQ_MODEL } = await import("@/lib/groq")
  const prompt = `You are an analytics AI for PetMatchAI, a Nigerian pet marketplace. Write a concise 3-sentence executive summary of the platform's current performance based on these metrics:
- Active listings: ${body.totalListings}
- Total users: ${body.totalUsers}
- Most popular breed: ${body.topBreed || 'N/A'}
- Average listing price: ₦${typeof body.avgPrice === 'number' ? body.avgPrice.toLocaleString() : 'N/A'}
- Pets sold: ${body.totalSold || 0}
- Conversion rate: ${body.conversionRate ?? 'N/A'}%

Focus on trends, highlight what's working, and give one actionable insight. Keep it professional and data-driven.`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: GROQ_MODEL,
    temperature: 0.6,
    max_tokens: 200,
  })
  const summary = completion.choices[0]?.message?.content ?? 'Summary unavailable.'
  return NextResponse.json({ summary })
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  const db = createAdminClient()
  const sp = new URL(req.url).searchParams

  // Geographic user distribution — admin only
  if (sp.get("geo") === "true" && token) {
    const { user } = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profiles } = await db
      .from("profiles")
      .select("location")
      .not("location", "is", null)
      .neq("location", "")
    const counts: Record<string, number> = {}
    for (const p of profiles ?? []) {
      if (p.location) counts[p.location] = (counts[p.location] ?? 0) + 1
    }
    const sorted = Object.entries(counts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
    return NextResponse.json({ data: sorted })
  }

  // Demand forecast + price optimisation — any authenticated user (market intelligence).
  if (sp.get("forecast") === "true" && token) {
    const { user } = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const months = 6
    const since = new Date()
    since.setUTCMonth(since.getUTCMonth() - (months - 1), 1)
    since.setUTCHours(0, 0, 0, 0)
    const sinceISO = since.toISOString()

    const [listingRows, offerRows, viewRows, allPets] = await Promise.all([
      db.from("pets").select("created_at").gte("created_at", sinceISO),
      db.from("offers").select("created_at").gte("created_at", sinceISO),
      db.from("pet_views").select("viewed_at").gte("viewed_at", sinceISO),
      db.from("pets").select("breed, species, price, status, created_at, updated_at"),
    ])

    const forecast = buildDemandForecast(
      (listingRows.data ?? []).map((r: { created_at: string }) => r.created_at),
      (offerRows.data ?? []).map((r: { created_at: string }) => r.created_at),
      (viewRows.data ?? []).map((r: { viewed_at: string }) => r.viewed_at),
      months,
    )
    const priceBands = priceOptimization((allPets.data ?? []) as Parameters<typeof priceOptimization>[0])

    return NextResponse.json({ forecast, priceBands })
  }

  // Live price hint for a seller typing a price on the listing form.
  if (sp.get("priceHint") === "true" && token) {
    const { user } = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const breed = sp.get("breed") ?? ""
    const price = Number(sp.get("price") ?? 0)
    const { data: listings } = await db.from("pets").select("breed, price").eq("status", "active")
    const hint = priceHint(breed, price, (listings ?? []) as { breed: string; price: number }[])
    return NextResponse.json({ hint })
  }

  // For seller analytics, require auth
  const sellerId = sp.get("sellerId")

  if (sellerId && token) {
    const { user } = await verifyToken(token)
    if (!user || user.id !== sellerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: sellerPets } = await db
      .from("pets")
      .select("id, name, breed, price, views, inquiries, status, created_at, updated_at")
      .eq("seller_id", sellerId)

    const { data: reviews } = await db
      .from("reviews")
      .select("rating, comment, created_at")
      .eq("seller_id", sellerId)

    const avgRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    const soldPets = (sellerPets ?? []).filter((p) => p.status === "sold")
    const activePets = (sellerPets ?? []).filter((p) => p.status === "active")

    // Avg days from creation to last update (approximates time-to-sell)
    let avgDaysToSell: number | null = null
    if (soldPets.length > 0) {
      const days = soldPets.map((p) => {
        const created = new Date(p.created_at).getTime()
        const updated = new Date(p.updated_at ?? p.created_at).getTime()
        return Math.max(0, (updated - created) / 86400000)
      })
      avgDaysToSell = Math.round(days.reduce((s, d) => s + d, 0) / days.length)
    }

    // Conversion rate: sold / (sold + active)
    const totalTracked = soldPets.length + activePets.length
    const conversionRate = totalTracked > 0
      ? Math.round((soldPets.length / totalTracked) * 1000) / 10
      : null

    return NextResponse.json({
      data: {
        listings: sellerPets ?? [],
        reviews: reviews ?? [],
        avgRating: Math.round(avgRating * 10) / 10,
        totalListings: sellerPets?.length ?? 0,
        totalViews: sellerPets?.reduce((s, p) => s + (p.views ?? 0), 0) ?? 0,
        totalInquiries: sellerPets?.reduce((s, p) => s + (p.inquiries ?? 0), 0) ?? 0,
        totalSold: soldPets.length,
        avgDaysToSell,
        conversionRate,
      }
    })
  }

  // Custom report mode — requires auth, any role
  if (sp.get("custom") === "true" && token) {
    const { user: reqUser } = await verifyToken(token)
    if (!reqUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const from = sp.get("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const to = sp.get("to") ?? new Date().toISOString().slice(0, 10)
    const species = sp.get("species") ?? ""
    const status = sp.get("status") ?? "all"
    const sortBy = sp.get("sortBy") ?? "views"

    // Non-admins can only see their own listings in reports
    const { data: reqProfile } = await db.from("profiles").select("role").eq("id", reqUser.id).single()
    const isAdmin = reqProfile?.role === "administrator"
    const scopedSellerId = isAdmin ? sp.get("sellerId") : reqUser.id

    let query = db
      .from("pets")
      .select("id, name, breed, species, price, views, inquiries, status, created_at, seller:profiles!pets_seller_id_fkey(name)")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)

    if (scopedSellerId) query = query.eq("seller_id", scopedSellerId)
    if (species) query = query.eq("species", species)
    if (status !== "all") query = query.eq("status", status)
    const sortCol = sortBy === "price" ? "price" : sortBy === "inquiries" ? "inquiries" : "views"
    query = query.order(sortCol, { ascending: false })

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []
    const summary = {
      totalPets: rows.length,
      totalViews: rows.reduce((s, p) => s + (p.views ?? 0), 0),
      totalInquiries: rows.reduce((s, p) => s + (p.inquiries ?? 0), 0),
      avgPrice: rows.length ? Math.round(rows.reduce((s, p) => s + p.price, 0) / rows.length) : 0,
    }

    return NextResponse.json({ data: rows, summary })
  }

  // Public platform analytics
  const [{ count: totalPets }, { count: totalUsers }, { data: breedStats }] = await Promise.all([
    db.from("pets").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("profiles").select("*", { count: "exact", head: true }),
    db.from("pets").select("breed, price, species").eq("status", "active"),
  ])

  // Aggregate breed pricing
  const breedMap: Record<string, number[]> = {}
  for (const pet of breedStats ?? []) {
    if (!breedMap[pet.breed]) breedMap[pet.breed] = []
    breedMap[pet.breed].push(pet.price)
  }

  const breedPricing = Object.entries(breedMap)
    .map(([breed, prices]) => ({
      breed,
      avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      count: prices.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return NextResponse.json({
    data: {
      totalActivePets: totalPets ?? 0,
      totalUsers: totalUsers ?? 0,
      breedPricing,
    }
  })
}

