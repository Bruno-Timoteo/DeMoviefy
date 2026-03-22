import axios from "axios";

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

export const api = axios.create({
  baseURL: apiBaseUrl,
});

export function toApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${apiBaseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
