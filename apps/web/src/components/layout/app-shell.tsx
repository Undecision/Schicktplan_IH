import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/schichtbuch", label: "Schichtbuch" },
  { to: "/uebergabe", label: "Übergabe" },
  { to: "/berichte", label: "Berichte" },
  { to: "/admin", label: "Admin" },
];

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-touch max-w-7xl items-center justify-between px-4">
          <span className="text-lg font-semibold">Schichtbuch</span>
        </div>
      </header>

      <nav className="border-b border-border bg-secondary/40">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex h-touch items-center whitespace-nowrap px-4 text-base font-medium transition-colors",
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
