import axios, { type AxiosRequestConfig } from "axios";

const ACCESS_TOKEN_STORAGE_KEY = "schichtbuch.accessToken";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string | null): void {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  // Für den httpOnly-Refresh-Cookie (siehe /auth/refresh).
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpunkte, die selbst Teil des Auth-Bootstraps/Refresh-Flows sind – hier darf
// ein 401 NICHT automatisch einen erneuten Refresh/Redirect auslösen, sonst
// entstehen Endlosschleifen bzw. der reguläre "nicht angemeldet"-Zustand wird
// fälschlich als Fehler behandelt.
const AUTH_BOOTSTRAP_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

let refreshPromise: Promise<string> | null = null;

async function requestNewAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<{ accessToken: string }>("/auth/refresh")
      .then((response) => response.data.accessToken)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const isBootstrapCall = AUTH_BOOTSTRAP_PATHS.some((path) =>
      originalRequest?.url?.includes(path),
    );

    if (status === 401 && originalRequest && !isBootstrapCall && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await requestNewAccessToken();
        setAccessToken(newToken);
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return apiClient(originalRequest);
      } catch {
        setAccessToken(null);
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }
    }

    return Promise.reject(error);
  },
);
