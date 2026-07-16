import type { CreateRoleRequest, RoleSummary, UpdateRoleRequest } from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchRoles(): Promise<RoleSummary[]> {
  const { data } = await apiClient.get<RoleSummary[]>("/roles");
  return data;
}

export async function createRole(payload: CreateRoleRequest): Promise<RoleSummary> {
  const { data } = await apiClient.post<RoleSummary>("/roles", payload);
  return data;
}

export async function updateRole(id: string, payload: UpdateRoleRequest): Promise<RoleSummary> {
  const { data } = await apiClient.patch<RoleSummary>(`/roles/${id}`, payload);
  return data;
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/roles/${id}`);
}
