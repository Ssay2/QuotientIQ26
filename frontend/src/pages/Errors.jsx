import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function ErrorScreen({ code, title, message, primaryHref = "/dashboard", primaryLabel = "Go to dashboard", testid }) {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6 relative" data-testid={testid}>
      <div className="absolute inset-0 grid-lines pointer-events-none" />
      <div className="relative max-w-lg w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="size-8 bg-foreground text-background grid place-items-center"><Sparkles className="size-4" strokeWidth={1.5} /></div>
          <span className="font-display font-medium tracking-tight text-lg">QuotientIQ</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// error {code}</div>
        <div className="font-display font-medium text-7xl lg:text-8xl tracking-tighter">{code}</div>
        <h1 className="font-display font-medium text-2xl tracking-tight mt-4">{title}</h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{message}</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to={primaryHref}><Button className="bg-foreground text-background">{primaryLabel}</Button></Link>
          <Link to="/help"><Button variant="outline">Get help</Button></Link>
        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return <ErrorScreen code="404" title="Page not found" message="The page you're looking for doesn't exist or has moved." testid="error-404" />;
}
export function Forbidden() {
  return <ErrorScreen code="403" title="Access denied" message="You don't have permission to view this resource. Ask an org admin if you think this is a mistake." testid="error-403" />;
}
export function ServerError() {
  return <ErrorScreen code="500" title="Something went wrong" message="An unexpected error happened on our side. Refresh the page or try again in a moment." testid="error-500" />;
}
export function Maintenance() {
  return <ErrorScreen code="503" title="Be right back" message="QuotientIQ is undergoing scheduled maintenance. Follow status updates on our changelog." testid="error-503" primaryLabel="View changelog" primaryHref="/help" />;
}
