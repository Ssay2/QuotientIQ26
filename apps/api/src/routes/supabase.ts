import { Router } from "express";
import { initSupabase, supabaseConfig, getSupabaseClient } from "../services/supabase.js";

export const supabaseRouter = Router();

supabaseRouter.get("/supabase/ping", async (_req, res) => {
  try {
    const client = await initSupabase();
    const cfg = supabaseConfig();

    res.json({
      configured: !!cfg.url,
      hasSecret: cfg.hasSecretKey,
      clientAvailable: !!client
    });
  } catch (err) {
    res.status(500).json({ error: "Supabase ping failed" });
  }
});

supabaseRouter.get("/supabase/config", (_req, res) => {
  const cfg = supabaseConfig();
  res.json({ config: cfg, clientPresent: !!getSupabaseClient() });
});
