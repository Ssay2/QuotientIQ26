import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const TYPE_COLOR = {
  "agent.task": "bg-blue-500",
  "conversation.new": "bg-emerald-500",
  "team.invite": "bg-purple-500",
  "knowledge.upload": "bg-amber-500",
  "billing": "bg-rose-500",
  "system": "bg-foreground",
};

function relTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/notifications", { params: { limit: 20 } });
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch (err) {
      // silent
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open]);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch (err) { /* noop */ }
  };

  const markAll = async () => {
    try {
      await api.put("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (err) { /* noop */ }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (err) { /* noop */ }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="notif-bell"
          className="relative p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell className="size-4" strokeWidth={1.5} />
          {unread > 0 && (
            <span
              data-testid="notif-unread-badge"
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 grid place-items-center text-[10px] font-mono bg-foreground text-background rounded-full"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" data-testid="notif-panel">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              data-testid="notif-mark-all"
              onClick={markAll}
              className="h-7 text-xs gap-1.5"
            >
              <CheckCheck className="size-3" strokeWidth={1.5} /> Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground font-mono">No notifications.</div>
          )}
          {items.map((n) => {
            const dot = TYPE_COLOR[n.type] || "bg-foreground";
            return (
              <div
                key={n.id}
                data-testid={`notif-item-${n.id}`}
                className={`group flex gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-accent ${!n.read ? "bg-muted/40" : ""}`}
              >
                <span className={`mt-1.5 size-2 rounded-full shrink-0 ${dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium truncate">{n.title}</div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{relTime(n.ts)}</span>
                  </div>
                  {n.body && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>}
                  <div className="flex items-center gap-3 mt-1.5">
                    {n.link && (
                      <Link
                        to={n.link}
                        onClick={() => { setOpen(false); markRead(n.id); }}
                        className="text-[11px] underline underline-offset-2 text-foreground"
                      >Open</Link>
                    )}
                    {!n.read && (
                      <button
                        data-testid={`notif-read-${n.id}`}
                        onClick={() => markRead(n.id)}
                        className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <Check className="size-3" /> Mark read
                      </button>
                    )}
                    <button
                      data-testid={`notif-delete-${n.id}`}
                      onClick={() => remove(n.id)}
                      className="text-[11px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
