import { create, type ApiResponse } from "apisauce";
import { Platform } from "react-native";

const DEFAULT_PORT = "8000";

/**
 * Base URL for the Django API. Override with EXPO_PUBLIC_API_BASE_URL (no trailing slash).
 * Android emulator: 10.0.2.2 reaches the host machine. iOS simulator / web: 127.0.0.1.
 * Physical devices: set EXPO_PUBLIC_API_BASE_URL to http://YOUR_LAN_IP:PORT
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }
  return `http://127.0.0.1:${DEFAULT_PORT}`;
}

export const api = create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

/** GET list — DRF may return `{ results: [...] }` or a raw array. */
export async function fetchTeacherUploadsList() {
  return api.get<unknown>("/api/v1/TeacherUploads/");
}

export type TeacherUploadCreateBody = {
  json_data: Record<string, unknown>;
};

/**
 * POST /api/v1/TeacherUploads/ — DRF create (avoids Django HTML form CSRF on /create/).
 */
export async function createTeacherUpload(
  jsonData: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return api.post("/api/v1/TeacherUploads/", { json_data: jsonData });
}
