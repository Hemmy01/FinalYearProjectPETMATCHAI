import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser/client-side client (uses anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client — verifies user tokens and queries with RLS
// Pass the user's access token so queries run under the user's permissions
export function createAdminClient(userToken?: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  const client = createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: userToken
      ? { headers: { Authorization: `Bearer ${userToken}` } }
      : {},
  })
  return client
}

// Verify a user JWT and return their user object
export async function verifyToken(token: string) {
  // Use a plain anon client to verify the token via Supabase auth
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error } = await client.auth.getUser(token)
  return { user: error ? null : user, error }
}
