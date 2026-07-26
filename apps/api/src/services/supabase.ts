import type { SupabaseClient } from "@supabase/server";

let client: SupabaseClient | null = null;

export async function initSupabase(): Promise<SupabaseClient | null> {
  if (client) return client;

  try {
    const mod = await import("@supabase/server");
    const createClient = (mod as any).createClient ?? (mod as any).default ?? (mod as any).createServerClient;
    if (typeof createClient === "function") {
      client = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "");
    }
  } catch (err) {
    // If the package isn't available or initialization fails, leave client null
    console.warn("Supabase init failed:", err?.message ?? err);
    client = null;
  }

  return client;
}

export function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL ?? null,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? null,
    hasSecretKey: !!process.env.SUPABASE_SECRET_KEY
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  return client;
}
