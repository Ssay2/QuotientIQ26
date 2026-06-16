import React from "react";
import { Sparkles } from "lucide-react";

export function EmptyState({ icon: Icon = Sparkles, title, description, action, testid }) {
  return (
    <div
      data-testid={testid}
      className="border border-dashed border-border p-12 text-center bg-card rounded-md"
    >
      <div className="mx-auto size-12 grid place-items-center border border-border rounded-md mb-5 text-foreground/70">
        <Icon className="size-6" strokeWidth={1.5} />
      </div>
      <div className="font-display font-medium text-xl tracking-tight">{title}</div>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "loading…", testid = "loading" }) {
  return (
    <div data-testid={testid} className="font-mono text-xs text-muted-foreground py-8">
      {label}
    </div>
  );
}

export function SkeletonRow({ lines = 3 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={`sk-${i}`} className="h-3 bg-muted rounded w-full" />
      ))}
    </div>
  );
}
