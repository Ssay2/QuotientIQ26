import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [devToken, setDevToken] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSent(true);
      if (data.dev_token) setDevToken(data.dev_token);
    } catch (err) {
      setSent(true);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6 relative">
      <div className="absolute inset-0 grid-lines pointer-events-none" />
      <div className="w-full max-w-md relative">
        <Link to="/login" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-8 hover:text-foreground">
          <ArrowLeft className="size-3" /> Back to login
        </Link>
        <div className="border border-border rounded-md bg-card p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="size-8 bg-foreground text-background grid place-items-center"><Sparkles className="size-4" strokeWidth={1.5} /></div>
            <span className="font-display font-medium tracking-tight text-lg">QuotientIQ</span>
          </div>
          <h1 className="font-display font-medium text-2xl tracking-tight">Forgot password?</h1>
          <p className="text-sm text-muted-foreground mt-2">Enter your email and we'll send a reset link.</p>

          {!sent ? (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input data-testid="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button data-testid="forgot-submit" disabled={busy} className="w-full bg-foreground text-background">
                {busy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="border border-emerald-500/30 bg-emerald-500/5 text-sm rounded-md p-4" data-testid="forgot-sent">
                If <span className="font-mono">{email}</span> exists, a password-reset link has been sent.
              </div>
              {devToken && (
                <div className="border border-amber-500/40 bg-amber-500/5 text-xs rounded-md p-3 font-mono break-all" data-testid="dev-token">
                  DEV mode token: <br />
                  <Link className="underline text-foreground" to={`/reset-password?token=${devToken}`}>/reset-password?token={devToken}</Link>
                </div>
              )}
              <Link to="/login" className="text-sm underline text-foreground">Return to login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
