import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon, User, Lock, Bell, Trash2, MonitorSmartphone } from "lucide-react";

const NOTIF_FIELDS = [
  { key: "agent_tasks", label: "Agent completed tasks" },
  { key: "new_conversations", label: "New conversations" },
  { key: "team_invites", label: "Team invitations" },
  { key: "knowledge_uploads", label: "Knowledge uploads" },
  { key: "billing_alerts", label: "Billing alerts" },
  { key: "weekly_digest", label: "Weekly digest" },
  { key: "email_enabled", label: "Send via email (requires Resend)" },
  { key: "push_enabled", label: "Show in-app notifications" },
];

function ProfileTab({ user, refresh }) {
  const [name, setName] = useState(user?.name || "");
  const [company, setCompany] = useState(user?.company || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.put("/auth/profile", { name, company });
      toast.success("Profile updated");
      await refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update");
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="s-email">Email</Label>
        <Input id="s-email" value={user?.email || ""} disabled className="bg-muted" />
        <div className="text-xs text-muted-foreground">Email cannot be changed.</div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-name">Name</Label>
        <Input id="s-name" data-testid="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-company">Company</Label>
        <Input id="s-company" data-testid="settings-company" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <Button data-testid="settings-save-profile" onClick={save} disabled={busy} className="bg-foreground text-background">Save changes</Button>
    </div>
  );
}

function PasswordTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (next !== confirm) return toast.error("New passwords don't match");
    if (next.length < 8) return toast.error("New password must be at least 8 characters");
    setBusy(true);
    try {
      await api.put("/auth/password", { current_password: current, new_password: next });
      toast.success("Password changed");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5 max-w-md">
      <div className="space-y-2">
        <Label>Current password</Label>
        <Input data-testid="settings-current-pw" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>New password</Label>
        <Input data-testid="settings-new-pw" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Confirm new password</Label>
        <Input data-testid="settings-confirm-pw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button data-testid="settings-save-password" onClick={save} disabled={busy} className="bg-foreground text-background">Change password</Button>
    </div>
  );
}

function ThemeTab() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-5 max-w-md">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// appearance</div>
      <div className="grid grid-cols-2 gap-3">
        <button
          data-testid="theme-light"
          onClick={() => setTheme("light")}
          className={`border p-5 rounded-md text-left transition ${theme === "light" ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40"}`}
        >
          <Sun className="size-5 mb-3" strokeWidth={1.5} />
          <div className="font-medium">Light</div>
          <div className="text-xs text-muted-foreground mt-1">Crisp and bright.</div>
        </button>
        <button
          data-testid="theme-dark"
          onClick={() => setTheme("dark")}
          className={`border p-5 rounded-md text-left transition ${theme === "dark" ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40"}`}
        >
          <Moon className="size-5 mb-3" strokeWidth={1.5} />
          <div className="font-medium">Dark</div>
          <div className="text-xs text-muted-foreground mt-1">Easier on the eyes.</div>
        </button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState(null);
  useEffect(() => {
    let c = false;
    api.get("/settings/notifications").then(({ data }) => { if (!c) setPrefs(data); }).catch(() => {});
    return () => { c = true; };
  }, []);
  const toggle = async (k) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    try {
      await api.put("/settings/notifications", { [k]: next[k] });
      toast.success("Updated");
    } catch (err) {
      setPrefs(prefs);
      toast.error("Failed to update");
    }
  };
  if (!prefs) return <div className="font-mono text-xs text-muted-foreground">loading…</div>;
  return (
    <div className="space-y-2 max-w-md">
      {NOTIF_FIELDS.map((f) => (
        <div key={f.key} className="flex items-center justify-between border border-border rounded-md p-3">
          <div className="text-sm">{f.label}</div>
          <Switch
            data-testid={`notif-toggle-${f.key}`}
            checked={!!prefs[f.key]}
            onCheckedChange={() => toggle(f.key)}
          />
        </div>
      ))}
    </div>
  );
}

function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    let c = false;
    api.get("/auth/sessions").then(({ data }) => { if (!c) setSessions(data.sessions || []); }).catch(() => {});
    return () => { c = true; };
  }, []);
  return (
    <div className="space-y-3 max-w-md">
      {sessions.map((s) => (
        <div key={s.id} className="border border-border rounded-md p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MonitorSmartphone className="size-4" strokeWidth={1.5} />
            {s.user_agent?.slice(0, 60) || "Unknown device"}
            {s.current && <span className="text-[10px] font-mono uppercase tracking-widest bg-foreground text-background px-2 py-0.5 rounded">current</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-mono">
            IP: {s.ip || "—"} • expires: {s.expires_at?.slice(0, 19).replace("T", " ") || "—"}
          </div>
        </div>
      ))}
      {sessions.length === 0 && <div className="font-mono text-xs text-muted-foreground">No active sessions.</div>}
    </div>
  );
}

function DangerTab({ onDeleted }) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const del = async () => {
    if (confirm !== "DELETE") return toast.error("Type DELETE to confirm");
    setBusy(true);
    try {
      await api.delete("/auth/account");
      toast.success("Account deleted");
      onDeleted();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete");
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5 max-w-md">
      <div className="border border-destructive/50 rounded-md p-5 bg-destructive/5">
        <div className="flex items-start gap-3">
          <Trash2 className="size-5 text-destructive shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <div className="font-medium text-destructive">Delete account</div>
            <div className="text-xs text-muted-foreground mt-1">
              Permanently delete your account, agents, knowledge base, conversations, and team. This cannot be undone.
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>Type DELETE to confirm</Label>
          <Input data-testid="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button data-testid="delete-account-btn" onClick={del} disabled={busy} variant="destructive" className="mt-3">
          Delete my account
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const refresh = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (err) { /* noop */ }
  };
  const onDeleted = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// settings</div>
          <h1 className="font-display font-medium text-4xl tracking-tighter">Settings</h1>
          <p className="mt-2 text-muted-foreground">Profile, security, theme, notifications, sessions.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-transparent border border-border p-1 gap-0.5 flex-wrap h-auto">
            <TabsTrigger value="profile" data-testid="tab-profile" className="gap-2"><User className="size-3.5" />Profile</TabsTrigger>
            <TabsTrigger value="password" data-testid="tab-password" className="gap-2"><Lock className="size-3.5" />Password</TabsTrigger>
            <TabsTrigger value="theme" data-testid="tab-theme" className="gap-2"><Moon className="size-3.5" />Theme</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications" className="gap-2"><Bell className="size-3.5" />Notifications</TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions" className="gap-2"><MonitorSmartphone className="size-3.5" />Sessions</TabsTrigger>
            <TabsTrigger value="danger" data-testid="tab-danger" className="gap-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"><Trash2 className="size-3.5" />Danger</TabsTrigger>
          </TabsList>
          <TabsContent value="profile"><ProfileTab user={user} refresh={refresh} /></TabsContent>
          <TabsContent value="password"><PasswordTab /></TabsContent>
          <TabsContent value="theme"><ThemeTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="sessions"><SessionsTab /></TabsContent>
          <TabsContent value="danger"><DangerTab onDeleted={onDeleted} /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
