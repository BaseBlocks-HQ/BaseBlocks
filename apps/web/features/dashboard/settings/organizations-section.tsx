"use client";

import type {
  TeamRecord,
  WorkspaceUser,
} from "@/features/authentication/model";
import {
  MAX_OWNED_ORGANIZATIONS,
  hasOrganizationRole,
} from "@baseblocks/backend/organization-policy";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useTranslations } from "next-intl";
import { OrganizationManagement } from "./organization-management";
import { WorkspaceCreateDialog } from "./workspace-create-dialog";

export function getWorkspaceSettingsState(teams: TeamRecord[]) {
  const ownedCount = teams.filter((team) =>
    hasOrganizationRole(team.memberRole, "owner"),
  ).length;
  const hasPersonalWorkspace = teams.some(
    (team) =>
      team.intent === "personal" &&
      hasOrganizationRole(team.memberRole, "owner"),
  );
  const hasUnclassifiedOwnedWorkspace = teams.some(
    (team) =>
      team.intent === null && hasOrganizationRole(team.memberRole, "owner"),
  );

  return {
    hasPersonalWorkspace,
    hasUnclassifiedOwnedWorkspace,
    ownedCount,
  };
}

export function WorkspaceSettingsHeaderActions({
  onSelectedOrganizationChange,
  selectedOrganizationId,
  teams,
}: {
  onSelectedOrganizationChange: (organizationId: string) => void;
  selectedOrganizationId: string;
  teams: TeamRecord[];
}) {
  const t = useTranslations("settings.organizations");
  const { hasPersonalWorkspace, hasUnclassifiedOwnedWorkspace, ownedCount } =
    getWorkspaceSettingsState(teams);
  const selected = teams.find((team) => team._id === selectedOrganizationId);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {selected ? (
        <Select
          value={selected._id}
          onValueChange={onSelectedOrganizationChange}
        >
          <SelectTrigger
            aria-label={t("manage")}
            className="w-36 min-w-0 sm:w-52 [&>span]:min-w-0 [&>span]:truncate"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            align="end"
            className="w-[min(20rem,calc(100vw-2rem))]"
            position="popper"
          >
            <SelectGroup>
              <SelectLabel>
                {t("ownedCount", {
                  count: ownedCount,
                  limit: MAX_OWNED_ORGANIZATIONS,
                })}
              </SelectLabel>
              {teams.map((team) => (
                <SelectItem key={team._id} value={team._id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}
      <WorkspaceCreateDialog
        compact
        disabled={ownedCount >= MAX_OWNED_ORGANIZATIONS}
        personalAllowed={
          !hasPersonalWorkspace && !hasUnclassifiedOwnedWorkspace
        }
      />
    </div>
  );
}

export function OrganizationsSection({
  currentOrganizationId,
  selectedOrganizationId,
  teams,
  user,
}: {
  currentOrganizationId: string;
  selectedOrganizationId: string;
  teams: TeamRecord[];
  user: WorkspaceUser | null;
}) {
  const t = useTranslations("settings.organizations");
  const { ownedCount } = getWorkspaceSettingsState(teams);
  const selected =
    teams.find((team) => team._id === selectedOrganizationId) ??
    teams.find((team) => team._id === currentOrganizationId) ??
    teams[0];

  return (
    <div className="space-y-10">
      {ownedCount >= MAX_OWNED_ORGANIZATIONS ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("limitReached", { limit: MAX_OWNED_ORGANIZATIONS })}
        </p>
      ) : null}

      {selected ? (
        <OrganizationManagement
          currentOrganizationId={currentOrganizationId}
          organization={selected}
          remainingWorkspaceSlug={
            teams.find((team) => team._id !== selected._id)?.slug ?? null
          }
          user={user}
        />
      ) : null}
    </div>
  );
}
