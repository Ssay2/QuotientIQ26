import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import {
  Sparkles,
  MessageSquare,
  FileText,
  BookOpen,
  Users,
  Search as SearchIcon,
  Headphones,
  TrendingUp,
  Megaphone,
  BarChart3,
  Cog,
  Scale,
  DollarSign,
  Crown,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const ICON = {
  MessageSquare, FileText, BookOpen, Users, Sparkles, Headphones,
  TrendingUp, Megaphone, BarChart3, Cog, Scale, DollarSign, Crown,
};

export default function GlobalSearch({ open, onOpenChange }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      setActive(0);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/search", { params: { q, limit: 8 } });
        setResults(data.results || []);
        setActive(0);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  const select = (r) => {
    if (!r) return;
    onOpenChange(false);
    nav(r.link);
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[active]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl gap-0 overflow-hidden" data-testid="global-search-dialog">
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <DialogDescription className="sr-only">
          Search across agents, conversations, knowledge base documents, and team members.
        </DialogDescription>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <SearchIcon className="size-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            data-testid="global-search-input"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search agents, conversations, knowledge, team…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="font-mono text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {loading && <div className="p-6 text-center text-xs text-muted-foreground font-mono">searching…</div>}
          {!loading && q && results.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground font-mono" data-testid="search-empty">No results for "{q}"</div>
          )}
          {!loading && !q && (
            <div className="p-6 space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// quick search</div>
              <div className="text-xs text-muted-foreground">
                Try searching for an agent name, a customer, a document, or a teammate. Press <kbd className="font-mono border border-border rounded px-1 py-0.5">Enter</kbd> to open.
              </div>
            </div>
          )}
          {results.map((r, i) => {
            const Icon = ICON[r.icon] || Sparkles;
            return (
              <button
                key={`${r.type}-${r.id}-${i}`}
                data-testid={`search-result-${i}`}
                onClick={() => select(r)}
                className={`w-full text-left flex items-start gap-3 px-4 py-2.5 border-b border-border last:border-b-0 ${i === active ? "bg-accent" : "hover:bg-accent/60"}`}
              >
                <div className="size-8 grid place-items-center border border-border rounded-md shrink-0">
                  <Icon className="size-4" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium text-sm truncate">{r.title}</div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">{r.type}</span>
                  </div>
                  {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                  {r.snippet && <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{r.snippet}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
