import { z } from 'zod'

// ── Zod schemas (mirrored from API routes) ──────────────────────────────────

const OfferSchema = z.object({
  petId: z.string().uuid(),
  amount: z.number().positive().max(100_000_000),
  note: z.string().max(500).optional().nullable(),
})

const ReviewSchema = z.object({
  sellerId: z.string().uuid(),
  petId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5).optional().nullable(),
  healthRating: z.number().int().min(1).max(5).optional().nullable(),
  accuracyRating: z.number().int().min(1).max(5).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
})

const PetSchema = z.object({
  name: z.string().min(1).max(100),
  breed: z.string().min(1).max(100),
  gender: z.enum(['male', 'female']),
  price: z.number().positive().max(100_000_000),
  location: z.string().min(1).max(200),
})

// ── Offer validation ─────────────────────────────────────────────────────────

describe('OfferSchema', () => {
  it('accepts a valid offer', () => {
    const result = OfferSchema.safeParse({
      petId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 50000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-UUID petId', () => {
    const result = OfferSchema.safeParse({ petId: 'not-a-uuid', amount: 50000 })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = OfferSchema.safeParse({
      petId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects amount above ceiling', () => {
    const result = OfferSchema.safeParse({
      petId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 200_000_000,
    })
    expect(result.success).toBe(false)
  })
})

// ── Review validation ────────────────────────────────────────────────────────

describe('ReviewSchema', () => {
  const base = {
    sellerId: '123e4567-e89b-12d3-a456-426614174000',
    rating: 5,
  }

  it('accepts a minimal valid review', () => {
    expect(ReviewSchema.safeParse(base).success).toBe(true)
  })

  it('accepts all optional fields', () => {
    const result = ReviewSchema.safeParse({
      ...base,
      communicationRating: 4,
      healthRating: 5,
      accuracyRating: 3,
      comment: 'Great seller!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects rating 0', () => {
    expect(ReviewSchema.safeParse({ ...base, rating: 0 }).success).toBe(false)
  })

  it('rejects rating above 5', () => {
    expect(ReviewSchema.safeParse({ ...base, rating: 6 }).success).toBe(false)
  })

  it('rejects float rating', () => {
    expect(ReviewSchema.safeParse({ ...base, rating: 4.5 }).success).toBe(false)
  })

  it('rejects comment longer than 2000 chars', () => {
    const result = ReviewSchema.safeParse({ ...base, comment: 'x'.repeat(2001) })
    expect(result.success).toBe(false)
  })
})

// ── Pet listing validation ───────────────────────────────────────────────────

describe('PetSchema', () => {
  const base = {
    name: 'Buddy',
    breed: 'Golden Retriever',
    gender: 'male',
    price: 250000,
    location: 'Lagos',
  }

  it('accepts a valid listing', () => {
    expect(PetSchema.safeParse(base).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(PetSchema.safeParse({ ...base, name: '' }).success).toBe(false)
  })

  it('rejects invalid gender', () => {
    expect(PetSchema.safeParse({ ...base, gender: 'unknown' }).success).toBe(false)
  })

  it('rejects negative price', () => {
    expect(PetSchema.safeParse({ ...base, price: -1 }).success).toBe(false)
  })
})
