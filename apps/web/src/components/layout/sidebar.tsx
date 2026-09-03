import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Info,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import type { PermissionKey } from "@schichtbuch/shared";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-context";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  /** Nur anzeigen, wenn der Nutzer diese Permission besitzt. */
  permission?: PermissionKey;
  /** Alternativ: mindestens eine dieser Permissions genügt. */
  anyPermissions?: PermissionKey[];
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/schichtbuch", label: "Schichtbuch", icon: ClipboardList },
  {
    to: "/anweisungen",
    label: "Anweisungen",
    icon: ClipboardCheck,
    anyPermissions: ["anweisungen:read", "anweisungen:manage"],
  },
  { to: "/uebergabe", label: "Übergabe", icon: ArrowLeftRight },
  { to: "/berichte", label: "Berichte", icon: BarChart3 },
  { to: "/admin", label: "Admin", icon: Settings, permission: "admin:benutzer:manage" },
];

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { hasPermission } = useAuth();
  const visibleNavItems = navItems.filter((item) => {
    if (item.anyPermissions) return item.anyPermissions.some((p) => hasPermission(p));
    return !item.permission || hasPermission(item.permission);
  });
  const darfErfassen = hasPermission("eintraege:create");

  return (
    <aside
      className={cn(
        // Auf großen Screens fest sichtbar; auf Handy/Tablet als Overlay-Drawer,
        // der über die Kopfzeile ein-/ausgeblendet wird.
        "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:z-auto md:translate-x-0",
        open ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="flex h-touch items-center gap-2 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wrench className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <div className="font-semibold">Schichtbuch</div>
          <div className="text-xs text-sidebar-foreground/60">Instandhaltung</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {darfErfassen && (
        <div className="space-y-2 px-3 pb-4">
          <NavLink
            to="/schichtbuch?erfassen=schichtinformation"
            onClick={onClose}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Info className="h-4 w-4" />
            Schichtinformation
          </NavLink>
          <NavLink
            to="/schichtbuch?erfassen=stoerung"
            onClick={onClose}
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-sidebar-accent bg-sidebar-accent/40 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <AlertTriangle className="h-4 w-4" />
            Störung
          </NavLink>
        </div>
      )}
    </aside>
  );
}
