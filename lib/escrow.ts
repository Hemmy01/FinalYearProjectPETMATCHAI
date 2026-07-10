// Shared escrow-settlement logic, used by BOTH the browser "verify" path and the
// Paystack webhook. Whichever confirmation arrives first performs the transition;
// the other becomes a no-op. This is what makes payment recording reliable even
// if the buyer closes the tab before the redirect callback fires.

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SettleTx {
  id: string
  pet_id: string
  seller_id: string
  amount: number
}

// Idempotently move a verified payment into escrow. Returns the updated row when
// THIS call performed the transition, or null if it was already settled (so the
// caller knows not to double-notify).
export async function settleToEscrow(db: any, tx: SettleTx): Promise<Record<string, unknown> | null> {
  // The `.eq("status", "pending")` guard makes this race-safe: only one caller
  // can move a given row out of `pending`, so exactly one performs the side effects.
  const { data: updated } = await db
    .from("transactions")
    .update({ status: "paid_escrow", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", tx.id)
    .eq("status", "pending")
    .select()
    .maybeSingle()

  if (!updated) return null

  await db.from("pets").update({ status: "pending" }).eq("id", tx.pet_id)
  await db.from("notifications").insert({
    user_id: tx.seller_id,
    type: "system",
    title: "Payment received — held in escrow 🔒",
    message: `A buyer has paid ₦${Number(tx.amount).toLocaleString()} into escrow. Funds are released to you once the buyer confirms handover.`,
    data: { transaction_id: tx.id },
  })
  return updated
}
