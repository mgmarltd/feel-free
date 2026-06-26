import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { AppShell } from "./AppShell";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { email, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
          Loading…
        </div>
      </div>
    );
  }

  if (!email) return <Navigate to="/login" replace />;

  return <AppShell>{children}</AppShell>;
}
