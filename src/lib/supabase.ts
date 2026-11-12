import { uiText } from "./event";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
export const preview = !url && !key;
export let configurationError = "";
export let supabase: SupabaseClient | null = null;
if (!preview) {
  try {
    if (!url || !key) throw new Error("Missing configuration");
    supabase = createClient(url, key);
  } catch {
    configurationError = uiText.configurationError;
  }
}
