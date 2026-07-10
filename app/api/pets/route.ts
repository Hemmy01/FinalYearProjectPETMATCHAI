import { NextRequest, NextResponse, after } from "next/server"
import { z } from "zod"
import { createAdminClient, verifyToken } from "@/lib/supabase"

const PetSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.enum(["dog", "cat", "bird", "rabbit", "reptile", "fish", "other"]).optional(),
  breed: z.string().min(1).max(100),
  age_months: z.number().int().min(0).max(360).optional(),
  gender: z.enum(["male", "female"]),
  price: z.number().positive().max(100_000_000),
  location: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  size: z.enum(["small", "medium", "large", "extra_large"]).optional().nullable(),
  traits: z.array(z.string()).max(10).optional(),
  health_certificate_url: z.string().url().optional().nullable(),
  vaccinated: z.boolean().optional(),
  dewormed: z.boolean().optional(),
  microchipped: z.boolean().optional(),
  registration_info: z.string().max(500).optional().nullable(),
  pedigree: z.string().max(500).optional().nullable(),
  featured: z.boolean().optional(),
  status: z.enum(["active", "pending", "sold"]).optional(),
  image_url: z.string().url().optional().nullable(),
  image_urls: z.array(z.string().url()).optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const breed = searchParams.get("breed")
  const maxPrice = searchParams.get("maxPrice")
  const minPrice = searchParams.get("minPrice")
  const gender = searchParams.get("gender")
  const sellerId = searchParams.get("sellerId")
  const status = searchParams.get("status")

  const db = createAdminClient()
  let query = db.from("pets").select(`
    *,
    seller:profiles!pets_seller_id_fkey(id, name, location, is_verified, avatar_url)
  `)

  const adminAll = searchParams.get("adminAll") === "true"

  if (sellerId) {
    query = query.eq("seller_id", sellerId)
  } else if (adminAll) {
    // no status filter — admin sees everything
  } else {
    query = query.eq("status", status ?? "active")
  }

  if (type) {
    if (type.toLowerCase() === "other") {
      query = query.neq("species", "dog").neq("species", "cat")
    } else {
      query = query.eq("species", type.toLowerCase())
    }
  }
  if (breed) query = query.ilike("breed", `%${breed}%`)
  if (maxPrice) query = query.lte("price", Number(maxPrice))
  if (minPrice) query = query.gte("price", Number(minPrice))
  if (gender) query = query.eq("gender", gender)

  query = query.order("created_at", { ascending: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: data?.length ?? 0 })
}

