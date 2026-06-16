import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Building2, Briefcase, BookOpen, MessageSquare, CheckCircle2, ArrowRight, ArrowLeft, SkipForward } from "lucide-react";

const STEPS = [
  { n: 1, title: "Company profile", icon: Building2 },
  { n: 2, title: "Choose industry", icon: Briefcase },
  { n: 3, title: "Create your first agent", icon: Sparkles },
  { n: 4, title: "Upload knowledge", icon: BookOpen },
  { n: 5, title: "Start your first chat", icon: MessageSquare },
  { n: 6, title: "Complete setup", icon: CheckCircle2 },
];

export default function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // step 1
  const [profile, setProfile] = useState({ company_name: "", audience: "", services: "" });
  // step 2
  const [industries, setIndustries] = useState([]);
  const [chosenIndustry, setChosenIndustry] = useState(null);
  // step 3
  const [agent, setAgent] = useState({ name: "", role: "Customer Support Agent", instructions: "" });
  const [createdAgentId, setCreatedAgentId] = useState(null);
  // step 4
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const [prof, st, inds] = await Promise.all([
          api.get("/company-profile").catch(() => ({ data: {} })),
          api.get("/onboarding/status").catch(() => ({ data: {} })),
          api.get("/industries").catch(() => ({ data: [] })),
        ]);
        if (c) return;
        setProfile((p) => ({ ...p, ...(prof.data || {}) }));
        setIndustries(inds.data || []);
        // Pick up where the user left off, but never auto-redirect away —
        // they can always use the explicit "Skip for now" button to leave.
        if (st.data?.current_step && !st.data?.completed) {
          setStep(Math.min(6, Math.max(1, st.data.current_step)));
        }
      } catch (err) {
        // silently degrade — wizard still shows defaults
      }
    })();
    return () => { c = true; };
  }, []);

  const persist = async (next, extra = {}) => {
    try {
      await api.put("/onboarding/step", { step: next, completed: next > 6, data: extra });
    } catch (err) { /* noop */ }
  };
  const goto = async (next, extra = {}) => {
    setStep(next);
    await persist(next, extra);
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await api.put("/company-profile", profile);
      toast.success("Company saved");
      await goto(2, { company_set: true });
    } catch (err) {
      toast.error("Failed to save");
    } finally { setBusy(false); }
  };

  const installIndustry = async () => {
    if (!chosenIndustry) return goto(3);
    setBusy(true);
    try {
      await api.post(`/industries/${chosenIndustry}/install`);
      toast.success("Workforce installed");
      await goto(3, { industry_installed: true });
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.message("Already installed — continuing.");
        await goto(3, { industry_installed: true });
      } else {
        toast.error(err?.response?.data?.detail || "Failed to install");
      }
    } finally { setBusy(false); }
  };

  const createAgent = async () => {
    if (!agent.name) return toast.error("Name required");
    setBusy(true);
    try {
      const { data } = await api.post("/agents", agent);
      setCreatedAgentId(data.id);
      toast.success("Agent created");
      await goto(4, { agent_created: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  const uploadFile = async () => {
    if (!file || !createdAgentId) return goto(5);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post(`/agents/${createdAgentId}/upload`, form);
      setUploaded(true);
      toast.success("Knowledge uploaded");
      await goto(5, { file_uploaded: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally { setBusy(false); }
  };

  const finish = async () => {
    await persist(7, { chat_started: !!createdAgentId });
    if (createdAgentId) nav(`/chat/${createdAgentId}`);
    else nav("/dashboard");
  };

  const skip = async () => {
    setBusy(true);
    try { await api.post("/onboarding/skip"); } catch (err) { /* noop */ }
    nav("/dashboard");
  };

  const StepIcon = STEPS[step - 1].icon;
  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 grid-lines pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="size-7 bg-foreground text-background grid place-items-center"><Sparkles className="size-4" strokeWidth={1.5} /></div>
            <span className="font-display font-medium tracking-tight text-lg">QuotientIQ</span>
          </div>
          <button onClick={skip} data-testid="onboarding-skip" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <SkipForward className="size-3" /> Skip for now
          </button>
        </div>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-baseline justify-between mb-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">step {step} of {STEPS.length}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{Math.round(progress)}%</div>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-foreground transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="border border-border bg-card rounded-md p-8 lg:p-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="size-10 grid place-items-center border border-border rounded-md"><StepIcon className="size-5" strokeWidth={1.5} /></div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// step {step}</div>
              <h1 className="font-display font-medium text-3xl tracking-tighter">{STEPS[step - 1].title}</h1>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-5 mt-6">
              <div className="space-y-2"><Label>Company name</Label><Input data-testid="ob-company" value={profile.company_name} onChange={(e) => setProfile({ ...profile, company_name: e.target.value })} placeholder="Acme Co" /></div>
              <div className="space-y-2"><Label>Target audience</Label><Textarea data-testid="ob-audience" value={profile.audience} onChange={(e) => setProfile({ ...profile, audience: e.target.value })} placeholder="Who do you serve?" rows={2} /></div>
              <div className="space-y-2"><Label>Services / products</Label><Textarea data-testid="ob-services" value={profile.services} onChange={(e) => setProfile({ ...profile, services: e.target.value })} placeholder="What do you offer?" rows={2} /></div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-5">
              <p className="text-sm text-muted-foreground">Pick a pre-built workforce or skip and build your own.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {industries.map((i) => (
                  <button key={i.id} data-testid={`ob-industry-${i.id}`} onClick={() => setChosenIndustry(i.id)}
                    className={`text-left border p-4 rounded-md transition ${chosenIndustry === i.id ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40"}`}>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{i.tagline}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-3">{i.agent_count} agents</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 mt-6">
              <div className="space-y-2"><Label>Agent name</Label><Input data-testid="ob-agent-name" value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} placeholder="e.g. Customer Support" /></div>
              <div className="space-y-2"><Label>Role</Label><Input data-testid="ob-agent-role" value={agent.role} onChange={(e) => setAgent({ ...agent, role: e.target.value })} /></div>
              <div className="space-y-2"><Label>Instructions (system prompt)</Label><Textarea data-testid="ob-agent-instructions" rows={4} value={agent.instructions} onChange={(e) => setAgent({ ...agent, instructions: e.target.value })} placeholder="Describe how the agent should behave…" /></div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 mt-6">
              <p className="text-sm text-muted-foreground">Upload a doc (PDF, DOCX, TXT, MD, CSV) so your agent can answer from it. Optional — you can do this later.</p>
              <input data-testid="ob-file" type="file" accept=".pdf,.docx,.txt,.md,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block text-sm" />
              {file && <div className="text-xs font-mono text-muted-foreground">{file.name} • {Math.round(file.size / 1024)} KB</div>}
              {uploaded && <div className="text-xs text-emerald-600">Uploaded.</div>}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5 mt-6">
              <p className="text-sm text-muted-foreground">Ready to chat with your agent. We'll redirect you to the chat in the next step.</p>
              <div className="border border-border rounded-md p-5 bg-muted/50">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// pro tip</div>
                <div className="text-sm mt-1">Try asking: "What can you help me with?" or "Summarize the knowledge base."</div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5 mt-6 text-center py-8">
              <div className="mx-auto size-12 grid place-items-center bg-emerald-500/10 text-emerald-600 rounded-full">
                <CheckCircle2 className="size-6" strokeWidth={1.5} />
              </div>
              <div className="font-display font-medium text-2xl tracking-tight">You're all set, {user?.name?.split(" ")[0] || "there"}.</div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Your AI workforce is ready. Hire more from the Marketplace, group them into Departments, and let the Chief of Staff coordinate everything.</p>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
            <Button variant="ghost" size="sm" data-testid="ob-back" disabled={step === 1 || busy} onClick={() => goto(Math.max(1, step - 1))} className="gap-2">
              <ArrowLeft className="size-4" strokeWidth={1.5} /> Back
            </Button>
            {step === 1 && <Button data-testid="ob-next-1" disabled={busy} onClick={saveProfile} className="bg-foreground text-background gap-2">Next <ArrowRight className="size-4" /></Button>}
            {step === 2 && <Button data-testid="ob-next-2" disabled={busy} onClick={installIndustry} className="bg-foreground text-background gap-2">{chosenIndustry ? "Install & continue" : "Skip"} <ArrowRight className="size-4" /></Button>}
            {step === 3 && <Button data-testid="ob-next-3" disabled={busy} onClick={createAgent} className="bg-foreground text-background gap-2">Create agent <ArrowRight className="size-4" /></Button>}
            {step === 4 && <Button data-testid="ob-next-4" disabled={busy} onClick={uploadFile} className="bg-foreground text-background gap-2">{file ? "Upload & continue" : "Skip"} <ArrowRight className="size-4" /></Button>}
            {step === 5 && <Button data-testid="ob-next-5" disabled={busy} onClick={() => goto(6)} className="bg-foreground text-background gap-2">Continue <ArrowRight className="size-4" /></Button>}
            {step === 6 && <Button data-testid="ob-finish" disabled={busy} onClick={finish} className="bg-foreground text-background gap-2">Open my workforce <ArrowRight className="size-4" /></Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
