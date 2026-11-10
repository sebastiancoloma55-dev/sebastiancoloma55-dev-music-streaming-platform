import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && key && !key.startsWith("REEMPLAZAR"));
export const supabase = supabaseReady && url && key ? createClient(url, key) : null;
