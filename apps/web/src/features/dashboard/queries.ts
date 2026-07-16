import { useQuery } from "@tanstack/react-query";
import type { DashboardData } from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await apiClient.get<DashboardData>("/dashboard");
  return data;
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });
}
