import type {
  AnonymisierenResult,
  CreateUserRequest,
  GewerkRef,
  PersonExport,
  ResetPasswordRequest,
  UpdateUserRequest,
  UserSummary,
} from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchUsers(): Promise<UserSummary[]> {
  const { data } = await apiClient.get<UserSummary[]>("/users");
  return data;
}

export async function fetchGewerke(): Promise<GewerkRef[]> {
  const { data } = await apiClient.get<GewerkRef[]>("/gewerke");
  return data;
}

export async function createUser(payload: CreateUserRequest): Promise<UserSummary> {
  const { data } = await apiClient.post<UserSummary>("/users", payload);
  return data;
}

/** DSGVO-Auskunft: lädt die Personendaten und startet den JSON-Download. */
export async function exportPersonData(id: string, name: string): Promise<void> {
  const { data } = await apiClient.get<PersonExport>(`/admin/dsgvo/${id}/export`);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `DSGVO-Auskunft_${name.replace(/[^\w.-]+/g, "_")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function anonymisierenPerson(id: string): Promise<AnonymisierenResult> {
  const { data } = await apiClient.post<AnonymisierenResult>(`/admin/dsgvo/${id}/anonymisieren`);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserRequest): Promise<UserSummary> {
  const { data } = await apiClient.patch<UserSummary>(`/users/${id}`, payload);
  return data;
}

export async function deactivateUser(id: string): Promise<UserSummary> {
  const { data } = await apiClient.post<UserSummary>(`/users/${id}/deactivate`);
  return data;
}

export async function resetUserPassword(id: string, payload: ResetPasswordRequest): Promise<void> {
  await apiClient.post(`/users/${id}/reset-password`, payload);
}
