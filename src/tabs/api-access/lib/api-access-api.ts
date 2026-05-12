import { getGarboApiBaseUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import {
  clientApiRoleListSchema,
  type ClientApiRoleList,
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
