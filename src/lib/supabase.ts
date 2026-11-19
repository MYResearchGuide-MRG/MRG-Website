import { createClient } from "@supabase/supabase-js"
import { createRememberedSessionStorage } from "./remembered-session"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
// Keep Supabase's existing storage key so already signed-in browsers migrate
// without being asked to enter their credentials again.
const storageKey = url ? `sb-${new URL(url).hostname.split(".")[0]}-auth-token` : ""
export const supabase = url && key ? createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey,
    storage: createRememberedSessionStorage(storageKey),
  },
}) : null
