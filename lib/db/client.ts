import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.gen";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Singleton del client Supabase con privilegi service-role.
 *
 * - `server-only`: importarlo da un Client Component fa fallire la build.
 *   Il service-role key NON deve mai finire nel bundle inviato al browser.
 * - Ritorna `null` quando le env non sono configurate (build su Vercel senza
 *   secret) cosi' i consumer fanno graceful fallback con `if (!db) return []`.
 * - Niente persistenza sessione: l'auth della webapp e' gestita da Auth.js,
 *   non da Supabase Auth.
 */
export const db: SupabaseClient<Database> | null =
  url && serviceRoleKey
    ? createClient<Database>(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export type Db = NonNullable<typeof db>;
