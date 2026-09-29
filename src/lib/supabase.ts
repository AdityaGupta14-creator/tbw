import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://hxbxrpsikdaczranefrh.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4YnhycHNpa2RhY3pyYW5lZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTQ2ODMsImV4cCI6MjEwNjA5MDY4M30.yGmWjkrEprDh5ZHlfHEmGMPSQEh_VtlWRyW9T4aYbdg";

const getEnvVar = (key: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return "";
};

const supabaseUrl = getEnvVar("VITE_SUPABASE_URL") || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = getEnvVar("VITE_SUPABASE_ANON_KEY") || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("placeholder"));
};

const isBrowser = typeof window !== "undefined";

// If Supabase environment variables are provided, initialize the real client;
// otherwise, use an in-memory/dummy client to prevent runtime exceptions.
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
      },
    })
  : createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
