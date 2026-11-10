import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_SUPABASE_URL = "https://sbzbfieiemqnclcdoczk.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiemJmaWVpZW1xbmNsY2RvY3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMTY2MjAsImV4cCI6MjEwOTg5MjYyMH0.AC_9I57_cCLIrIgAlSluMCxsCxQYUYGiBhEZTfLqRyw";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

let clientInstance: SupabaseClient | null = null;

/**
 * Returns whether Supabase credentials have been configured in environment variables or default constants.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Retrieves the initialized Supabase client.
 * Returns null if environment variables are not yet configured.
 */
export function getSupabase(): SupabaseClient | null {
  if (clientInstance) {
    return clientInstance;
  }

  if (isSupabaseConfigured()) {
    clientInstance = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return clientInstance;
  }

  return null;
}
