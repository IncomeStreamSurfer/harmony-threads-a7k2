import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_VAR  = import.meta.env.PUBLIC_SUPABASE_URL  ?? process.env.PUBLIC_SUPABASE_URL  ?? "";
const ANON = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = import.meta.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE ?? "";

/** Public anon client — RLS gated. Returns null if env missing. */
export function anonClient(): SupabaseClient | null {
  if (!URL_VAR || !ANON) return null;
  return createClient(URL_VAR, ANON, { auth: { persistSession: false } });
}

/** Service-role client — server-only, bypasses RLS. */
export function serviceClient(): SupabaseClient | null {
  if (!URL_VAR || !SERVICE) return null;
  return createClient(URL_VAR, SERVICE, { auth: { persistSession: false } });
}

/** SSR client with cookie-based session (for auth pages). */
export function ssrClient(cookies: any): SupabaseClient {
  if (!URL_VAR || !ANON) {
    return createClient("https://placeholder.supabase.co", "placeholder", { auth: { persistSession: false } });
  }
  return createClient(URL_VAR, ANON, {
    auth: {
      persistSession: false,
      flowType: "pkce",
    },
    global: {
      headers: {
        Cookie: cookies?.toString?.() ?? "",
      },
    },
  });
}
