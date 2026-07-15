import type {
  CreateUserRequest,
  GewerkRef,
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
