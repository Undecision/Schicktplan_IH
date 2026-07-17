import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthenticatedUser, PermissionKey } from "@schichtbuch/shared";
import { setAccessToken } from "@/lib/api-client";
import { fetchMe, login as loginRequest, logoutRequest, refreshAccessToken } from "./api";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  /** Aktuellen Nutzer im Context aktualisieren (z.B. nach Profiländerung). */
  setCurrentUser: (user: AuthenticatedUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Schützt vor Fehlkonfigurationen (z.B. Dev-Server liefert ohne Proxy die
 * SPA-index.html mit Status 200 statt eines echten 401 für /auth/me). */
function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as AuthenticatedUser).id === "string" &&
    Array.isArray((value as AuthenticatedUser).rollen) &&
    Array.isArray((value as AuthenticatedUser).permissions)
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const me = await fetchMe();
        if (!isAuthenticatedUser(me)) throw new Error("Unerwartete Antwort von /auth/me.");
        if (!cancelled) setUser(me);
      } catch {
        try {
          const { accessToken } = await refreshAccessToken();
          setAccessToken(accessToken);
          const me = await fetchMe();
          if (!isAuthenticatedUser(me)) throw new Error("Unerwartete Antwort von /auth/me.");
          if (!cancelled) setUser(me);
        } catch {
          setAccessToken(null);
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginRequest({ username, password });
    setAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback(
    (permission: PermissionKey) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const setCurrentUser = useCallback((next: AuthenticatedUser) => setUser(next), []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, hasPermission, setCurrentUser }),
    [user, isLoading, login, logout, hasPermission, setCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth muss innerhalb von <AuthProvider> verwendet werden.");
  }
  return ctx;
}
