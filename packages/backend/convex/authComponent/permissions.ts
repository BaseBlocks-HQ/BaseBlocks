import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

export const baseBlocksStatements = {
  ...defaultStatements,
  site: ["manage"],
  content: ["edit"],
  publication: ["publish"],
  library: ["manage"],
} as const;

export const baseBlocksAccessControl =
  createAccessControl(baseBlocksStatements);

export const ownerRole = baseBlocksAccessControl.newRole({
  ...ownerAc.statements,
  site: ["manage"],
  content: ["edit"],
  publication: ["publish"],
  library: ["manage"],
});

export const adminRole = baseBlocksAccessControl.newRole({
  ...adminAc.statements,
  site: ["manage"],
  content: ["edit"],
  publication: ["publish"],
  library: ["manage"],
});

export const editorRole = baseBlocksAccessControl.newRole({
  ...memberAc.statements,
  site: ["manage"],
  content: ["edit"],
  publication: ["publish"],
  library: ["manage"],
});

export const viewerRole = baseBlocksAccessControl.newRole({
  ...memberAc.statements,
  site: [],
  content: [],
  publication: [],
  library: [],
});

export const baseBlocksRoles = {
  owner: ownerRole,
  admin: adminRole,
  editor: editorRole,
  viewer: viewerRole,
};

export type OrganizationRole = keyof typeof baseBlocksRoles;

export type OrganizationPermission =
  | { resource: "organization"; action: "update" | "delete" }
  | { resource: "member"; action: "create" | "update" | "delete" }
  | { resource: "invitation"; action: "create" | "cancel" }
  | { resource: "site"; action: "manage" }
  | { resource: "content"; action: "edit" }
  | { resource: "publication"; action: "publish" }
  | { resource: "library"; action: "manage" };

export function roleHasPermission(
  role: string,
  permission: OrganizationPermission,
): boolean {
  return role.split(",").some((roleName) => {
    const configuredRole = baseBlocksRoles[roleName as OrganizationRole];
    return configuredRole?.authorize({
      [permission.resource]: [permission.action],
    }).success;
  });
}
