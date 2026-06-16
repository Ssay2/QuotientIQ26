import React, { useState } from "react";
import AppShell from "@/components/AppShell";
import { BookOpen, Bot, FileText, Users, CreditCard, HelpCircle, ChevronDown, ExternalLink } from "lucide-react";

const SECTIONS = [
  {
    id: "start",
    icon: BookOpen,
    title: "Getting Started",
    items: [
      { q: "What is QuotientIQ?", a: "QuotientIQ is an AI Employee Marketplace. Hire pre-built AI workers (Support, Sales, Marketing, etc.), give them company memory, group them into departments, and let the Chief of Staff route work across the org." },
      { q: "How do I create my first agent?", a: "Go to /marketplace and install a template, or open /builder to define a custom one (name, role, instructions). You can also install a whole industry workforce from /industries." },
      { q: "How does the 14-day trial work?", a: "Every new account gets full access for 14 days. Upgrade from /billing before it expires to keep creating agents and installing industries." },
    ],
  },
  {
    id: "agents",
    icon: Bot,
    title: "Agents & Chat",
    items: [
      { q: "How does multi-agent delegation work?", a: "Each agent sees its teammates in the system prompt. When a question is out of scope, an agent can emit `[DELEGATE: Teammate | question]` and the system runs that teammate inline. The Chief of Staff is the master coordinator." },
      { q: "Can I edit an agent's instructions?", a: "Yes — open the chat page for any agent and use the Instructions panel. Changes apply to the next message." },
      { q: "How do I embed an agent on my website?", a: "Open an agent's chat → Embed section → Enable. Copy the `<script>` snippet and paste it into your site. The widget supports per-visitor rate limits and conversation continuity." },
    ],
  },
  {
    id: "knowledge",
    icon: FileText,
    title: "Knowledge Base",
    items: [
      { q: "Which file types are supported?", a: "PDF, DOCX, TXT, MD, CSV uploads — plus raw pasted text and URL crawls." },
      { q: "Where is knowledge stored?", a: "On the agent. Each agent has its own knowledge_text field (truncated to 300k chars) plus a list of file metadata. The first 30k chars are injected into the agent's system prompt at chat time." },
      { q: "Can different agents share knowledge?", a: "Not yet — that's coming with the vector / semantic search layer. For now, upload company-wide info to your Company Profile (Memory) which is auto-injected into every agent." },
    ],
  },
  {
    id: "teams",
    icon: Users,
    title: "Teams & Roles",
    items: [
      { q: "What roles exist?", a: "Owner, Admin, Manager, Employee. Only owners + admins can invite or remove members. Audit logs record every change." },
      { q: "How do invites work?", a: "Go to /team → Invite. We mint an invite_token; share it with the invitee. Email delivery activates once Resend is configured." },
    ],
  },
  {
    id: "billing",
    icon: CreditCard,
    title: "Billing",
    items: [
      { q: "What plans are available?", a: "Starter ($99/mo), Professional ($299/mo), Enterprise (contact sales). All annual options coming soon." },
      { q: "How is usage measured?", a: "Per-agent, per-conversation. Your dashboard shows tasks completed, hours saved, cost saved." },
      { q: "Can I cancel anytime?", a: "Yes — manage from /billing. Your AI workforce stays available until the end of your paid period." },
    ],
  },
  {
    id: "faq",
    icon: HelpCircle,
    title: "FAQs",
    items: [
      { q: "Is my data private?", a: "Yes. Each org's data is fully isolated by user_id + org_id. Knowledge and conversations never leave your account." },
      { q: "Which LLM do you use?", a: "OpenAI GPT-5.2 via Emergent's universal LLM key. Streaming SSE for chat, with per-conversation session continuity." },
      { q: "Can I bring my own API keys?", a: "Yes — Resend (email), Twilio (voice), ElevenLabs (TTS) integrations accept your keys when added to backend/.env." },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full text-left flex items-center justify-between gap-3 py-3 group">
        <div className="text-sm font-medium group-hover:text-foreground">{q}</div>
        <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</div>}
    </div>
  );
}

export default function Help() {
  const [active, setActive] = useState("start");
  const section = SECTIONS.find((s) => s.id === active);
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// help center</div>
          <h1 className="font-display font-medium text-4xl tracking-tighter">How can we help?</h1>
          <p className="mt-2 text-muted-foreground">Browse by topic, or search docs with <kbd className="font-mono border border-border rounded px-1 py-0.5 text-xs">⌘K</kbd>.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          <nav className="space-y-1" data-testid="help-nav">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setActive(s.id)} data-testid={`help-nav-${s.id}`}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${active === s.id ? "bg-foreground text-background" : "hover:bg-accent"}`}>
                <s.icon className="size-4" strokeWidth={1.5} />
                {s.title}
              </button>
            ))}
            <a href="mailto:support@quotientiq.com" className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent">
              <ExternalLink className="size-4" strokeWidth={1.5} /> Email support
            </a>
          </nav>
          <div className="border border-border bg-card rounded-md p-6" data-testid="help-content">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 grid place-items-center border border-border rounded-md"><section.icon className="size-5" strokeWidth={1.5} /></div>
              <h2 className="font-display font-medium text-2xl tracking-tight">{section.title}</h2>
            </div>
            <div className="divide-y divide-border">
              {section.items.map((it, i) => <FaqItem key={i} q={it.q} a={it.a} />)}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
