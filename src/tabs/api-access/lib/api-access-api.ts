import { getGarboApiBaseUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import {
  clientApiKeyListSchema,
  clientApiRoleListSchema,
  createClientApiKeyBodySchema,
  createClientApiKeyResponseSchema,
  type ClientApiKeyList,
  type ClientApiRoleList,
  type CreateClientApiKeyBody,
  type CreateClientApiKeyResponse,
} from "./api-access-types";

export function reportsUrl(path: string): string {
  const base = getGarboApiBaseUrl();
  const segment = path.replace(/^\//, "").replace(/\/+$/, "");
  const url = segment ? `${base}/${segment}` : base;
  return url.replace(/\/+$/, "");
}

export const fetchAPIAccessRoles = async (): Promise<ClientApiRoleList> => {
  const url = reportsUrl("/internal/client-api-keys/roles");
  try {
    const response = await garboAuthFetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(data);
      return clientApiRoleListSchema.parse(data);
    } else {
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
  const url = reportsUrl("/internal/client-api-keys/");
  try {
    const response = await garboAuthFetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(data);
      return clientApiKeyListSchema.parse(data);
    } else {
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

export const createAPIkey = async (
  body: CreateClientApiKeyBody,
): Promise<CreateClientApiKeyResponse> => {
  const url = reportsUrl("/internal/client-api-keys/");
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
      console.log(data);
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
