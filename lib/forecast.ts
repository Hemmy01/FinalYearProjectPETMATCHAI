// Deterministic demand forecasting & price optimisation.
//
// Like lib/matching.ts, every number here is COMPUTED from real platform data
// (listing timestamps, offer timestamps, view timestamps, sale prices and
// time-to-sell) using transparent, explainable statistics — no LLM, no black
// box. Same inputs always produce the same output, so results are defensible.

export interface MonthPoint {
  month: string   // 'YYYY-MM'
  label: string   // 'Jul 25'
  count: number
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`
}

// Build a continuous monthly series covering the last `months` calendar months
// (including the current one), counting how many events fall in each month.
export function buildMonthlySeries(dates: (string | Date | null | undefined)[], months: number, now: Date = new Date()): MonthPoint[] {
  // Ordered list of the month keys we care about.
  const keys: string[] = []
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(cursor)
    d.setUTCMonth(d.getUTCMonth() - i)
    keys.push(monthKey(d))
  }
  const counts: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]))
  for (const raw of dates) {
    if (!raw) continue
    const d = raw instanceof Date ? raw : new Date(raw)
    if (isNaN(d.getTime())) continue
    const k = monthKey(d)
    if (k in counts) counts[k] += 1
  }
  return keys.map((k) => ({ month: k, label: monthLabel(k), count: counts[k] }))
}

// Trailing moving average; null until the window is filled.
export function movingAverage(points: MonthPoint[], window: number): (number | null)[] {
  return points.map((_, i) => {
    if (i < window - 1) return null
    const slice = points.slice(i - window + 1, i + 1)
    return Math.round((slice.reduce((s, p) => s + p.count, 0) / window) * 10) / 10
  })
}

// Least-squares slope of count vs. month index. Positive = growing demand.
export function trendSlope(points: MonthPoint[]): number {
  const n = points.length
  if (n < 2) return 0
  const xs = points.map((_, i) => i)
  const ys = points.map((p) => p.count)
  const mx = xs.reduce((s, x) => s + x, 0) / n
  const my = ys.reduce((s, y) => s + y, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  return den === 0 ? 0 : num / den
}

// Project next month by extending the least-squares line. Clamped to >= 0.
// Returns null when there isn't enough signal to be meaningful.
export function linearNextProjection(points: MonthPoint[]): number | null {
  const total = points.reduce((s, p) => s + p.count, 0)
  if (points.length < 3 || total < 3) return null
  const n = points.length
  const my = total / n
  const mx = (n - 1) / 2
  const slope = trendSlope(points)
  const intercept = my - slope * mx
  const next = intercept + slope * n
  return Math.max(0, Math.round(next))
}

export function peakMonth(points: MonthPoint[]): MonthPoint | null {
  if (points.length === 0) return null
  const withData = points.filter((p) => p.count > 0)
  if (withData.length === 0) return null
  return withData.reduce((best, p) => (p.count > best.count ? p : best))
}

export type Momentum = "rising" | "falling" | "flat" | "insufficient"

export function momentumOf(points: MonthPoint[]): Momentum {
  const total = points.reduce((s, p) => s + p.count, 0)
  if (points.length < 3 || total < 3) return "insufficient"
  const slope = trendSlope(points)
  const avg = total / points.length
  // Slope relative to average magnitude → ignore trivial wiggles.
  const rel = avg === 0 ? 0 : slope / avg
  if (rel > 0.12) return "rising"
  if (rel < -0.12) return "falling"
  return "flat"
}

export interface DemandForecast {
  listings: MonthPoint[]
  offers: MonthPoint[]
  views: MonthPoint[]
  projection: { listings: number | null; offers: number | null; views: number | null }
  peakDemandMonth: { label: string; count: number } | null
  momentum: Momentum
}

export function buildDemandForecast(
  listingDates: (string | Date)[],
  offerDates: (string | Date)[],
  viewDates: (string | Date)[],
  months = 6,
  now: Date = new Date(),
): DemandForecast {
  const listings = buildMonthlySeries(listingDates, months, now)
  const offers = buildMonthlySeries(offerDates, months, now)
  const views = buildMonthlySeries(viewDates, months, now)
  // Demand momentum is driven by buyer offers, falling back to views, then listings.
  const demandSeries = offers.reduce((s, p) => s + p.count, 0) >= 3 ? offers
    : views.reduce((s, p) => s + p.count, 0) >= 3 ? views
    : listings
  return {
    listings, offers, views,
    projection: {
      listings: linearNextProjection(listings),
      offers: linearNextProjection(offers),
      views: linearNextProjection(views),
    },
    peakDemandMonth: (() => { const p = peakMonth(demandSeries); return p ? { label: p.label, count: p.count } : null })(),
    momentum: momentumOf(demandSeries),
  }
}

// ─────────────────────────── Price optimisation ───────────────────────────

export interface PricePet {
  breed: string
  species: string
  price: number
  status: string          // 'active' | 'pending' | 'sold'
  created_at: string | Date
  updated_at?: string | Date | null
}

export interface PriceBand {
  breed: string
  count: number           // listings used for the market average
  marketAvg: number
  suggestedMin: number    // avg * 0.9
  suggestedMax: number    // avg * 1.1
  soldCount: number
  avgDaysBelowAvg: number | null   // time-to-sell for sold pets priced at/below market
  avgDaysAboveAvg: number | null   // time-to-sell for sold pets priced above market
  insight: string
}

function daysToSell(p: PricePet): number {
  const c = new Date(p.created_at).getTime()
  const u = new Date(p.updated_at ?? p.created_at).getTime()
  return Math.max(0, (u - c) / 86400000)
}

// Per-breed suggested price band + evidence that competitive pricing sells faster.
// minListings = 2 is the practical minimum to average; the sample size is always
// surfaced so the confidence level is transparent.
export function priceOptimization(pets: PricePet[], minListings = 2): PriceBand[] {
  const byBreed: Record<string, PricePet[]> = {}
  for (const p of pets) {
    if (!p || !p.breed || !p.price) continue
    ;(byBreed[p.breed] ??= []).push(p)
  }
  const bands: PriceBand[] = []
  for (const [breed, group] of Object.entries(byBreed)) {
    if (group.length < minListings) continue
    const avg = group.reduce((s, p) => s + Number(p.price), 0) / group.length
    const sold = group.filter((p) => p.status === "sold")
    const below = sold.filter((p) => Number(p.price) <= avg).map(daysToSell)
    const above = sold.filter((p) => Number(p.price) > avg).map(daysToSell)
    const mean = (a: number[]) => (a.length ? Math.round(a.reduce((s, d) => s + d, 0) / a.length) : null)
    const avgBelow = mean(below)
    const avgAbove = mean(above)

    let insight: string
    if (avgBelow !== null && avgAbove !== null) {
      insight = avgBelow < avgAbove
        ? `${breed}s priced at or below the ₦${Math.round(avg).toLocaleString()} average sold in ~${avgBelow}d vs ~${avgAbove}d when priced higher — competitive pricing sells faster.`
        : `${breed}s show no time-to-sell penalty for higher prices in current data (${avgAbove}d vs ${avgBelow}d).`
    } else {
      insight = `Market average for ${breed} is ₦${Math.round(avg).toLocaleString()} across ${group.length} listings. Aim for ₦${Math.round(avg * 0.9).toLocaleString()}–₦${Math.round(avg * 1.1).toLocaleString()} to stay competitive.`
    }
    bands.push({
      breed,
      count: group.length,
      marketAvg: Math.round(avg),
      suggestedMin: Math.round(avg * 0.9),
      suggestedMax: Math.round(avg * 1.1),
      soldCount: sold.length,
      avgDaysBelowAvg: avgBelow,
      avgDaysAboveAvg: avgAbove,
      insight,
    })
  }
  return bands.sort((a, b) => b.count - a.count)
}

export type PriceVerdict = "below" | "fair" | "above"

export interface PriceHint {
  avg: number
  count: number
  deltaPct: number        // how far the entered price is from market, signed %
  verdict: PriceVerdict
  message: string
}

// Live hint for a seller typing a price for a given breed.
export function priceHint(
  breed: string,
  price: number,
  listings: { breed: string; price: number }[],
): PriceHint | null {
  const b = breed.trim().toLowerCase()
  const group = listings.filter((l) => (l.breed ?? "").trim().toLowerCase() === b && l.price)
  if (group.length < 2 || !price) return null
  const avg = group.reduce((s, l) => s + Number(l.price), 0) / group.length
  const deltaPct = Math.round(((price - avg) / avg) * 100)
  let verdict: PriceVerdict
  let message: string
  if (deltaPct <= -10) {
    verdict = "below"
    message = `${Math.abs(deltaPct)}% below the ₦${Math.round(avg).toLocaleString()} market average for ${breed} — likely to sell fast.`
  } else if (deltaPct >= 15) {
    verdict = "above"
    message = `${deltaPct}% above the ₦${Math.round(avg).toLocaleString()} market average for ${breed} — may sell slower.`
  } else {
    verdict = "fair"
    message = `Competitively priced — within range of the ₦${Math.round(avg).toLocaleString()} market average for ${breed}.`
  }
  return { avg: Math.round(avg), count: group.length, deltaPct, verdict, message }
}
