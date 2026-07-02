import webpush from "web-push"
import { createAdminClient } from "./supabase"

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:famhemmy3@gmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!process.env.VAPID_PRIVATE_KEY) return

  const db = createAdminClient()
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", userId)

  if (!subs?.length) return

  await Promise.all(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription as webpush.PushSubscription, JSON.stringify(payload))
      } catch (err: unknown) {
        // 410 Gone = subscription expired — clean it up
        if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
          await db.from("push_subscriptions").delete().eq("id", row.id)
        }
      }
    })
  )
}