export async function POST(req: NextRequest) {
  const raw = await req.json()
  const parsed = PetSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = { ...raw, ...parsed.data }

  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db.from("pets").insert({
    seller_id: user.id,
    name: body.name,
    species: body.species ?? "dog",
    breed: body.breed,
    age_months: Number(body.age_months ?? 0),
    gender: body.gender,
    color: body.color,
    size: body.size ?? null,
    traits: body.traits ?? [],
    health_certificate_url: body.health_certificate_url ?? null,
    price: Number(body.price),
    location: body.location,
    description: body.description,
    vaccinated: body.vaccinated ?? false,
    dewormed: body.dewormed ?? false,
    microchipped: body.microchipped ?? false,
    registration_info: body.registration_info,
    pedigree: body.pedigree,
    image_url: body.image_urls?.[0] ?? body.image_url ?? null,
    featured: body.featured ?? false,
    status: body.status ?? "active",
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Save all images to pet_images table
  if (body.image_urls?.length) {
    await db.from("pet_images").insert(
      body.image_urls.map((url: string, i: number) => ({
        pet_id: data.id,
        url,
        is_primary: i === 0,
      }))
    )
  }

  // Save video if provided
  if (body.video_url) {
    await db.from("pet_videos").insert({ pet_id: data.id, url: body.video_url })
  }

  await db.from("audit_logs").insert({
    user_id: user.id,
    action: "create_listing",
    entity_type: "pet",
    entity_id: data.id,
    details: { name: body.name, breed: body.breed },
  })

  // Notify buyers whose preferences match this new listing
  after(async () => {
    const { data: buyers } = await db
      .from("buyer_preferences")
      .select("user_id, preferred_species, preferred_breeds, budget_max, preferred_location, notification_prefs:profiles!buyer_preferences_user_id_fkey(notification_prefs)")
      .neq("user_id", user.id)
    if (!buyers) return
    const petSpecies = body.species ?? "dog"
    const petBreed = (body.breed as string).toLowerCase()
    const petPrice = Number(body.price)
    const petLocation = (body.location as string).toLowerCase()
    const notifs = buyers
      .filter((b: any) => {
        const prefs = b.notification_prefs as any
        if (prefs?.new_listings === false) return false
        if (b.preferred_species?.length && !b.preferred_species.includes(petSpecies)) return false
        if (b.budget_max && petPrice > Number(b.budget_max)) return false
        if (b.preferred_breeds?.length) {
          const match = b.preferred_breeds.some((br: string) => petBreed.includes(br.toLowerCase()) || br.toLowerCase().includes(petBreed))
          if (!match) return false
        }
        return true
      })
      .map((b: any) => ({
        user_id: b.user_id,
        type: "system",
        title: "New listing matches your preferences!",
        message: `${body.name} (${body.breed}) is now available in ${body.location} for ₦${Number(body.price).toLocaleString()}.`,
        data: { pet_id: data.id },
      }))
    if (notifs.length > 0) {
      await db.from("notifications").insert(notifs)
    }
  })

  return NextResponse.json({ success: true, data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token || !id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Capture current values before update for change detection and audit logging
  const { data: oldPet } = await db.from("pets").select("name, price, status, breed, species, description, vaccinated, dewormed, microchipped, featured, location").eq("id", id).single()

  // Sellers may only edit their own listings; admins can moderate any listing
  // (e.g. approving a pending pet they don't own).
  const { data: actor } = await db.from("profiles").select("role").eq("id", user.id).single()
  const isAdmin = actor?.role === "administrator"

  let updateQuery = db
    .from("pets")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (!isAdmin) updateQuery = updateQuery.eq("seller_id", user.id)

  const { data, error } = await updateQuery.select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log: record field-level diff for any tracked field that changed
  if (oldPet) {
    const tracked = ["name", "price", "status", "breed", "species", "description", "vaccinated", "dewormed", "microchipped", "featured", "location"] as const
    const changedFields: Record<string, { from: unknown; to: unknown }> = {}
    for (const field of tracked) {
      const bval = (oldPet as Record<string, unknown>)[field]
      const aval = (updates as Record<string, unknown>)[field]
      if (aval !== undefined && String(bval) !== String(aval)) {
        changedFields[field] = { from: bval, to: aval }
      }
    }
    if (Object.keys(changedFields).length > 0) {
      void db.from("audit_logs").insert({
        user_id: user.id,
        action: "edit_listing",
        entity_type: "pet",
        entity_id: id,
        details: { changes: changedFields, pet_name: oldPet.name },
      })
    }
  }

  // Fire price-change notifications to buyers who saved this pet
  if (updates.price !== undefined && oldPet && Number(updates.price) !== Number(oldPet.price)) {
    after(async () => {
      const { data: savedRows } = await db
        .from("saved_pets")
        .select("user_id, prefs:profiles!saved_pets_user_id_fkey(notification_prefs)")
        .eq("pet_id", id)
      if (!savedRows) return
      const notifs = savedRows
        .filter((r: any) => r.prefs?.notification_prefs?.price_changes !== false)
        .map((r: any) => ({
          user_id: r.user_id,
          type: "offer",
          title: "Price change on a saved pet",
          message: `${oldPet.name} (${oldPet.breed}) price changed to ₦${Number(updates.price).toLocaleString()}.`,
          data: { pet_id: id },
        }))
      if (notifs.length > 0) await db.from("notifications").insert(notifs)
    })
  }

  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token || !id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Only the seller or an admin can delete
  const { data: pet } = await db.from("pets").select("seller_id").eq("id", id).single()
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
  const isAdmin = profile?.role === "administrator"
  if (pet.seller_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error } = await db.from("pets").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void db.from("audit_logs").insert({
    user_id: user.id,
    action: "delete_listing",
    entity_type: "pet",
    entity_id: id,
    details: { deleted_by: user.id },
  })

  return NextResponse.json({ success: true })
}

