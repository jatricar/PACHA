import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "PACHA: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no están configuradas. " +
    "El login no va a funcionar hasta que se configuren estas variables de entorno."
  );
}

// Fall back to a syntactically-valid placeholder so createClient() doesn't
// throw at import time before the real env vars are set (e.g. first local
// run before .env is created) - sign-in will simply fail with a clear error
// in that case, instead of a blank white screen.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
