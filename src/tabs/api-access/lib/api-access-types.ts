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

export type PermissionCode = z.infer<typeof permissionCodeSchema>;
export type ClientApiRoleListItem = z.infer<typeof clientApiRoleListItemSchema>;
export type ClientApiRoleList = z.infer<typeof clientApiRoleListSchema>;
