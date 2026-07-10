import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { verifyWebhookSignature } from "@/lib/paystack"
import { settleToEscrow } from "@/lib/escrow"

// Paystack webhook — the AUTHORITATIVE record of a successful charge.
// Unlike the browser redirect (which the buyer can abandon), Paystack calls this
// server-to-server, so a paid charge is always recorded into escrow even if the
// buyer closes the tab. Authenticated by HMAC signature, not a user token.
export async function POST(req: NextRequest) {
  const raw = await req.text()
  const signature = req.headers.get("x-paystack-signature")
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: { event?: string; data?: { reference?: string; amount?: number; currency?: string } }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 })
  }

  // We only act on successful charges for references we issued (`pmx-*`).
  if (event.event === "charge.success" && event.data?.reference?.startsWith("pmx-")) {
    const db = createAdminClient()
    const { data: tx } = await db.from("transactions").select("*").eq("reference", event.data.reference).single()

    if (tx && tx.status === "pending") {
      // Validate the amount actually paid matches what was owed.
      const expectedKobo = Math.round(Number(tx.amount) * 100)
      const paidKobo = Number(event.data.amount ?? 0)
      const currency = event.data.currency ?? "NGN"
      if (paidKobo === expectedKobo && currency === "NGN") {
        await settleToEscrow(db, tx)
      }
      // On mismatch we intentionally leave it `pending` for manual review rather
      // than escrow a wrong amount.
    }
  }

  // Always 200 on a valid signature so Paystack doesn't retry-storm.
  return NextResponse.json({ received: true })
}
