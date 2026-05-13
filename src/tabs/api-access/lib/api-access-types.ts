import { z } from "zod";

export const permissionCodeSchema = z.object({
  code: z.string(),
  label: z.string().nullable(),
});

export const clientApiRoleListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string().nullable(),
  permissions: z.array(permissionCodeSchema),
});

export const clientApiRoleListSchema = z.array(clientApiRoleListItemSchema);

export const clientApiKeyListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  keyLookup: z.string(),
  apiKey: z.string().optional(),
  revokedAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  role: z.object({
    id: z.string(),
    slug: z.string(),
    label: z.string().nullable(),
  }),
});

export const clientApiKeyListSchema = z.array(clientApiKeyListItemSchema);

export const createClientApiKeyBodySchema = z.object({
  name: z.string().trim().min(1).max(128),
  roleId: z.string().min(1),
  keyLookup: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

export const createClientApiKeyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  keyLookup: z.string(),
  roleId: z.string(),
  apiKey: z.string(),
});

export type PermissionCode = z.infer<typeof permissionCodeSchema>;
export type ClientApiRoleListItem = z.infer<typeof clientApiRoleListItemSchema>;
export type ClientApiRoleList = z.infer<typeof clientApiRoleListSchema>;
export type ClientApiKeyListItem = z.infer<typeof clientApiKeyListItemSchema>;
export type ClientApiKeyList = z.infer<typeof clientApiKeyListSchema>;
export type CreateClientApiKeyBody = z.infer<
  typeof createClientApiKeyBodySchema
>;
export type CreateClientApiKeyResponse = z.infer<
  typeof createClientApiKeyResponseSchema
>;
