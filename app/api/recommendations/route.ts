import { NextRequest, NextResponse, after } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"
import { generateRecommendations } from "@/lib/groq"
import { scoreMatch, computeMarketStats } from "@/lib/matching"

type PoolPet = {
  id: string; name: string; species: string; breed: string; age_months: number
  gender: string; price: number; location: string; vaccinated: boolean; image_url: string | null
  views: number | null
  seller: { id: string; name: string; is_verified: boolean } | null
}

function locationsOverlap(a: string, b: string): boolean {
  const partsA = a.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean)
  const partsB = b.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean)
  return partsA.some((pa) => partsB.some((pb) => pa.includes(pb) || pb.includes(pa)))
}

function isSimilarPet(pet: { species: string; breed: string; price: number }, ref: { species: string; breed: string; price: number }): boolean {
  if (pet.species !== ref.species) return false
  if (pet.breed === ref.breed) return true
  const priceDiff = Math.abs(pet.price - ref.price) / Math.max(ref.price, 1)
  return priceDiff <= 0.25
}

function toCard(pet: PoolPet) {
  return {
    id: pet.id, name: pet.name, breed: pet.breed, species: pet.species,
    age_months: pet.age_months, gender: pet.gender, price: pet.price,
    location: pet.location, vaccinated: pet.vaccinated, image_url: pet.image_url,
    seller: pet.seller,
  }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [{ data: prefs }, { data: buyerProfile }, savesRes, savedDetailRes, matchRowsRes, viewRes, poolRes, marketRes] = await Promise.all([
    db.from("buyer_preferences").select("*").eq("user_id", user.id).single(),
    db.from("profiles").select("location").eq("id", user.id).single(),
    db.from("saved_pets").select("pet_id").eq("user_id", user.id).then(({ data }) => new Set((data ?? []).map((r: { pet_id: string }) => r.pet_id))),
    db.from("saved_pets").select("pet:pets(id, species, breed, price)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    db.from("ai_matches").select("pet_id, feedback, match_status, pet:pets(species, breed)").eq("buyer_id", user.id),
    db.from("pet_views").select("pet:pets(id, name, species, breed, price)").eq("user_id", user.id).order("viewed_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("pets").select(`*, seller:profiles!pets_seller_id_fkey(id, name, is_verified)`).eq("status", "active").limit(60),
    db.from("pets").select("species, breed, price").eq("status", "active"),
  ])

  const buyerPrefs = {
    preferred_species: prefs?.preferred_species ?? [],
    preferred_breeds: prefs?.preferred_breeds ?? [],
    age_min: prefs?.age_min ?? 0,
    age_max: prefs?.age_max ?? 120,
    budget_min: prefs?.budget_min ?? 0,
    budget_max: prefs?.budget_max ?? 999999,
    preferred_location: prefs?.preferred_location ?? "",
    preferred_gender: prefs?.preferred_gender ?? "any",
    purpose: prefs?.purpose ?? "companionship",
    health_requirements: prefs?.health_requirements ?? [],
  }

  const liked = new Set<string>()
  const disliked = new Set<string>()
  const dismissedPetIds = new Set<string>()
  for (const row of (matchRowsRes.data ?? []) as unknown as { pet_id: string; feedback: string | null; match_status: string | null; pet: { species: string; breed: string } | null }[]) {
    if (row.feedback === "interested" && row.pet) liked.add(`${row.pet.species} ${row.pet.breed}`)
    if (row.feedback === "not_interested") {
      if (row.pet) disliked.add(`${row.pet.species} ${row.pet.breed}`)
      dismissedPetIds.add(row.pet_id)
    }
    if (row.match_status === "declined") dismissedPetIds.add(row.pet_id)
  }

  let query = db.from("pets").select(`
    *,
    seller:profiles!pets_seller_id_fkey(id, name, is_verified)
  `).eq("status", "active").limit(12)

  if (prefs?.preferred_species?.length) {
    query = query.in("species", prefs.preferred_species)
  }
  if (prefs?.budget_max) {
    query = query.lte("price", prefs.budget_max)
  }
  if (prefs?.preferred_gender && prefs.preferred_gender !== "any") {
    query = query.eq("gender", prefs.preferred_gender)
  }

  const { data: pets, error: petsErr } = await query
  if (petsErr) return NextResponse.json({ error: petsErr.message }, { status: 500 })
  const petList = (pets ?? []).filter((p) => !dismissedPetIds.has(p.id))
  if (petList.length === 0) return NextResponse.json({ data: [], message: "", total: 0 })

  const { data: cachedRows } = await db
    .from("ai_matches")
    .select("*")
    .eq("buyer_id", user.id)
    .in("pet_id", petList.map((p) => p.id))
  const cached = new Map((cachedRows ?? []).map((s: { pet_id: string; score: number; reasons: string[]; feedback: string | null }) => [s.pet_id, s]))

  // Real market-price benchmarks from live listings.
  const market = computeMarketStats((marketRes.data ?? []) as { species: string; breed: string; price: number }[])
  const behavior = {
    likedKeys: new Set(Array.from(liked).map((s) => s.toLowerCase())),
    dislikedKeys: new Set(Array.from(disliked).map((s) => s.toLowerCase())),
    savedPetIds: savesRes,
  }

  // Deterministically score each pet from this buyer's real data + real market.
  const petsWithScores = petList.map((pet) => {
    const r = scoreMatch(buyerPrefs, {
      id: pet.id, species: pet.species, breed: pet.breed, age_months: pet.age_months,
      gender: pet.gender, price: pet.price, location: pet.location,
      vaccinated: pet.vaccinated, dewormed: pet.dewormed, microchipped: pet.microchipped,
      views: pet.views ?? 0,
    }, behavior, market)
    return { ...pet, matchScore: r.score, matchReasons: r.reasons, matchBreakdown: r.breakdown, matchCategories: r.categories, feedback: cached.get(pet.id)?.feedback ?? null }
  })

  after(() => db.from("ai_matches").upsert(
    petsWithScores.map((p) => ({ buyer_id: user.id, pet_id: p.id, score: p.matchScore, reasons: p.matchReasons, updated_at: new Date().toISOString() })),
    { onConflict: "buyer_id,pet_id" }
  ))

  petsWithScores.sort((a, b) => b.matchScore - a.matchScore)
  const topPets = petsWithScores.slice(0, 6)

  let message = "Here are some great matches for you!"
  try {
    message = await generateRecommendations(buyerPrefs, topPets.map((p) => ({
      id: p.id, name: p.name, species: p.species, breed: p.breed,
      age_months: p.age_months, gender: p.gender, price: p.price,
      location: p.location, vaccinated: p.vaccinated, dewormed: p.dewormed,
      description: p.description ?? "",
    })))
  } catch { /* non-critical */ }

  // ── Contextual sections (lightweight heuristics, no extra Groq calls) ──
  const pool = ((poolRes.data ?? []) as unknown as PoolPet[]).filter((p) => !dismissedPetIds.has(p.id))

  let becauseYouViewed: { petName: string; suggestions: ReturnType<typeof toCard>[] } | null = null
  const viewedPet = (viewRes.data as unknown as { pet: { id: string; name: string; species: string; breed: string; price: number } | null } | null)?.pet
  if (viewedPet) {
    const suggestions = pool
      .filter((p) => p.id !== viewedPet.id && isSimilarPet(p, viewedPet))
      .slice(0, 4)
      .map(toCard)
    if (suggestions.length > 0) becauseYouViewed = { petName: viewedPet.name, suggestions }
  }

  const savedRefs = ((savedDetailRes.data ?? []) as unknown as { pet: { species: string; breed: string; price: number } | null }[])
    .map((r) => r.pet)
    .filter((p): p is { species: string; breed: string; price: number } => p !== null)
  const similarSeen = new Set<string>()
  const similarToSaved = savedRefs.length === 0 ? [] : pool
    .filter((p) => {
      if (savesRes.has(p.id) || similarSeen.has(p.id)) return false
      const match = savedRefs.some((ref) => isSimilarPet(p, ref))
      if (match) similarSeen.add(p.id)
      return match
    })
    .slice(0, 4)
    .map(toCard)

  const popularInArea = !buyerProfile?.location ? [] : pool
    .filter((p) => locationsOverlap(p.location, buyerProfile.location!))
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 4)
    .map(toCard)

  return NextResponse.json({
    data: topPets, message, total: topPets.length,
    becauseYouViewed, similarToSaved, popularInArea,
  })
}
