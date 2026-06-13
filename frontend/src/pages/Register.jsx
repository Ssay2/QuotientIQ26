import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowLeft } from "lucide-react";
import { useAuth, formatErr } from "@/lib/auth";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await register(form);
      toast.success("Account created. Welcome to QuotientIQ.");
      nav("/dashboard");
    } catch (e) {
      const msg = formatErr(e?.response?.data?.detail) || e.message;
      setErr(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <aside className="hidden lg:flex flex-col justify-between bg-black text-white p-10 relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-10" />
        <Link to="/" className="flex items-center gap-2 relative">
          <div className="size-7 bg-white grid place-items-center">
            <Sparkles className="size-4 text-black" strokeWidth={1.5} />
          </div>
          <span className="font-display font-medium tracking-tight text-lg">QuotientIQ</span>
        </Link>
        <div className="relative">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-6">// the workforce, reimagined</div>
          <p className="font-display font-medium text-3xl lg:text-4xl tracking-tighter leading-tight">
            Hire your first AI employee in under 4 minutes. No credit card. Cancel anytime.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-px bg-white/10 border border-white/10">
          {[{k:"14", v:"day trial"},{k:"8+", v:"agent types"},{k:"24/7", v:"uptime"}].map(s => (
            <div key={s.v} className="bg-black p-4">
              <div className="font-display font-medium text-2xl">{s.k}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.v}</div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex flex-col">
        <div className="p-6 lg:p-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground u-link">
            <ArrowLeft className="size-3.5" strokeWidth={1.5} /> Back home
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">// create account</div>
            <h1 className="font-display font-medium text-4xl tracking-tighter">Start hiring AI.</h1>
            <p className="mt-3 text-muted-foreground">14 days free. No credit card required.</p>

            <form onSubmit={onSubmit} className="mt-10 space-y-5" data-testid="register-form">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Name</Label>
                  <Input data-testid="reg-name" required value={form.name} onChange={upd("name")} placeholder="Ada Lovelace" className="h-11 border-border rounded-md" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Company</Label>
                  <Input data-testid="reg-company" value={form.company} onChange={upd("company")} placeholder="Acme Co" className="h-11 border-border rounded-md" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Work email</Label>
                <Input data-testid="reg-email" type="email" required value={form.email} onChange={upd("email")} placeholder="you@company.com" className="h-11 border-border rounded-md" />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Password</Label>
                <Input data-testid="reg-password" type="password" required minLength={6} value={form.password} onChange={upd("password")} placeholder="At least 6 characters" className="h-11 border-border rounded-md" />
              </div>

              {err && <div className="text-sm text-destructive font-mono" data-testid="register-error">{err}</div>}

              <Button type="submit" disabled={busy} data-testid="register-submit" className="w-full h-11 bg-black text-white hover:bg-black/90 rounded-md">
                {busy ? "Creating account…" : "Create account"}
              </Button>
            </form>
            <div className="mt-6 text-sm text-muted-foreground">
              Already have one? <Link to="/login" className="text-foreground u-link font-medium" data-testid="link-login">Sign in</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
