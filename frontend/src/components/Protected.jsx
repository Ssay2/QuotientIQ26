import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen grid place-items-center" data-testid="protected-loading">
      <div className="font-mono text-xs text-muted-foreground">loading…</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
