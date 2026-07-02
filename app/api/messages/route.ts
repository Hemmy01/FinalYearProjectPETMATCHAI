import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, verifyToken } from "@/lib/supabase"
import { emailNewMessage } from "@/lib/email"
import { smsNewMessage } from "@/lib/sms"
import { sendPushToUser } from "@/lib/push"

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const threadId = new URL(req.url).searchParams.get("threadId")

  if (threadId) {
    // Fetch messages in a specific thread
    const { data, error } = await db
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(id, name, avatar_url)")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Mark messages as read
    await db
      .from("messages")
      .update({ is_read: true })
      .eq("thread_id", threadId)
      .neq("sender_id", user.id)

    return NextResponse.json({ data: data ?? [] })
  }

  // Fetch all threads for the user
  const { data, error } = await db
    .from("message_threads")
    .select(`
      *,
      pet:pets!message_threads_pet_id_fkey(id, name, breed, image_url),
      buyer:profiles!message_threads_buyer_id_fkey(id, name, avatar_url),
      seller:profiles!message_threads_seller_id_fkey(id, name, avatar_url)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = createAdminClient()
  const { user } = await verifyToken(token!)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId, petId, sellerId, content } = body

  let thread_id = threadId

  // Create thread if it doesn't exist
  if (!thread_id && petId && sellerId) {
    const { data: existing } = await db
      .from("message_threads")
      .select("id")
      .eq("pet_id", petId)
      .eq("buyer_id", user.id)
      .eq("seller_id", sellerId)
      .single()

    if (existing) {
      thread_id = existing.id
    } else {
      const { data: newThread, error: threadErr } = await db
        .from("message_threads")
        .insert({ pet_id: petId, buyer_id: user.id, seller_id: sellerId })
        .select()
        .single()
      if (threadErr) return NextResponse.json({ error: threadErr.message }, { status: 500 })
      thread_id = newThread.id
    }
  }

  if (!thread_id) return NextResponse.json({ error: "Missing thread context" }, { status: 400 })

  const { data: message, error: msgErr } = await db
    .from("messages")
    .insert({ thread_id, sender_id: user.id, content })
    .select()
    .single()

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  // Update thread last message and notify+email recipient
  const { data: thread } = await db
    .from("message_threads")
    .update({ last_message: content, last_message_at: new Date().toISOString() })
    .eq("id", thread_id)
    .select("*, pet:pets!message_threads_pet_id_fkey(name), buyer:profiles!message_threads_buyer_id_fkey(id, name, email, phone, notification_prefs), seller:profiles!message_threads_seller_id_fkey(id, name, email, phone, notification_prefs)")
    .single()

  if (thread) {
    const isBuyer = thread.buyer_id === user.id
    const recipientId = isBuyer ? thread.seller_id : thread.buyer_id
    const recipient = isBuyer ? thread.seller : thread.buyer
    const senderName = isBuyer ? thread.buyer?.name : thread.seller?.name
    const petName = thread.pet?.name ?? "a pet"
    const prefs = recipient?.notification_prefs as Record<string, boolean> | null

    void db.from("notifications").insert({
      user_id: recipientId,
      type: "message",
      title: "New message",
      message: `${senderName}: ${content.slice(0, 80)}`,
      data: { thread_id, pet_name: petName },
    })

    void sendPushToUser(recipientId, {
      title: `New message from ${senderName}`,
      body: content.slice(0, 120),
      url: `/messages?thread=${thread_id}`,
    })

    if (recipient?.email && prefs?.channel_email !== false) {
      void emailNewMessage(recipient.email, senderName ?? "Someone", petName, content.slice(0, 200))
    }
    if (recipient?.phone && prefs?.channel_sms === true) {
      void smsNewMessage(recipient.phone, senderName ?? "Someone", petName)
    }
  }

  return NextResponse.json({ success: true, data: message, threadId: thread_id }, { status: 201 })
}

