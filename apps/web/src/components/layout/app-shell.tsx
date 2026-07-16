import { Outlet, useMatches } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";
import { AnweisungPopup } from "@/features/anweisungen/anweisung-popup";
import { ThemeToggle } from "@/features/theme/theme-toggle";

interface RouteHandle {
  title?: string;
  subtitle?: string;
}

export function AppShell() {
  const matches = useMatches();
  const current = [...matches].reverse().find((match) => (match.handle as RouteHandle)?.title);
  const handle = current?.handle as RouteHandle | undefined;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-touch shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div>
            <h1 className="text-lg font-semibold leading-tight">{handle?.title}</h1>
            {handle?.subtitle && <p className="text-sm text-muted-foreground">{handle.subtitle}</p>}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <Outlet />
        </main>
      </div>

      <AnweisungPopup />
    </div>
  );
}
