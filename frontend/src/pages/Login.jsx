import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowLeft } from "lucide-react";
import { useAuth, formatErr } from "@/lib/auth";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      nav(loc.state?.from || "/dashboard");
    } catch (e) {
      const msg = formatErr(e?.response?.data?.detail) || e.message;
      setErr(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left visual */}
      <aside className="hidden lg:flex flex-col justify-between bg-black text-white p-10 relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-10" />
        <Link to="/" className="flex items-center gap-2 relative" data-testid="auth-brand">
          <div className="size-7 bg-white grid place-items-center">
            <Sparkles className="size-4 text-black" strokeWidth={1.5} />
          </div>
          <span className="font-display font-medium tracking-tight text-lg">QuotientIQ</span>
        </Link>
        <div className="relative">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-6">// the workforce, reimagined</div>
          <p className="font-display font-medium text-3xl lg:text-4xl tracking-tighter leading-tight">
            "We deployed our customer support agent on a Tuesday. By Friday it had handled 412 conversations and one human refund."
          </p>
          <div className="mt-8 font-mono text-xs text-white/60">— Head of CX, Northwind</div>
        </div>
        <div className="relative font-mono text-[10px] uppercase tracking-widest text-white/40">SOC2 · GDPR · ISO27001</div>
      </aside>

      {/* Right form */}
      <main className="flex flex-col">
        <div className="p-6 lg:p-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground u-link" data-testid="back-home">
            <ArrowLeft className="size-3.5" strokeWidth={1.5} /> Back home
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">// sign in</div>
            <h1 className="font-display font-medium text-4xl tracking-tighter">Welcome back.</h1>
            <p className="mt-3 text-muted-foreground">Sign in to manage your AI workforce.</p>

            <form onSubmit={onSubmit} className="mt-10 space-y-5" data-testid="login-form">
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email</Label>
                <Input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="h-11 border-border rounded-md" />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Password</Label>
                <Input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 border-border rounded-md" />
              </div>

              {err && <div className="text-sm text-destructive font-mono" data-testid="login-error">{err}</div>}

              <Button type="submit" disabled={busy} data-testid="login-submit" className="w-full h-11 bg-black text-white hover:bg-black/90 rounded-md">
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-sm text-muted-foreground">
              No account? <Link to="/register" className="text-foreground u-link font-medium" data-testid="link-register">Start a free trial</Link>
            </div>

            <div className="mt-10 p-4 border border-border bg-muted/30 rounded-md font-mono text-xs text-muted-foreground" data-testid="demo-credentials">
              <div className="mb-1 font-medium text-foreground">Demo account</div>
              admin@quotientiq.com / admin123
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
