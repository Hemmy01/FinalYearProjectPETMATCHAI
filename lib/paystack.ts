// Thin Paystack wrapper. When PAYSTACK_SECRET_KEY is not set, the app runs in
// "demo mode": no real gateway calls are made and payments are simulated so the
// escrow flow is fully demonstrable without any account or real money.

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

export async function paystackVerify(reference: string): Promise<boolean> {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  })
  const json = await res.json()
  return json?.data?.status === "success"
}
