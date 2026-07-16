import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/dashboard-page";
import { SchichtbuchPage } from "@/pages/schichtbuch-page";
import { EintragDetailPage } from "@/features/eintraege/eintrag-detail-page";
import { AnweisungenPage } from "@/features/anweisungen/anweisungen-page";
import { UebergabePage } from "@/pages/uebergabe-page";
import { UebergabeDetailPage } from "@/pages/uebergabe-detail-page";
import { BerichtePage } from "@/pages/berichte-page";
import { BerichtDetailPage } from "@/pages/bericht-detail-page";
import { AdminPage } from "@/pages/admin-page";
import { LoginPage } from "@/features/auth/login-page";
import { ProfilePage } from "@/features/auth/profile-page";
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
        path: "profil",
        element: <ProfilePage />,
        handle: { title: "Mein Konto", subtitle: "Eigene Daten und Passwort verwalten" },
      },
      {
        path: "anweisungen",
        element: (
          <RequirePermissionRoute permission="anweisungen:read">
            <AnweisungenPage />
          </RequirePermissionRoute>
        ),
        handle: { title: "Arbeitsanweisungen", subtitle: "Hinweise der Meister an das Team" },
      },
      {
        path: "uebergabe",
        element: (
          <RequirePermissionRoute permission="uebergaben:manage">
            <UebergabePage />
          </RequirePermissionRoute>
        ),
        handle: { title: "Schichtübergabe", subtitle: "Übergabe an die nächste Schicht" },
      },
      {
        path: "uebergabe/:id",
        element: (
          <RequirePermissionRoute permission="uebergaben:manage">
            <UebergabeDetailPage />
          </RequirePermissionRoute>
        ),
        handle: { title: "Schichtübergabe", subtitle: "Detailansicht mit PDF-Export" },
      },
      {
        path: "berichte",
        element: (
          <RequirePermissionRoute permission="berichte:read">
            <BerichtePage />
          </RequirePermissionRoute>
        ),
        handle: { title: "Berichte", subtitle: "Schicht-, Tages- und Wochenberichte" },
      },
      {
        path: "berichte/:id",
        element: (
          <RequirePermissionRoute permission="berichte:read">
            <BerichtDetailPage />
          </RequirePermissionRoute>
        ),
        handle: { title: "Schichtbericht", subtitle: "Detailansicht" },
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
