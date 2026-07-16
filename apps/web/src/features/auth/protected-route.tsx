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
  anyOf,
  children,
}: {
  /** Einzelne erforderliche Permission. */
  permission?: PermissionKey;
  /** Alternativ: mindestens eine dieser Permissions genügt. */
  anyOf?: PermissionKey[];
  children: ReactNode;
}) {
  const { hasPermission } = useAuth();
  const erlaubt = anyOf
    ? anyOf.some((p) => hasPermission(p))
    : permission
      ? hasPermission(permission)
      : true;
  if (!erlaubt) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
