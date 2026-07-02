// Unit tests for Groq batch scoring — Groq SDK is mocked, no real API calls.

const mockCreate = jest.fn()

jest.mock('groq-sdk', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }))
)

import { computeBatchMatchScores } from '../lib/groq'

const buyer = {
  preferred_species: ['dog'],
  preferred_breeds: ['Golden Retriever'],
  age_min: 0,
  age_max: 24,
  budget_min: 0,
  budget_max: 500000,
  preferred_location: 'Lagos',
  preferred_gender: 'any',
  purpose: 'companionship',
  health_requirements: [],
}

const pet = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Buddy',
  species: 'dog',
  breed: 'Golden Retriever',
  age_months: 8,
  gender: 'male',
  price: 250000,
  location: 'Lagos',
  vaccinated: true,
  dewormed: true,
  description: 'Friendly pup',
  views: 12,
  saves: 3,
}

function mockGroqResponse(results: { id: string; score: number; reasons: string[] }[]) {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify({ results }) } }],
  })
}

describe('computeBatchMatchScores', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns an empty map for zero pets', async () => {
    const result = await computeBatchMatchScores(buyer, [])
    expect(result.size).toBe(0)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('parses Groq response and returns correct score', async () => {
    mockGroqResponse([{ id: pet.id, score: 87, reasons: ['Great breed', 'In budget', 'Lagos match'] }])
    const result = await computeBatchMatchScores(buyer, [pet])
    const entry = result.get(pet.id)
    expect(entry?.score).toBe(87)
    expect(entry?.reasons).toHaveLength(3)
    expect(entry?.reasons[0]).toBe('Great breed')
  })

  it('clamps score above 100 to 100', async () => {
    mockGroqResponse([{ id: pet.id, score: 999, reasons: ['test'] }])
    const result = await computeBatchMatchScores(buyer, [pet])
    expect(result.get(pet.id)?.score).toBe(100)
  })

  it('clamps negative score to 0', async () => {
    mockGroqResponse([{ id: pet.id, score: -50, reasons: ['test'] }])
    const result = await computeBatchMatchScores(buyer, [pet])
    expect(result.get(pet.id)?.score).toBe(0)
  })

  it('returns empty map when Groq response is malformed', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"results": "bad"}' } }],
    })
    const result = await computeBatchMatchScores(buyer, [pet])
    expect(result.size).toBe(0)
  })

  it('sends a single API call for multiple pets', async () => {
    const pet2 = { ...pet, id: '223e4567-e89b-12d3-a456-426614174000', name: 'Max' }
    mockGroqResponse([
      { id: pet.id, score: 90, reasons: ['r1', 'r2', 'r3'] },
      { id: pet2.id, score: 70, reasons: ['r1', 'r2', 'r3'] },
    ])
    const result = await computeBatchMatchScores(buyer, [pet, pet2])
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(result.size).toBe(2)
    expect(result.get(pet.id)?.score).toBe(90)
    expect(result.get(pet2.id)?.score).toBe(70)
  })
})
