import axios from "axios";

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";
export const frontendAppVersion = "1.3.0";
export const frontendApiContractVersion = "2026-03-22.1";

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

export function toApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${apiBaseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function toApiUrlWithQuery(path: string, params: Record<string, string | number | boolean | null | undefined>) {
  const url = new URL(toApiUrl(path));

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}
