import { NextRequest, NextResponse, after } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"
import { computeBatchMatchScores } from "@/lib/groq"

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)

  // Saved pets mode
  if (searchParams.get("saved") === "true") {
    const { data, error } = await db
      .from("saved_pets")
      .select("*, pet:pets(*, seller:profiles!pets_seller_id_fkey(id, name, is_verified))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const pets = (data ?? []).map((row: { pet: unknown }) => row.pet).filter(Boolean)
    return NextResponse.json({ data: pets, total: pets.length })
  }

  // History mode — all AI-scored pets for this buyer
  if (searchParams.get("history") === "true") {
    const { data } = await db
      .from("ai_matches")
      .select("pet_id, score, reasons, feedback, match_status, updated_at, pet:pets(id, name, breed, species, price, location, image_url, seller:profiles!pets_seller_id_fkey(id, name))")
      .eq("buyer_id", user.id)
      .order("updated_at", { ascending: false })
    const items = (data ?? []).map((r: any) => ({
      ...r.pet,
      matchScore: r.score,
      matchReasons: r.reasons ?? [],
      matchStatus: r.match_status ?? "pending",
      feedback: r.feedback,
      updatedAt: r.updated_at,
    }))
    return NextResponse.json({ data: items })
  }

  // Follow-up mode — accepted matches with stale/no thread activity (>3 days)
  if (searchParams.get("followup") === "true") {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: accepted } = await db
      .from("ai_matches")
      .select("pet_id, score, pet:pets(id, name, breed, species, price, image_url, seller:profiles!pets_seller_id_fkey(id, name))")
      .eq("buyer_id", user.id)
      .eq("match_status", "accepted")

    if (!accepted?.length) return NextResponse.json({ data: [] })

    const petIds = accepted.map((a: any) => a.pet_id)
    const { data: threads } = await db
      .from("message_threads")
      .select("pet_id, last_message_at")
      .eq("buyer_id", user.id)
      .in("pet_id", petIds)

    const threadMap = new Map((threads ?? []).map((t: any) => [t.pet_id, t.last_message_at as string]))
    const stale = accepted.filter((a: any) => {
      const last = threadMap.get(a.pet_id)
      return !last || last < threeDaysAgo
    })

    return NextResponse.json({ data: stale.map((a: any) => ({ ...a.pet, matchScore: a.score })) })
  }

  // Load buyer preferences, active pets, cached scores, save counts, and past feedback — all in parallel
  const [prefsRes, petsRes, cachedRes, savesRes, feedbackRes] = await Promise.all([
    db.from("buyer_preferences").select("*").eq("user_id", user.id).single(),
    db.from("pets").select("*, seller:profiles!pets_seller_id_fkey(id, name, is_verified)").eq("status", "active").order("created_at", { ascending: false }).limit(50),
    db.from("ai_matches").select("*").eq("buyer_id", user.id),
    db.from("saved_pets").select("pet_id").eq("user_id", user.id).then(({ data }) => new Set((data ?? []).map((r: { pet_id: string }) => r.pet_id))),
    db.from("ai_matches").select("feedback, pet:pets(species, breed)").eq("buyer_id", user.id).not("feedback", "is", null),
  ])

  const prefs = prefsRes.data
  if (petsRes.error) return NextResponse.json({ error: petsRes.error.message }, { status: 500 })
  const cached = new Map((cachedRes.data ?? []).map((s: { pet_id: string; score: number; reasons: string[]; feedback: string | null; match_status: string | null }) => [s.pet_id, s]))
  // Declined matches are a deliberate dismissal — drop them from the active matchmaking list entirely
  const pets = (petsRes.data ?? []).filter((p) => cached.get(p.id)?.match_status !== "declined")
  if (pets.length === 0) return NextResponse.json({ data: [], total: 0 })

  const savedPetIds = savesRes

  const liked = new Set<string>()
  const disliked = new Set<string>()
  for (const row of (feedbackRes.data ?? []) as unknown as { feedback: string; pet: { species: string; breed: string } | null }[]) {
    if (!row.pet) continue
    const label = `${row.pet.species} ${row.pet.breed}`
    if (row.feedback === "interested") liked.add(label)
    else if (row.feedback === "not_interested") disliked.add(label)
  }
  const feedbackContext = { liked: Array.from(liked), disliked: Array.from(disliked) }

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

  // Separate cached vs uncached pets
  const uncached = pets.filter((p) => !cached.has(p.id))

  // Batch-score all uncached pets in one Groq call (FR-31: include views/saves signals)
  let batchScores = new Map<string, { score: number; reasons: string[] }>()
  if (uncached.length > 0) {
    try {
      batchScores = await computeBatchMatchScores(
        buyerPrefs,
        uncached.map((p) => ({
          id: p.id,
          name: p.name,
          species: p.species,
          breed: p.breed,
          age_months: p.age_months,
          gender: p.gender,
          price: p.price,
          location: p.location,
          vaccinated: p.vaccinated,
          dewormed: p.dewormed,
          microchipped: p.microchipped,
          description: p.description ?? "",
          views: p.views ?? 0,
          saves: savedPetIds.has(p.id) ? 1 : 0,
        })),
        feedbackContext
      )

      // Cache all newly computed scores
      const toCache = Array.from(batchScores.entries()).map(([petId, { score, reasons }]) => ({
        buyer_id: user.id,
        pet_id: petId,
        score,
        reasons,
        updated_at: new Date().toISOString(),
      }))
      if (toCache.length > 0) {
        after(() => db.from("ai_matches").upsert(toCache, { onConflict: "buyer_id,pet_id" }))
      }
    } catch {
      // Fall back to 50 for all uncached
    }
  }

  const results = pets.map((pet) => {
    const score = cached.get(pet.id)?.score ?? batchScores.get(pet.id)?.score ?? 50
    const reasons = cached.get(pet.id)?.reasons ?? batchScores.get(pet.id)?.reasons ?? ["Match score unavailable"]
    const feedback = cached.get(pet.id)?.feedback ?? null
    const matchStatus = cached.get(pet.id)?.match_status ?? "pending"
    return { ...pet, matchScore: score, matchReasons: reasons, initialSaved: savedPetIds.has(pet.id), feedback, matchStatus }
  })

  results.sort((a, b) => b.matchScore - a.matchScore)

  // Auto-notify buyer about newly computed high-score matches (≥75%), gated by notif prefs
  const { data: notifPrefs } = await db.from("profiles").select("notification_prefs").eq("id", user.id).single()
  const matchNotifsEnabled = notifPrefs?.notification_prefs?.new_matches !== false
  const highScoreNewPets = results.filter(
    (r) => r.matchScore >= 75 && !cached.has(r.id) && batchScores.has(r.id)
  )
  if (matchNotifsEnabled && highScoreNewPets.length > 0) {
    after(() => db.from("notifications").insert(
      highScoreNewPets.map((p) => ({
        user_id: user.id,
        type: "match",
        title: `New ${p.matchScore}% match: ${p.name}`,
        message: `${p.name} (${p.breed}) is a strong match for your preferences.`,
        data: { pet_id: p.id },
      }))
    ))
  }

  return NextResponse.json({ data: results, total: results.length })
}

