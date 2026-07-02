import { supabase } from "./supabase"

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
}

export const api = {
  async get(path: string) {
    const token = await getToken()
    const res = await fetch(path, {
      headers: token ? authHeaders(token) : { "Content-Type": "application/json" },
    })
    return res.json()
  },

  async post(path: string, body: unknown) {
    const token = await getToken()
    if (!token) throw new Error("Not authenticated")
    const res = await fetch(path, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    })
    return res.json()
  },

  async patch(path: string, body: unknown) {
    const token = await getToken()
    if (!token) throw new Error("Not authenticated")
    const res = await fetch(path, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    })
    return res.json()
  },

  async delete(path: string) {
    const token = await getToken()
    if (!token) throw new Error("Not authenticated")
    const res = await fetch(path, {
      method: "DELETE",
      headers: authHeaders(token),
    })
    return res.json()
  },
}
