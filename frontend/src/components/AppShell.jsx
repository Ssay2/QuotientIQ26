import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import TrialBanner from "@/components/TrialBanner";
import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutGrid, Store, Wrench, BarChart3, LogOut, Sparkles, Brain, Network, CreditCard, MessageSquare,
  Users, History, Key, Search, Settings as SettingsIcon, HelpCircle, Crown, Briefcase, Layers, Activity, Menu, X,
} from "lucide-react";

const NAV_MAIN = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid, tid: "nav-dashboard" },
  { to: "/chief", label: "Chief of Staff", icon: Crown, tid: "nav-chief" },
  { to: "/workforce", label: "AI Workforce", icon: Users, tid: "nav-workforce" },
  { to: "/marketplace", label: "Marketplace", icon: Store, tid: "nav-marketplace" },
  { to: "/industries", label: "Industries", icon: Briefcase, tid: "nav-industries" },
];

const NAV_OPS = [
  { to: "/conversations", label: "Conversations", icon: MessageSquare, tid: "nav-conversations" },
  { to: "/departments", label: "Departments", icon: Layers, tid: "nav-departments" },
  { to: "/org", label: "Org Chart", icon: Network, tid: "nav-org" },
  { to: "/profile", label: "Company Memory", icon: Brain, tid: "nav-profile" },
  { to: "/builder", label: "Builder", icon: Wrench, tid: "nav-builder" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, tid: "nav-analytics" },
  { to: "/activity", label: "Activity", icon: Activity, tid: "nav-activity" },
];

const NAV_WORKSPACE = [
  { to: "/team", label: "Team", icon: Users, tid: "nav-team" },
  { to: "/billing", label: "Billing", icon: CreditCard, tid: "nav-billing" },
  { to: "/audit", label: "Audit log", icon: History, tid: "nav-audit" },
  { to: "/developer", label: "Developer", icon: Key, tid: "nav-developer" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, tid: "nav-settings" },
  { to: "/help", label: "Help", icon: HelpCircle, tid: "nav-help" },
];

function NavItem({ to, label, icon: Icon, tid, onClick }) {
  return (
    <NavLink
      to={to}
      data-testid={tid}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
          isActive ? "bg-foreground text-background" : "text-foreground/70 hover:bg-accent hover:text-foreground"
        }`
      }
    >
      <Icon className="size-4" strokeWidth={1.5} />
      {label}
    </NavLink>
  );
}

function NavSection({ items, label, onItemClick }) {
  return (
    <div className="pt-3 mt-3 border-t border-border space-y-1">
      <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">{label}</div>
      {items.map((item) => <NavItem key={item.to} {...item} onClick={onItemClick} />)}
    </div>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  // Cmd+K / Ctrl+K — open global search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeMobile = () => setMobileNav(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TrialBanner />
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card">
          <Link to="/dashboard" className="flex items-center gap-2 px-6 h-16 border-b border-border" data-testid="brand-link">
            <div className="size-7 bg-foreground text-background grid place-items-center">
              <Sparkles className="size-4" strokeWidth={1.5} />
            </div>
            <span className="font-display font-medium tracking-tight text-lg">QuotientIQ</span>
          </Link>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_MAIN.map((item) => <NavItem key={item.to} {...item} />)}
            <NavSection items={NAV_OPS} label="operations" />
            <NavSection items={NAV_WORKSPACE} label="workspace" />
          </nav>
          <div className="border-t border-border p-4 space-y-3">
            <div className="text-xs">
              <div className="font-medium text-foreground truncate" data-testid="sidebar-user-name">{user?.name || user?.email}</div>
              <div className="text-muted-foreground truncate font-mono">{user?.email}</div>
            </div>
            <Button variant="outline" size="sm" data-testid="logout-btn" className="w-full justify-start gap-2 border-border"
              onClick={async () => { await logout(); nav("/"); }}>
              <LogOut className="size-4" strokeWidth={1.5} /> Logout
            </Button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-40">
          <button data-testid="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Menu">
            <Menu className="size-5" strokeWidth={1.5} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="size-6 bg-foreground text-background grid place-items-center">
              <Sparkles className="size-3.5" strokeWidth={1.5} />
            </div>
            <span className="font-display font-medium">QuotientIQ</span>
          </Link>
          <div className="flex items-center gap-1">
            <button data-testid="mobile-search" onClick={() => setSearchOpen(true)} aria-label="Search" className="p-2 hover:bg-accent rounded-md"><Search className="size-4" strokeWidth={1.5} /></button>
            <NotificationBell />
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileNav && (
          <div className="md:hidden fixed inset-0 z-50" data-testid="mobile-drawer">
            <div className="absolute inset-0 bg-black/50" onClick={closeMobile} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col">
              <div className="flex items-center justify-between px-4 h-14 border-b border-border">
                <Link to="/dashboard" onClick={closeMobile} className="flex items-center gap-2">
                  <div className="size-6 bg-foreground text-background grid place-items-center"><Sparkles className="size-3.5" strokeWidth={1.5} /></div>
                  <span className="font-display font-medium">QuotientIQ</span>
                </Link>
                <button onClick={closeMobile} aria-label="Close menu"><X className="size-5" strokeWidth={1.5} /></button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_MAIN.map((item) => <NavItem key={item.to} {...item} onClick={closeMobile} />)}
                <NavSection items={NAV_OPS} label="operations" onItemClick={closeMobile} />
                <NavSection items={NAV_WORKSPACE} label="workspace" onItemClick={closeMobile} />
              </nav>
              <div className="border-t border-border p-4">
                <Button variant="outline" size="sm" data-testid="mobile-logout" className="w-full justify-start gap-2"
                  onClick={async () => { await logout(); closeMobile(); nav("/"); }}>
                  <LogOut className="size-4" strokeWidth={1.5} /> Logout
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 md:pt-0 pt-14 relative">
          {/* Desktop top bar */}
          <div className="hidden md:flex items-center justify-end gap-1 px-6 h-14 border-b border-border bg-card/60 backdrop-blur sticky top-0 z-30">
            <button
              data-testid="search-trigger"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 h-9 border border-border rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition mr-2 min-w-[280px]"
            >
              <Search className="size-3.5" strokeWidth={1.5} />
              <span>Search agents, conversations, knowledge…</span>
              <kbd className="ml-auto font-mono text-[10px] border border-border rounded px-1 py-0.5">⌘K</kbd>
            </button>
            <ThemeToggle />
            <NotificationBell />
          </div>
          {children}
        </main>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