export async function POST(req: NextRequest) {
  const { petId, action } = await req.json()
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (action === "save") {
    await db.from("saved_pets").upsert({ user_id: user.id, pet_id: petId }, { onConflict: "user_id,pet_id" })
  } else if (action === "unsave") {
    await db.from("saved_pets").delete().eq("user_id", user.id).eq("pet_id", petId)
  } else if (action === "interested" || action === "not_interested") {
    const feedbackAt = new Date().toISOString()
    const { data: updated } = await db.from("ai_matches")
      .update({ feedback: action, feedback_at: feedbackAt })
      .eq("buyer_id", user.id)
      .eq("pet_id", petId)
      .select("id")

    // No cached row yet (e.g. it was just cleared by an earlier feedback action below) — insert one
    if (!updated || updated.length === 0) {
      await db.from("ai_matches").insert({
        buyer_id: user.id,
        pet_id: petId,
        score: 50,
        reasons: [],
        feedback: action,
        feedback_at: feedbackAt,
      })
    }

    // New behavioral signal recorded — clear cached scores for not-yet-rated pets
    // so the next fetch re-scores them with this feedback factored in
    await db.from("ai_matches")
      .delete()
      .eq("buyer_id", user.id)
      .is("feedback", null)
  } else if (action === "revert") {
    // Un-accept a match — sets it back to pending so buyer can reconsider
    // Keeps the message thread intact (conversation already started)
    await db.from("ai_matches")
      .update({ match_status: "pending" })
      .eq("buyer_id", user.id)
      .eq("pet_id", petId)
    return NextResponse.json({ success: true, petId, action })

  } else if (action === "accept" || action === "decline") {
    const matchStatus = action === "accept" ? "accepted" : "declined"
    const { data: existing } = await db.from("ai_matches")
      .select("id, match_status")
      .eq("buyer_id", user.id)
      .eq("pet_id", petId)
      .single()
    const alreadyAccepted = existing?.match_status === "accepted"

    if (existing) {
      await db.from("ai_matches").update({ match_status: matchStatus }).eq("id", existing.id)
    } else {
      await db.from("ai_matches").insert({
        buyer_id: user.id,
        pet_id: petId,
        score: 50,
        reasons: [],
        match_status: matchStatus,
      })
    }

    if (action === "accept" && alreadyAccepted) {
      // Already accepted earlier — don't re-send the starter message/notification, just hand back the thread
      const { data: thread } = await db.from("message_threads")
        .select("id")
        .eq("pet_id", petId)
        .eq("buyer_id", user.id)
        .single()
      return NextResponse.json({ success: true, petId, action, threadId: thread?.id })
    }

    if (action === "accept") {
      const { data: pet } = await db.from("pets").select("seller_id, name").eq("id", petId).single()
      if (pet?.seller_id) {
        const { data: buyer } = await db.from("profiles").select("name").eq("id", user.id).single()

        const { data: existingThread } = await db.from("message_threads")
          .select("id")
          .eq("pet_id", petId)
          .eq("buyer_id", user.id)
          .eq("seller_id", pet.seller_id)
          .single()

        let threadId = existingThread?.id as string | undefined
        if (!threadId) {
          const { data: newThread } = await db.from("message_threads")
            .insert({ pet_id: petId, buyer_id: user.id, seller_id: pet.seller_id })
            .select("id")
            .single()
          threadId = newThread?.id
        }

        if (threadId) {
          const starterMessage = `Hi! I'd love to learn more about ${pet.name ?? "this pet"} — looks like a great match for me.`
          await db.from("messages").insert({ thread_id: threadId, sender_id: user.id, content: starterMessage })
          await db.from("message_threads")
            .update({ last_message: starterMessage, last_message_at: new Date().toISOString() })
            .eq("id", threadId)

          after(() => db.from("notifications").insert({
            user_id: pet.seller_id,
            type: "match",
            title: "New match request!",
            message: `${buyer?.name ?? "A buyer"} accepted an AI match for ${pet.name ?? "your pet"} and started a conversation.`,
            data: { pet_id: petId, thread_id: threadId },
          }))
        }

        return NextResponse.json({ success: true, petId, action, threadId })
      }
    }
  }

  return NextResponse.json({ success: true, petId, action })
}
