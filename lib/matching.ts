// Deterministic, data-grounded match scoring.
//
// Every score is COMPUTED from real, per-user data — the buyer's own chosen
// preferences, their real behaviour (saves / interested / not-interested), the
// pet's actual attributes, and live market statistics derived from real
// listings. The same inputs always produce the same, explainable output, which
// guarantees accuracy and correctness. No numbers are invented by an LLM.

export interface BuyerPrefs {
  preferred_species: string[]
  preferred_breeds: string[]
  age_min: number
  age_max: number
  budget_min: number
  budget_max: number
  preferred_location: string
  preferred_gender: string
  purpose: string
  health_requirements: string[]
}

export interface ScorablePet {
  id: string
  species: string
  breed: string
  age_months: number
  gender: string
  price: number
  location: string
  vaccinated: boolean
  dewormed: boolean
  microchipped?: boolean
  views?: number
}

export interface Behavior {
  likedKeys: Set<string>     // `${species} ${breed}` lowercased — from saves / "interested"
  dislikedKeys: Set<string>  // from "not_interested"
  savedPetIds: Set<string>
}

export interface MarketStats {
  byBreed: Record<string, { avg: number; count: number }>
  bySpecies: Record<string, { avg: number; count: number }>
}

export interface Factor { label: string; delta: number; note: string }
export interface MatchResult {
  score: number
  reasons: string[]
  breakdown: Factor[]
  categories: { species: boolean; price: boolean; breed: boolean; location: boolean; health: boolean }
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function locationsOverlap(a: string, b: string): boolean {
  if (!a || !b) return false
  const pa = a.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean)
  const pb = b.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean)
  return pa.some((x) => pb.some((y) => x.includes(y) || y.includes(x)))
}

// Build price benchmarks from REAL active listings.
export function computeMarketStats(listings: { species: string; breed: string; price: number }[]): MarketStats {
  const accB: Record<string, number[]> = {}
  const accS: Record<string, number[]> = {}
  for (const p of listings) {
    if (!p || !p.price) continue
    const b = (p.breed ?? "").toLowerCase()
    const s = (p.species ?? "").toLowerCase()
    if (b) (accB[b] ??= []).push(Number(p.price))
    if (s) (accS[s] ??= []).push(Number(p.price))
  }
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
  const byBreed: MarketStats["byBreed"] = {}
  const bySpecies: MarketStats["bySpecies"] = {}
  for (const [k, a] of Object.entries(accB)) byBreed[k] = { avg: mean(a), count: a.length }
  for (const [k, a] of Object.entries(accS)) bySpecies[k] = { avg: mean(a), count: a.length }
  return { byBreed, bySpecies }
}

