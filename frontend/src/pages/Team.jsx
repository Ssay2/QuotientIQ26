import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Trash2, Mail, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const ROLE_LABEL = { owner: "Owner", admin: "Admin", manager: "Manager", employee: "Employee" };

export default function Team() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [busy, setBusy] = useState(false);
  const [lastInvite, setLastInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const { data } = await api.get("/team");
    setTeam(data);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const { data } = await api.get("/team"); if (!cancelled) setTeam(data); }
      catch (err) { if (!cancelled) console.error("Team load failed:", err); }
    })();
    return () => { cancelled = true; };
  }, []);

  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";

  const invite = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/team/invite", { email: inviteEmail, role: inviteRole });
      toast.success(`Invited ${data.email}`);
      setLastInvite(data);
      setInviteEmail("");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Invite failed");
    } finally { setBusy(false); }
  };

  const remove = async (email) => {
    if (!window.confirm(`Remove ${email}?`)) return;
    try {
      await api.delete(`/team/${encodeURIComponent(email)}`);
      toast.success("Removed");
      load();
    } catch (err) { toast.error("Remove failed"); }
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/register?invite=${lastInvite.invite_token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// team</div>
          <h1 className="font-display font-medium text-4xl lg:text-5xl tracking-tighter">Your team.</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Invite teammates to access this workspace. Roles control who can manage agents, billing, and other team members.
          </p>
        </div>

        {isOwnerOrAdmin && (
          <form onSubmit={invite} className="border border-border bg-white p-6 mb-6" data-testid="invite-form">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">// invite teammate</div>
            <div className="grid md:grid-cols-[1fr_180px_auto] gap-3">
              <Input
                data-testid="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="h-11 border-border rounded-md"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="invite-role" className="h-11 border-border rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
              <Button data-testid="invite-submit" type="submit" disabled={busy} className="bg-black text-white hover:bg-black/90 rounded-md gap-2 h-11 px-5">
                <UserPlus className="size-4" strokeWidth={1.5} /> {busy ? "Inviting…" : "Invite"}
              </Button>
            </div>
            {lastInvite && (
              <div className="mt-4 p-3 border border-border bg-muted/40 flex items-center justify-between gap-3" data-testid="invite-link-box">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">share this invite link</div>
                  <div className="font-mono text-xs truncate">{`${window.location.origin}/register?invite=${lastInvite.invite_token}`}</div>
                </div>
                <Button data-testid="copy-invite-link" onClick={copyInviteLink} variant="outline" size="sm" className="border-border gap-2 shrink-0">
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}
          </form>
        )}

        {!team ? (
          <div className="font-mono text-xs text-muted-foreground" data-testid="team-loading">loading…</div>
        ) : (
          <div className="border border-border bg-white divide-y divide-border" data-testid="team-list">
            {(team.members || []).map((m) => (
              <div key={m.email} data-testid={`team-member-${m.email}`} className="p-4 flex items-center gap-4">
                <div className="size-9 border border-border grid place-items-center shrink-0">
                  <Mail className="size-4" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-medium truncate">{m.email}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {ROLE_LABEL[m.role] || m.role} {m.status === "pending" && "· pending"}
                  </div>
                </div>
                {isOwnerOrAdmin && m.role !== "owner" && (
                  <Button data-testid={`remove-${m.email}`} variant="ghost" size="sm" onClick={() => remove(m.email)} aria-label={`Remove ${m.email}`}>
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
