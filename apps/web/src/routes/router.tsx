import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/dashboard-page";
import { SchichtbuchPage } from "@/pages/schichtbuch-page";
import { EintragDetailPage } from "@/features/eintraege/eintrag-detail-page";
import { UebergabePage } from "@/pages/uebergabe-page";
import { BerichtePage } from "@/pages/berichte-page";
import { AdminPage } from "@/pages/admin-page";
import { LoginPage } from "@/features/auth/login-page";
import { RequireAuth, RequirePermissionRoute } from "@/features/auth/protected-route";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
        handle: { title: "Dashboard", subtitle: "Überblick über die aktuelle Schicht" },
      },
      {
        path: "schichtbuch",
        element: <SchichtbuchPage />,
        handle: { title: "Schichtbuch", subtitle: "Einträge der Instandhaltung" },
      },
      {
        path: "schichtbuch/:id",
        element: <EintragDetailPage />,
        handle: { title: "Schichtbucheintrag", subtitle: "Detailansicht" },
      },
      {
        path: "uebergabe",
        element: <UebergabePage />,
        handle: { title: "Schichtübergabe", subtitle: "Übergabe an die nächste Schicht" },
      },
      {
        path: "berichte",
        element: <BerichtePage />,
        handle: { title: "Berichte", subtitle: "Schicht-, Tages- und Wochenberichte" },
      },
      {
        path: "admin",
        element: (
          <RequirePermissionRoute permission="admin:benutzer:manage">
            <AdminPage />
          </RequirePermissionRoute>
        ),
        handle: { title: "Admin", subtitle: "Benutzer- und Stammdatenverwaltung" },
      },
    ],
  },
]);
