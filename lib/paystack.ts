// Thin Paystack wrapper. When PAYSTACK_SECRET_KEY is not set, the app runs in
// "demo mode": no real gateway calls are made and payments are simulated so the
// escrow flow is fully demonstrable without any account or real money.

import crypto from "crypto"

const SECRET = process.env.PAYSTACK_SECRET_KEY

export const paystackEnabled = !!SECRET

export async function paystackInitialize(params: {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
}): Promise<{ authorizationUrl: string }> {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      currency: "NGN",
    }),
  })
  const json = await res.json()
  if (!json.status) throw new Error(json.message || "Paystack initialization failed")
  return { authorizationUrl: json.data.authorization_url as string }
}

export interface PaystackVerifyResult {
  ok: boolean          // charge succeeded
  amountKobo: number   // amount actually paid, in kobo
  currency: string
}

// Confirm a charge with Paystack AND report the amount/currency actually paid, so
// callers can validate the buyer paid exactly what was expected (no under/over-pay).
export async function paystackVerify(reference: string): Promise<PaystackVerifyResult> {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  })
  const json = await res.json()
  const d = json?.data
  return {
    ok: d?.status === "success",
    amountKobo: Number(d?.amount ?? 0),
    currency: d?.currency ?? "NGN",
  }
}

// Ask Paystack to reverse a settled/charged transaction back to the buyer.
// Returns true when Paystack accepts the refund request.
export async function paystackRefund(reference: string): Promise<boolean> {
  if (!SECRET) return false
  const res = await fetch("https://api.paystack.co/refund", {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: reference }),
  })
  const json = await res.json()
  return !!json.status
}

// Verify a Paystack webhook came from Paystack: HMAC-SHA512 of the RAW body,
// keyed with the secret key, must equal the x-paystack-signature header.
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!SECRET || !signature) return false
  const hash = crypto.createHmac("sha512", SECRET).update(rawBody).digest("hex")
  // Constant-time compare to avoid timing leaks.
  const a = Buffer.from(hash)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