export function scoreMatch(buyer: BuyerPrefs, pet: ScorablePet, behavior: Behavior, market: MarketStats): MatchResult {
  const breakdown: Factor[] = []
  const add = (label: string, delta: number, note: string) => breakdown.push({ label, delta, note })
  const key = `${pet.species} ${pet.breed}`.toLowerCase()
  const prefSpecies = buyer.preferred_species.map((s) => s.toLowerCase())
  const prefBreeds = buyer.preferred_breeds.map((b) => b.toLowerCase())

  const speciesOk = prefSpecies.length === 0 || prefSpecies.includes(pet.species.toLowerCase())
  const budgetMax = buyer.budget_max || Infinity
  const withinBudget = pet.price <= budgetMax

  // ── Hard constraints (from the buyer's own choices) ──
  if (!speciesOk) {
    return {
      score: 8,
      reasons: [`You're looking for ${buyer.preferred_species.join("/")}, but this is a ${pet.species}.`],
      breakdown: [{ label: "Species", delta: -92, note: "different species from your preference" }],
      categories: { species: false, price: withinBudget, breed: false, location: false, health: false },
    }
  }
  if (!withinBudget) {
    return {
      score: 18,
      reasons: [`At ₦${pet.price.toLocaleString()} it's above your ₦${budgetMax.toLocaleString()} budget.`],
      breakdown: [{ label: "Budget", delta: -82, note: "priced above your maximum budget" }],
      categories: { species: true, price: false, breed: prefBreeds.length === 0 || prefBreeds.includes(pet.breed.toLowerCase()), location: false, health: false },
    }
  }

  let score = 55
  add("Base fit", 55, "matches your species and budget")

  // ── Breed (buyer's chosen preference) ──
  const breedOk = prefBreeds.length === 0 || prefBreeds.includes(pet.breed.toLowerCase())
  if (prefBreeds.length > 0) {
    if (breedOk) add("Preferred breed", 18, `${pet.breed} is one of your preferred breeds`)
    else add("Breed", -12, `${pet.breed} isn't a breed you selected`)
    score += breedOk ? 18 : -12
  }

  // ── Age range (buyer's chosen range) ──
  if (pet.age_months < buyer.age_min || pet.age_months > buyer.age_max) {
    score -= 12
    add("Age", -12, `${pet.age_months} months is outside your ${buyer.age_min}–${buyer.age_max} month range`)
  } else {
    score += 6
    add("Age", 6, "within your preferred age range")
  }

  // ── Gender (buyer's choice) ──
  if (buyer.preferred_gender && buyer.preferred_gender !== "any" && pet.gender.toLowerCase() !== buyer.preferred_gender.toLowerCase()) {
    score -= 10
    add("Gender", -10, `you prefer ${buyer.preferred_gender}`)
  }

  // ── Health requirements (buyer's chosen requirements vs pet's real data) ──
  const missing: string[] = []
  for (const req of buyer.health_requirements ?? []) {
    const has = req === "vaccinated" ? pet.vaccinated : req === "dewormed" ? pet.dewormed : req === "microchipped" ? !!pet.microchipped : true
    if (!has) missing.push(req)
  }
  if (missing.length > 0) {
    const d = missing.length * 12
    score -= d
    add("Health", -d, `missing your requirement: ${missing.join(", ")}`)
  } else if ((buyer.health_requirements?.length ?? 0) > 0) {
    score += 6
    add("Health", 6, "meets all your health requirements")
  }

  // ── Location (buyer's preference vs pet's real location) ──
  const locMatch = locationsOverlap(pet.location, buyer.preferred_location)
  if (locMatch) { score += 10; add("Location", 10, `located in ${pet.location}, matching your area`) }

  // ── Market price fairness (REAL data from live listings) ──
  const stat = market.byBreed[pet.breed.toLowerCase()] ?? market.bySpecies[pet.species.toLowerCase()]
  let priceFair = true
  if (stat && stat.count >= 3) {
    const avg = Math.round(stat.avg)
    if (pet.price <= stat.avg * 0.9) { score += 8; add("Market price", 8, `₦${pet.price.toLocaleString()} is below the ₦${avg.toLocaleString()} average for ${pet.breed} across ${stat.count} listings`) }
    else if (pet.price >= stat.avg * 1.25) { score -= 6; priceFair = false; add("Market price", -6, `₦${pet.price.toLocaleString()} is above the ₦${avg.toLocaleString()} average for ${pet.breed}`) }
  }

  // ── Behavioural personalisation (this buyer's real actions) ──
  if (behavior.likedKeys.has(key)) { score += 15; add("Your activity", 15, `you've shown interest in ${pet.breed}s before`) }
  if (behavior.dislikedKeys.has(key)) { score -= 20; add("Your activity", -20, `you passed on ${pet.breed}s before`) }

  // ── Popularity (real engagement) ──
  const views = pet.views ?? 0
  if (views > 20) { score += 4; add("Popularity", 4, `popular listing with ${views} views`) }

  score = Math.max(0, Math.min(100, Math.round(score)))

  // Reasons come straight from the actual computed factors — always accurate.
  const factors = breakdown.filter((f) => f.label !== "Base fit")
  const positives = factors.filter((f) => f.delta > 0).sort((a, b) => b.delta - a.delta)
  const negatives = factors.filter((f) => f.delta < 0).sort((a, b) => a.delta - b.delta)
  const reasons: string[] = []
  if (positives[0]) reasons.push(cap(positives[0].note))
  if (negatives[0]) reasons.push(cap(negatives[0].note))
  if (positives[1]) reasons.push(cap(positives[1].note))
  else if (negatives[1]) reasons.push(cap(negatives[1].note))
  if (reasons.length === 0) reasons.push("A solid all-round match for your stated preferences.")

  return {
    score,
    reasons: reasons.slice(0, 3),
    breakdown,
    categories: { species: true, price: withinBudget && priceFair, breed: breedOk, location: locMatch, health: missing.length === 0 },
  }
}
