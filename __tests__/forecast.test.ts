// Unit tests for the deterministic demand-forecast & price-optimisation engine.
import {
  monthKey,
  buildMonthlySeries,
  movingAverage,
  trendSlope,
  linearNextProjection,
  peakMonth,
  momentumOf,
  buildDemandForecast,
  priceOptimization,
  priceHint,
  type MonthPoint,
} from "../lib/forecast"

const NOW = new Date("2026-06-15T00:00:00Z")

function series(counts: number[]): MonthPoint[] {
  return counts.map((c, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, label: `M${i}`, count: c }))
}

describe("monthKey", () => {
  it("formats YYYY-MM in UTC", () => {
    expect(monthKey(new Date("2026-07-05T00:00:00Z"))).toBe("2026-07")
    expect(monthKey(new Date("2026-01-31T23:00:00Z"))).toBe("2026-01")
  })
})

describe("buildMonthlySeries", () => {
  it("produces a continuous window ending at the current month", () => {
    const s = buildMonthlySeries([], 6, NOW)
    expect(s).toHaveLength(6)
    expect(s[5].month).toBe("2026-06")
    expect(s[0].month).toBe("2026-01")
    expect(s.every((p) => p.count === 0)).toBe(true)
  })

  it("counts events into the right month and ignores out-of-window/invalid dates", () => {
    const s = buildMonthlySeries(
      ["2026-06-01", "2026-06-20", "2026-05-10", "2025-01-01" /*out*/, "not-a-date"],
      6,
      NOW,
    )
    const june = s.find((p) => p.month === "2026-06")!
    const may = s.find((p) => p.month === "2026-05")!
    expect(june.count).toBe(2)
    expect(may.count).toBe(1)
    expect(s.reduce((t, p) => t + p.count, 0)).toBe(3) // out-of-window + invalid dropped
  })
})

describe("movingAverage", () => {
  it("is null until the window fills, then averages", () => {
    const ma = movingAverage(series([2, 4, 6]), 3)
    expect(ma[0]).toBeNull()
    expect(ma[1]).toBeNull()
    expect(ma[2]).toBe(4) // (2+4+6)/3
  })
})

describe("trendSlope", () => {
  it("is positive for growth, negative for decline, ~0 for flat", () => {
    expect(trendSlope(series([1, 2, 3, 4]))).toBeCloseTo(1, 5)
    expect(trendSlope(series([4, 3, 2, 1]))).toBeCloseTo(-1, 5)
    expect(trendSlope(series([3, 3, 3, 3]))).toBeCloseTo(0, 5)
  })
})

describe("linearNextProjection", () => {
  it("extends the trend line for a rising series", () => {
    // 1,2,3,4,5 → next ≈ 6
    expect(linearNextProjection(series([1, 2, 3, 4, 5]))).toBe(6)
  })
  it("never returns a negative projection", () => {
    const p = linearNextProjection(series([5, 3, 1, 0, 0]))
    expect(p).not.toBeNull()
    expect(p as number).toBeGreaterThanOrEqual(0)
  })
  it("returns null when data is too sparse", () => {
    expect(linearNextProjection(series([1, 1]))).toBeNull()      // length < 3
    expect(linearNextProjection(series([0, 1, 0, 1]))).toBeNull() // total 2 < 3
  })
  it("guards on low totals", () => {
    expect(linearNextProjection(series([0, 0, 1, 1]))).toBeNull()   // total 2
    expect(linearNextProjection(series([1, 1, 1, 0]))).not.toBeNull() // total 3
  })
})

describe("peakMonth", () => {
  it("returns the highest-count month, or null when empty", () => {
    expect(peakMonth(series([1, 5, 2]))!.count).toBe(5)
    expect(peakMonth(series([0, 0, 0]))).toBeNull()
  })
})

describe("momentumOf", () => {
  it("classifies rising / falling / flat / insufficient", () => {
    expect(momentumOf(series([1, 2, 3, 4, 5]))).toBe("rising")
    expect(momentumOf(series([5, 4, 3, 2, 1]))).toBe("falling")
    expect(momentumOf(series([3, 3, 3, 3, 3]))).toBe("flat")
    expect(momentumOf(series([1, 1]))).toBe("insufficient")
  })
})

describe("buildDemandForecast", () => {
  it("assembles listings/offers/views series and drives momentum off offers", () => {
    const f = buildDemandForecast(
      ["2026-04-01", "2026-05-01", "2026-06-01"],           // listings
      ["2026-04-01", "2026-05-01", "2026-05-02", "2026-06-01", "2026-06-02", "2026-06-03"], // offers (rising)
      [],                                                    // views
      6,
      NOW,
    )
    expect(f.listings).toHaveLength(6)
    expect(f.offers.find((p) => p.month === "2026-06")!.count).toBe(3)
    expect(f.momentum).toBe("rising")
    expect(f.peakDemandMonth!.label).toBe("Jun 26")
  })
})

describe("priceOptimization", () => {
  const base = { species: "dog", created_at: "2026-01-01T00:00:00Z" }
  it("computes a market average and ±10% band for breeds with enough listings", () => {
    const bands = priceOptimization([
      { ...base, breed: "Boerboel", price: 100000, status: "active" },
      { ...base, breed: "Boerboel", price: 200000, status: "active" },
      { ...base, breed: "Boerboel", price: 300000, status: "active" },
    ])
    expect(bands).toHaveLength(1)
    expect(bands[0].marketAvg).toBe(200000)
    expect(bands[0].suggestedMin).toBe(180000)
    expect(bands[0].suggestedMax).toBe(220000)
  })

  it("skips breeds below the minimum listing threshold", () => {
    const bands = priceOptimization([
      { ...base, breed: "Rare", price: 100000, status: "active" },
    ])
    expect(bands).toHaveLength(0)
  })

  it("shows cheaper pets sell faster when sold data supports it", () => {
    const bands = priceOptimization([
      { breed: "Lab", species: "dog", price: 100000, status: "sold", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-03T00:00:00Z" }, // 2d, below avg
      { breed: "Lab", species: "dog", price: 300000, status: "sold", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-21T00:00:00Z" }, // 20d, above avg
      { breed: "Lab", species: "dog", price: 200000, status: "active", created_at: "2026-01-01T00:00:00Z" },
    ])
    expect(bands[0].avgDaysBelowAvg).toBe(2)
    expect(bands[0].avgDaysAboveAvg).toBe(20)
    expect(bands[0].insight).toMatch(/competitive pricing sells faster/i)
  })
})

describe("priceHint", () => {
  const listings = [
    { breed: "Boerboel", price: 100000 },
    { breed: "Boerboel", price: 200000 },
    { breed: "Boerboel", price: 300000 }, // avg 200k
  ]
  it("flags a below-market price", () => {
    const h = priceHint("Boerboel", 150000, listings)!
    expect(h.verdict).toBe("below")
    expect(h.deltaPct).toBe(-25)
  })
  it("flags an above-market price", () => {
    const h = priceHint("Boerboel", 260000, listings)!
    expect(h.verdict).toBe("above")
    expect(h.deltaPct).toBe(30)
  })
  it("treats near-average as fair", () => {
    expect(priceHint("Boerboel", 205000, listings)!.verdict).toBe("fair")
  })
  it("returns null without enough comparable listings", () => {
    expect(priceHint("Unicorn", 100000, listings)).toBeNull()
  })
})
