/**
 * Tag options API (garbo /api/tag-options).
 * All endpoints require auth: send JWT in Authorization header; use x-auth-token from response for subsequent requests.
 */

import { getGarboApiBaseUrl } from "@/config/api-env";
import type { TagOption, CreateTagOptionBody, UpdateTagOptionBody } from "./types";

const BASE = getGarboApiBaseUrl();
const TOKEN_STORAGE_KEY = "token";

function tagOptionsUrl(path = ""): string {
  const segment = path.replace(/^\//, "");
  return segment ? `${BASE}/tag-options/${segment}` : `${BASE}/tag-options`;
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function handleAuthResponse(res: Response): void {
  const newToken = res.headers.get("x-auth-token");
  if (newToken && typeof localStorage !== "undefined") {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    window.dispatchEvent(new CustomEvent("token-updated", { detail: newToken }));
  }
}

async function garboFetch(
  url: string,
  options: RequestInit & { skipAuthRefresh?: boolean } = {}
): Promise<Response> {
  const { skipAuthRefresh, ...init } = options;
  const headers = new Headers(init.headers);
  Object.entries(getAuthHeaders()).forEach(([k, v]) => headers.set(k, v));
  const res = await fetch(url, { ...init, headers, credentials: "include" });
  if (!skipAuthRefresh) handleAuthResponse(res);
  return res;
}

/** List all tag options (ordered by slug). Requires auth. */
export async function fetchTagOptions(): Promise<TagOption[]> {
  const res = await garboFetch(tagOptionsUrl(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (res.status === 401) {
    throw new Error("Please log in to view tag options.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch tag options: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.tagOptions ?? data.items ?? [];
}

/** Create a tag option. Returns created option. 409 if slug exists. Requires auth. */
export async function createTagOption(
  body: CreateTagOptionBody
): Promise<TagOption> {
  const res = await garboFetch(tagOptionsUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error("Please log in to create tag options.");
  }
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409) throw new Error("Tag option with this slug already exists.");
    throw new Error(`Failed to create tag option: ${res.status} ${text}`);
  }
  return res.json();
}

/** Update a tag option by id. On slug change, companies are updated in a transaction. Requires auth. */
export async function updateTagOption(
  id: string,
  body: UpdateTagOptionBody
): Promise<TagOption> {
  const res = await garboFetch(tagOptionsUrl(id), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error("Please log in to update tag options.");
  }
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409) throw new Error("Another tag option already has this slug.");
    throw new Error(`Failed to update tag option: ${res.status} ${text}`);
  }
  return res.json();
}

/** Delete a tag option and remove the tag from all companies (transaction). Requires auth. */
export async function deleteTagOption(id: string): Promise<void> {
  const res = await garboFetch(tagOptionsUrl(id), { method: "DELETE" });
  if (res.status === 401) {
    throw new Error("Please log in to delete tag options.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete tag option: ${res.status} ${text}`);
  }
}
