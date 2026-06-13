import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LayoutGrid, MessagesSquare, Store, Wrench, BarChart3, LogOut, Sparkles } from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid, tid: "nav-dashboard" },
  { to: "/marketplace", label: "Marketplace", icon: Store, tid: "nav-marketplace" },
  { to: "/builder", label: "Builder", icon: Wrench, tid: "nav-builder" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, tid: "nav-analytics" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-white">
        <Link to="/dashboard" className="flex items-center gap-2 px-6 h-16 border-b border-border" data-testid="brand-link">
          <div className="size-7 bg-black grid place-items-center">
            <Sparkles className="size-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="font-display font-medium tracking-tight text-lg">QuotientIQ</span>
        </Link>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map(({ to, label, icon: Icon, tid }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={tid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-black text-white"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                }`
              }
            >
              <Icon className="size-4" strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4 space-y-3">
          <div className="text-xs">
            <div className="font-medium text-foreground truncate" data-testid="sidebar-user-name">{user?.name || user?.email}</div>
            <div className="text-muted-foreground truncate font-mono">{user?.email}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            data-testid="logout-btn"
            className="w-full justify-start gap-2 border-border"
            onClick={async () => { await logout(); nav("/"); }}
          >
            <LogOut className="size-4" strokeWidth={1.5} /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-white border-b border-border flex items-center justify-between px-4 z-40">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="size-6 bg-black grid place-items-center">
            <Sparkles className="size-3.5 text-white" strokeWidth={1.5} />
          </div>
          <span className="font-display font-medium">QuotientIQ</span>
        </Link>
        <Button variant="ghost" size="sm" data-testid="mobile-logout" onClick={async () => { await logout(); nav("/"); }}>
          <LogOut className="size-4" strokeWidth={1.5} />
        </Button>
      </div>

      <main className="flex-1 min-w-0 md:pt-0 pt-14">{children}</main>
    </div>
  );
}
