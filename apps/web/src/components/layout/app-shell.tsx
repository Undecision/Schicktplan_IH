import { useEffect, useState } from "react";
import { Outlet, useLocation, useMatches } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";
import { AnweisungPopup } from "@/features/anweisungen/anweisung-popup";
import { ThemeToggle } from "@/features/theme/theme-toggle";
import { Button } from "@/components/ui/button";

interface RouteHandle {
  title?: string;
  subtitle?: string;
}

export function AppShell() {
  const matches = useMatches();
  const current = [...matches].reverse().find((match) => (match.handle as RouteHandle)?.title);
  const handle = current?.handle as RouteHandle | undefined;

  // Mobiler Navigations-Drawer (nur < md); schließt bei Navigation.
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      {/* Abdunkelnder Hintergrund für den mobilen Drawer. */}
      {navOpen && (
        <button
          type="button"
          aria-label="Menü schließen"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-touch shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Menü öffnen"
              onClick={() => setNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-tight">{handle?.title}</h1>
              {handle?.subtitle && (
                <p className="truncate text-sm text-muted-foreground">{handle.subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <AnweisungPopup />
    </div>
  );
}
