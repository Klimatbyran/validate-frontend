import { getUnearthApiBaseUrl } from "@/config/api-env";
import { garboAuthFetch, throwIfAuthError } from "@/lib/garbo-auth-fetch";
import {
  clientApiKeyListSchema,
  clientApiRoleListSchema,
  createClientApiKeyBodySchema,
  createClientApiKeyResponseSchema,
  apiKeyUsageListSchema,
  type ClientApiKeyList,
  type ClientApiRoleList,
  type CreateClientApiKeyBody,
  type CreateClientApiKeyResponse,
  type ApiKeyUsageList,
} from "./api-access-types";

export { ApiAuthError } from "@/lib/garbo-auth-fetch";

function apiAccessUrl(path: string): string {
  const base = getUnearthApiBaseUrl();
  const segment = path.replace(/^\//, "").replace(/\/+$/, "");
  const url = segment ? `${base}/${segment}` : base;
  return url.replace(/\/+$/, "");
}

export const fetchAPIAccessRoles = async (): Promise<ClientApiRoleList> => {
  const url = apiAccessUrl("/internal/client-api-keys/roles");
  try {
    const response = await garboAuthFetch(url);
    if (response.ok) {
      const data = await response.json();
      return clientApiRoleListSchema.parse(data);
    } else {
      throwIfAuthError(response.status);
      const msg = `Failed to fetch API access roles: ${response.status} ${response.statusText} (${url})`;
      console.error(msg);
      throw new Error(msg);
    }
  } catch (error) {
    const msg = `Failed to fetch API access roles (${url})`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

export const fetchAPIKeys = async (): Promise<ClientApiKeyList> => {
  const url = apiAccessUrl("/internal/client-api-keys/");
  try {
    const response = await garboAuthFetch(url);
    if (response.ok) {
      const data = await response.json();
      return clientApiKeyListSchema.parse(data);
    } else {
      throwIfAuthError(response.status);
      const msg = `Failed to fetch API keys: ${response.status} ${response.statusText} (${url})`;
      console.error(msg);
      throw new Error(msg);
    }
  } catch (error) {
    const msg = `Failed to fetch API keys (${url})`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

export const revokeAPIKey = async (id: string): Promise<void> => {
  const url = apiAccessUrl(`/internal/client-api-keys/${encodeURIComponent(id)}/revoke`);
  try {
    const response = await garboAuthFetch(url, { method: "POST" });
    if (!response.ok) {
      const msg = `Failed to revoke API key: ${response.status} ${response.statusText} (${url})`;
      console.error(msg);
      throw new Error(msg);
    }
  } catch (error) {
    const msg = `Failed to revoke API key (${url})`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

export const fetchApiKeyUsage = async (
  since?: string,
): Promise<ApiKeyUsageList> => {
  const url = since
    ? apiAccessUrl(
        `/internal/client-api-keys/usage?since=${encodeURIComponent(since)}`,
      )
    : apiAccessUrl("/internal/client-api-keys/usage");
  try {
    const response = await garboAuthFetch(url);
    if (response.ok) {
      const data = await response.json();
      return apiKeyUsageListSchema.parse(data);
    } else {
      throwIfAuthError(response.status);
      const msg = `Failed to fetch API key usage: ${response.status} ${response.statusText} (${url})`;
      console.error(msg);
      throw new Error(msg);
    }
  } catch (error) {
    const msg = `Failed to fetch API key usage (${url})`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

export const createAPIkey = async (
  body: CreateClientApiKeyBody,
): Promise<CreateClientApiKeyResponse> => {
  const url = apiAccessUrl("/internal/client-api-keys/");
  try {
    const parsedBody = createClientApiKeyBodySchema.parse(body);
    const response = await garboAuthFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedBody),
    });
    if (response.ok) {
      const data = await response.json();
      return createClientApiKeyResponseSchema.parse(data);
    } else {
      const msg = `Failed to create API key: ${response.status} ${response.statusText} (${url})`;
      console.error(msg);
      throw new Error(msg);
    }
  } catch (error) {
    const msg = `Failed to create API key (${url})`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};
