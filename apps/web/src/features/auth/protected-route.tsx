import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { PermissionKey } from "@schichtbuch/shared";
import { useAuth } from "./auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">Lädt…</div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export function RequirePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}

export function RequirePermissionRoute({
  permission,
  children,
}: {
  permission: PermissionKey;
  children: ReactNode;
}) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
