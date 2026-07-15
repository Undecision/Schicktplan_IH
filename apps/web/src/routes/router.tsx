import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/dashboard-page";
import { SchichtbuchPage } from "@/pages/schichtbuch-page";
import { UebergabePage } from "@/pages/uebergabe-page";
import { BerichtePage } from "@/pages/berichte-page";
import { AdminPage } from "@/pages/admin-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "schichtbuch", element: <SchichtbuchPage /> },
      { path: "uebergabe", element: <UebergabePage /> },
      { path: "berichte", element: <BerichtePage /> },
      { path: "admin", element: <AdminPage /> },
    ],
  },
]);
