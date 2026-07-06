import { createClient } from "@supabase/supabase-js";

// Supabase credentials provided by the user (configured with fallbacks for local development)
const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

const SUPABASE_URL = (typeof rawUrl === "string" && rawUrl.trim().startsWith("http"))
  ? rawUrl.trim()
  : "https://kplblyjyxbtwugpmdujly.supabase.co";

const SUPABASE_ANON_KEY = (typeof rawKey === "string" && rawKey.trim().length > 10 && !rawKey.trim().startsWith("YOUR_"))
  ? rawKey.trim()
  : "sb_publishable_N714O3C1hPp9oP4Hxx1lGQ_HIW7clGZ";

/**
 * CLIENT-SIDE SUPABASE SECURITY WARNING:
 * These client-side credentials are safe for public/publishable use in static frontends like GitHub Pages.
 * Row Level Security (RLS) rules should be enabled in your Supabase backend to secure data isolation between user accounts.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
