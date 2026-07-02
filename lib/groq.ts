import Groq from 'groq-sdk'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export const GROQ_MODEL = 'llama-3.3-70b-versatile'

export interface PetMatchInput {
  buyer: {
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
  pet: {
    id: string
    name: string
    species: string
    breed: string
    age_months: number
    gender: string
    price: number
    location: string
    vaccinated: boolean
    dewormed: boolean
    microchipped?: boolean
    description: string
    views?: number
    saves?: number
  }
}

export interface MatchFeedbackContext {
  liked: string[]
  disliked: string[]
}

export async function computeMatchScore(input: PetMatchInput): Promise<{ score: number; reasons: string[] }> {
  const results = await computeBatchMatchScores(input.buyer, [input.pet])
  return results.get(input.pet.id) ?? { score: 50, reasons: ['Match score unavailable'] }
}

export async function computeBatchMatchScores(
  buyer: PetMatchInput['buyer'],
  pets: PetMatchInput['pet'][],
  feedback?: MatchFeedbackContext
): Promise<Map<string, { score: number; reasons: string[] }>> {
  if (pets.length === 0) return new Map()

  const petList = pets.map((p, i) =>
    `Pet ${i + 1} | id:${p.id} | species:${p.species} | breed:${p.breed} | age:${p.age_months}mo | gender:${p.gender} | price:₦${p.price} | location:${p.location} | vaccinated:${p.vaccinated} | dewormed:${p.dewormed} | microchipped:${p.microchipped ?? false} | views:${p.views ?? 0} | saves:${p.saves ?? 0} | desc:${p.description?.slice(0, 80) ?? ''}`
  ).join('\n')

  const feedbackBlock = feedback && (feedback.liked.length > 0 || feedback.disliked.length > 0)
    ? `\nBuyer behavioral signals (these OVERRIDE generic matching — weight heavily):
- Previously INTERESTED in: ${feedback.liked.join(', ') || 'none'}
- Previously NOT INTERESTED in: ${feedback.disliked.join(', ') || 'none'}
Boost pets similar to the liked list. Penalise pets similar to the disliked list. Note in reasons when a signal influenced the score.\n`
    : ''

  const healthBlock = (buyer.health_requirements?.length ?? 0) > 0
    ? `- Health requirements: MUST have ${buyer.health_requirements.join(', ')} (deduct 15 pts per missing requirement)`
    : '- Health requirements: none'

  const prompt = `You are a pet matchmaking AI. Score each pet (0–100) for this buyer using STRICT rules below.

BUYER PREFERENCES:
- Preferred species: ${buyer.preferred_species.join(', ') || 'any'}
- Preferred breeds: ${buyer.preferred_breeds.join(', ') || 'any breed'}
- Age range: ${buyer.age_min}–${buyer.age_max} months
- Budget: ₦${buyer.budget_min}–₦${buyer.budget_max}
- Location preference: ${buyer.preferred_location || 'any'}
- Gender preference: ${buyer.preferred_gender}
- Purpose: ${buyer.purpose || 'companionship'}
${healthBlock}
${feedbackBlock}
SCORING RULES (apply every rule to every pet):
1. Species mismatch (buyer has species preference and pet doesn't match) → HARD CAP score at 10
2. Price exceeds buyer budget_max → HARD CAP score at 20
3. Preferred breed specified but pet breed doesn't match → deduct 25 pts
4. Pet age outside buyer's age_min–age_max range → deduct 20 pts
5. Gender mismatch (buyer prefers male/female, pet is opposite) → deduct 15 pts
6. Each missing health requirement (vaccinated/dewormed/microchipped) → deduct 15 pts each
7. Location matches buyer preference → add 10 pts bonus
8. Popular pet (views > 20 or saves > 2) → add up to 5 pts bonus
9. Price below budget_min (too cheap relative to buyer range) → deduct 5 pts
10. All hard requirements met perfectly → base score starts at 70, add bonuses for extras

Always provide exactly 3 short reason strings explaining the score (positive AND negative factors).

PETS TO SCORE:
${petList}

Respond ONLY with valid JSON, no markdown, no explanation:
{"results":[{"id":"<exact-pet-id>","score":<integer 0-100>,"reasons":["<reason1>","<reason2>","<reason3>"]}]}`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: GROQ_MODEL,
    temperature: 0.3,
    max_tokens: 200 + pets.length * 120,
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(content)
  const out = new Map<string, { score: number; reasons: string[] }>()

  for (const r of (Array.isArray(parsed.results) ? parsed.results : [])) {
    out.set(r.id, {
      score: Math.min(100, Math.max(0, Number(r.score) || 0)),
      reasons: Array.isArray(r.reasons) ? r.reasons : [],
    })
  }

  return out
}

export async function generateRecommendations(
  buyerPrefs: PetMatchInput['buyer'],
  availablePets: PetMatchInput['pet'][]
): Promise<string> {
  const prompt = `You are a pet adoption advisor. Based on the buyer's preferences and available pets, write a warm, personalized 2-sentence recommendation summary.

Buyer wants: ${buyerPrefs.preferred_species.join('/')} | Breed: ${buyerPrefs.preferred_breeds.join(', ') || 'any'} | Budget: ₦${buyerPrefs.budget_max} | Purpose: ${buyerPrefs.purpose}
Available pets: ${availablePets.length} listings found matching their criteria.

Write a friendly recommendation message (2 sentences max).`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: GROQ_MODEL,
    temperature: 0.7,
    max_tokens: 150,
  })

  return completion.choices[0]?.message?.content ?? 'We found great matches for you!'
}
