import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, Sparkles, Zap, Shield, Globe, CheckCircle2, Headphones, TrendingUp, Users, Megaphone, BarChart3, Cog, Scale, DollarSign } from "lucide-react";

const AGENTS = [
  { icon: Headphones, name: "Customer Support", tag: "Live · 24/7" },
  { icon: TrendingUp, name: "Sales", tag: "Pipeline" },
  { icon: Users, name: "Recruiting", tag: "Talent" },
  { icon: Megaphone, name: "Marketing", tag: "Content" },
  { icon: BarChart3, name: "Analyst", tag: "KPIs" },
  { icon: Cog, name: "Operations", tag: "SOPs" },
  { icon: Scale, name: "Legal", tag: "Contracts" },
  { icon: DollarSign, name: "Finance", tag: "Cashflow" },
];

const TIERS = [
  { name: "Starter", price: "$99", period: "/mo", tagline: "For small teams getting started.", features: ["1 AI employee", "5 GB knowledge base", "1,000 conversations/mo", "Email support"], cta: "Start free trial", featured: false },
  { name: "Professional", price: "$299", period: "/mo", tagline: "For scaling operations.", features: ["5 AI employees", "50 GB knowledge base", "20,000 conversations/mo", "Priority support", "Custom branding"], cta: "Start free trial", featured: true },
  { name: "Enterprise", price: "Custom", period: "", tagline: "For complex deployments.", features: ["Unlimited AI employees", "Unlimited knowledge", "SOC2 / SSO", "Dedicated success engineer", "On-prem options"], cta: "Book a demo", featured: false },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-brand">
            <div className="size-7 bg-black grid place-items-center">
              <Sparkles className="size-4 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-display font-medium tracking-tight text-lg">QuotientIQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#agents" className="u-link text-foreground/70 hover:text-foreground">Agents</a>
            <a href="#how" className="u-link text-foreground/70 hover:text-foreground">How it works</a>
            <a href="#pricing" className="u-link text-foreground/70 hover:text-foreground">Pricing</a>
            <Link to="/login" className="u-link text-foreground/70 hover:text-foreground" data-testid="nav-login">Sign in</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/register">
              <Button data-testid="nav-cta-register" className="bg-black hover:bg-black/90 text-white rounded-md gap-1.5">
                Start free trial <ArrowRight className="size-3.5" strokeWidth={2} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-24 relative">
          <div className="grid lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-8 reveal">
              <div className="inline-flex items-center gap-2 border border-border px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest text-muted-foreground mb-8" data-testid="hero-badge">
                <span className="size-1.5 rounded-full bg-black blink" /> Now hiring · AI Workforce v1
              </div>
              <h1 className="font-display font-medium text-5xl sm:text-6xl lg:text-7xl tracking-tighter leading-[0.95] text-foreground">
                Hire AI Employees<br />
                <span className="text-muted-foreground">in minutes.</span>
              </h1>
              <p className="mt-8 text-lg leading-relaxed text-muted-foreground max-w-2xl">
                Deploy specialized AI agents for customer support, sales, recruiting and operations.
                Train them on your docs. Ship them in production by the end of the day.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link to="/register">
                  <Button size="lg" data-testid="hero-start-trial" className="bg-black hover:bg-black/90 text-white rounded-md h-12 px-6 gap-2">
                    Start free trial <ArrowRight className="size-4" strokeWidth={2} />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" data-testid="hero-book-demo" className="rounded-md h-12 px-6 border-border gap-2">
                    Book a demo <ArrowUpRight className="size-4" strokeWidth={2} />
                  </Button>
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-8 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="size-3.5" strokeWidth={1.5} /> No credit card</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="size-3.5" strokeWidth={1.5} /> 14-day trial</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="size-3.5" strokeWidth={1.5} /> Cancel anytime</div>
              </div>
            </div>

            {/* Side panel */}
            <div className="lg:col-span-4 reveal" style={{ animationDelay: "120ms" }}>
              <div className="border border-border bg-white p-1">
                <div className="border border-border p-5 bg-muted/40">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">agent.live</div>
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-black/70" />
                      <span className="size-1.5 rounded-full bg-black/40" />
                      <span className="size-1.5 rounded-full bg-black/20" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bubble-ai rounded-md p-3 text-sm">Hi! I&apos;m your AI support agent. I&apos;ve read all 47 pages of your docs. What can I help with?</div>
                    <div className="bubble-user rounded-md p-3 text-sm ml-6">What&apos;s your refund policy?</div>
                    <div className="bubble-ai rounded-md p-3 text-sm">Refunds within 30 days, no questions asked. Want me to start the process?</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground pt-2 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Resolved in 4s · saved 12 min
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted strip */}
      <section className="border-b border-border overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex items-center gap-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">Trusted by teams at</div>
          <div className="flex gap-12 overflow-hidden">
            <div className="flex gap-12 marquee whitespace-nowrap">
              {["NORTHWIND", "CONTOSO", "ACME CO", "FABRIKAM", "TAILSPIN", "ADVENTUREWORKS", "WIDE WORLD", "BLUE YONDER", "NORTHWIND-2", "CONTOSO-2", "ACME CO-2", "FABRIKAM-2"].map((c) => (
                <span key={c} className="font-display font-medium tracking-tight text-2xl text-foreground/40">{c.replace(/-\d+$/, "")}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">01 — Workflow</div>
              <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl tracking-tighter">From PDFs to production in 4 steps.</h2>
              <p className="mt-6 text-muted-foreground">No code. No prompt engineering. No babysitting.</p>
            </div>
            <div className="lg:col-span-8 grid sm:grid-cols-2 gap-px bg-border border border-border">
              {[
                { n: "01", t: "Upload docs", d: "Drop your PDFs, manuals, FAQs. We parse them automatically." },
                { n: "02", t: "AI learns", d: "Your knowledge base becomes structured, queryable context." },
                { n: "03", t: "Deploy", d: "Pick a channel — chat, embed, API. Ships in minutes." },
                { n: "04", t: "Improve", d: "Watch conversations, edit instructions, fine-tune output." },
              ].map((s) => (
                <div key={s.n} className="bg-white p-8 hover:bg-muted/30 transition-colors">
                  <div className="font-mono text-xs text-muted-foreground mb-3">{s.n}</div>
                  <div className="font-display font-medium text-xl">{s.t}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Agent gallery */}
      <section id="agents" className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">02 — Workforce</div>
              <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl tracking-tighter max-w-2xl">A specialist for every department.</h2>
            </div>
            <Link to="/register" className="u-link text-sm font-medium" data-testid="agents-explore">Browse the marketplace →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
            {AGENTS.map(({ icon: Icon, name, tag }) => (
              <div key={name} className="bg-white p-8 hover:bg-foreground hover:text-background transition-all duration-200 group cursor-default">
                <Icon className="size-6 mb-6" strokeWidth={1.5} />
                <div className="font-display font-medium text-lg">{name}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-background/60 mt-1">{tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / Why */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 grid lg:grid-cols-3 gap-px bg-border border border-border">
          {[
            { k: "92%", v: "Tickets auto-resolved", d: "On average across pilot customers." },
            { k: "9 min", v: "Saved per conversation", d: "Compared to human-only response." },
            { k: "4 min", v: "To deploy", d: "From signup to first live answer." },
          ].map((s) => (
            <div key={s.k} className="bg-white p-12">
              <div className="font-display font-medium text-5xl lg:text-6xl tracking-tighter">{s.k}</div>
              <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.v}</div>
              <p className="mt-3 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
          <div className="text-center mb-16">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">03 — Pricing</div>
            <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl tracking-tighter">Pay for outcomes, not seats.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
            {TIERS.map((t) => (
              <div key={t.name} className={`p-10 bg-white flex flex-col ${t.featured ? "lg:scale-[1.02] lg:-my-3 bg-black text-white" : ""}`}>
                <div className={`font-mono text-[10px] uppercase tracking-widest ${t.featured ? "text-white/60" : "text-muted-foreground"}`}>{t.name}</div>
                <div className="mt-6 flex items-baseline gap-1">
                  <div className="font-display font-medium text-5xl tracking-tighter">{t.price}</div>
                  <div className={`text-sm ${t.featured ? "text-white/60" : "text-muted-foreground"}`}>{t.period}</div>
                </div>
                <p className={`mt-3 text-sm ${t.featured ? "text-white/70" : "text-muted-foreground"}`}>{t.tagline}</p>
                <ul className="mt-8 space-y-3 text-sm flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className={`size-4 mt-0.5 shrink-0 ${t.featured ? "text-white" : "text-foreground"}`} strokeWidth={1.5} />
                      <span className={t.featured ? "text-white/90" : "text-foreground/80"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="mt-10">
                  <Button
                    data-testid={`pricing-cta-${t.name.toLowerCase()}`}
                    className={`w-full rounded-md h-11 ${t.featured ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90"}`}
                  >
                    {t.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <h2 className="font-display font-medium text-4xl lg:text-6xl tracking-tighter">Your next hire writes itself.</h2>
            <p className="mt-6 text-muted-foreground text-lg max-w-xl">Spin up your first AI employee in under 4 minutes. Free for 14 days. No credit card.</p>
          </div>
          <div className="lg:col-span-5 flex flex-wrap gap-3 lg:justify-end">
            <Link to="/register">
              <Button size="lg" data-testid="final-cta-register" className="bg-black text-white hover:bg-black/90 h-12 px-6 rounded-md gap-2">
                Hire your first AI <ArrowRight className="size-4" strokeWidth={2} />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" data-testid="final-cta-login" className="h-12 px-6 rounded-md border-border">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-black grid place-items-center">
              <Sparkles className="size-3.5 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-display font-medium tracking-tight">QuotientIQ</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground ml-3">© 2026</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a className="u-link">Privacy</a>
            <a className="u-link">Terms</a>
            <a className="u-link">Security</a>
            <a className="u-link">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
