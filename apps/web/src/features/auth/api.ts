import type { AuthenticatedUser, LoginRequest, LoginResponse } from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", payload);
  return data;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function fetchMe(): Promise<AuthenticatedUser> {
  const { data } = await apiClient.get<AuthenticatedUser>("/auth/me");
  return data;
}

export async function refreshAccessToken(): Promise<{ accessToken: string }> {
  const { data } = await apiClient.post<{ accessToken: string }>("/auth/refresh");
  return data;
}
