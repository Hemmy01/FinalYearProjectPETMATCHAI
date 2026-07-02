import { NextRequest, NextResponse } from "next/server"

const cache = new Map<string, { lat: number; lng: number } | null>()

export async function GET(req: NextRequest) {
  const location = new URL(req.url).searchParams.get("location")
  if (!location) return NextResponse.json({ lat: null, lng: null })

  if (cache.has(location)) return NextResponse.json(cache.get(location) ?? { lat: null, lng: null })

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=ng`,
      { headers: { "User-Agent": "PetMatchAI/1.0 (famhemmy3@gmail.com)" }, next: { revalidate: 86400 } }
    )
    const data = await res.json()
    if (!data?.length) {
      cache.set(location, null)
      return NextResponse.json({ lat: null, lng: null })
    }
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    cache.set(location, result)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ lat: null, lng: null })
  }
}
