import type { ApiResponse } from "apisauce";
import { applySnapshot } from "mobx-state-tree";
import { rootStore } from "@/components/models";
import { fetchTeacherUploadsList } from "@/services/teacherUploadsApi";

function normalizeListPayload(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: Record<string, unknown>[] }).results;
  }
  return [];
}

let syncInProgress = false;

/**
 * Loads the latest TeacherUpload row whose `json_data` matches this device’s
 * `authUser.clientId` (or username as fallback) and applies it to the store.
 */
export async function syncServerDataToStore(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (syncInProgress) {
    return { ok: true, reason: "in_progress" };
  }

  const auth = rootStore.authUser;
  if (!auth) {
    return { ok: false, reason: "not_logged_in" };
  }

  const clientId = auth.clientId?.trim();
  if (!clientId) {
    return { ok: false, reason: "no_client_id" };
  }

  syncInProgress = true;
  try {
    const res = await fetchTeacherUploadsList();
    if (!res.ok) {
      const r = res as ApiResponse<unknown>;
      return {
        ok: false,
        reason: r.problem ?? `http_${r.status ?? 0}`,
      };
    }

    const list = normalizeListPayload(res.data);
    const username = auth.username;

    const row = list.find((item) => {
      const jd = item.json_data;
      if (!jd || typeof jd !== "object") return false;
      const a = (jd as { authUser?: { clientId?: string; username?: string } })
        .authUser;
      if (!a) return false;
      if (a.clientId && a.clientId === clientId) return true;
      if (a.username === username) return true;
      return false;
    });

    if (!row?.json_data || typeof row.json_data !== "object") {
      return { ok: true, reason: "no_remote_data" };
    }

    const jd = { ...(row.json_data as Record<string, unknown>) };
    const prevAuth = jd.authUser as
      | { clientId?: string; username?: string; password?: string; school_name?: string }
      | null
      | undefined;
    jd.authUser = prevAuth
      ? {
          ...prevAuth,
          clientId,
          password: prevAuth.password ?? "",
        }
      : null;

    applySnapshot(rootStore, jd as never);
    rootStore.ensureAuthClientId();

    return { ok: true };
  } catch (e) {
    console.warn("[sync] applySnapshot failed", e);
    return { ok: false, reason: "apply_failed" };
  } finally {
    syncInProgress = false;
  }
}
