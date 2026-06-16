import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== confirm) return toast.error("Passwords don't match");
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      toast.success("Password reset. Please log in.");
      nav("/login");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Invalid or expired reset link");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6 relative">
      <div className="absolute inset-0 grid-lines pointer-events-none" />
      <div className="w-full max-w-md relative">
        <div className="border border-border rounded-md bg-card p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="size-8 bg-foreground text-background grid place-items-center"><Sparkles className="size-4" strokeWidth={1.5} /></div>
            <span className="font-display font-medium tracking-tight text-lg">QuotientIQ</span>
          </div>
          <h1 className="font-display font-medium text-2xl tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-2">Choose a new password.</p>

          {!token ? (
            <div className="mt-6 border border-destructive/40 bg-destructive/5 text-sm rounded-md p-4">
              Missing reset token. <Link to="/forgot-password" className="underline">Request a new link</Link>.
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>New password</Label>
                <Input data-testid="reset-pw" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input data-testid="reset-confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button data-testid="reset-submit" disabled={busy} className="w-full bg-foreground text-background">
                {busy ? "Resetting…" : "Reset password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
