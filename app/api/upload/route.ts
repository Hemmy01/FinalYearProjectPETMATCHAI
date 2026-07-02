import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
const IMAGE_BUCKETS = ["pet-images", "verification-photos"]
const VIDEO_BUCKETS = ["pet-videos"]

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { user } = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  const bucket = (formData.get("bucket") as string) || "pet-images"

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const isImageBucket = IMAGE_BUCKETS.includes(bucket)
  const isVideoBucket = VIDEO_BUCKETS.includes(bucket)

  if (!isImageBucket && !isVideoBucket) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 })
  }

  if (isImageBucket && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are allowed" }, { status: 400 })
  }

  if (isVideoBucket && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only MP4, WebM, or MOV videos are allowed" }, { status: 400 })
  }

  const maxSize = isVideoBucket ? 100 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({
      error: isVideoBucket ? "Video must be under 100 MB" : "Image must be under 10 MB"
    }, { status: 400 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const db = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data, error } = await db.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from(bucket).getPublicUrl(data.path)

  return NextResponse.json({ success: true, url: publicUrl, path: data.path })
}
