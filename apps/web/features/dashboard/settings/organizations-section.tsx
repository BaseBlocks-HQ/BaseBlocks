"use client";

import type {
  TeamRecord,
  WorkspaceUser,
} from "@/features/authentication/model";
import {
  MAX_OWNED_ORGANIZATIONS,
  hasOrganizationRole,
} from "@baseblocks/backend/organization-policy";
import { Badge } from "@baseblocks/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { OrganizationManagement } from "./organization-management";
import { WorkspaceCreateDialog } from "./workspace-create-dialog";

export function OrganizationsSection({
  currentOrganizationId,
  teams,
  user,
}: {
  currentOrganizationId: string;
  teams: TeamRecord[];
  user: WorkspaceUser | null;
}) {
  const t = useTranslations("settings.organizations");
  const [selectedId, setSelectedId] = useState(currentOrganizationId);
  const ownedCount = useMemo(
    () =>
      teams.filter((team) => hasOrganizationRole(team.memberRole, "owner"))
        .length,
    [teams],
  );
  const hasPersonalWorkspace = teams.some(
    (team) =>
      team.intent === "personal" &&
      hasOrganizationRole(team.memberRole, "owner"),
  );
  const hasUnclassifiedOwnedWorkspace = teams.some(
    (team) =>
      team.intent === null && hasOrganizationRole(team.memberRole, "owner"),
  );
  const selected =
    teams.find((team) => team._id === selectedId) ??
    teams.find((team) => team._id === currentOrganizationId) ??
    teams[0];

  useEffect(() => {
    if (!teams.some((team) => team._id === selectedId)) {
      setSelectedId(currentOrganizationId);
    }
  }, [currentOrganizationId, selectedId, teams]);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Badge variant="secondary">
          {t("ownedCount", {
            count: ownedCount,
            limit: MAX_OWNED_ORGANIZATIONS,
          })}
        </Badge>
        <div className="flex flex-wrap gap-2">
          <WorkspaceCreateDialog
            disabled={ownedCount >= MAX_OWNED_ORGANIZATIONS}
            personalAllowed={
              !hasPersonalWorkspace && !hasUnclassifiedOwnedWorkspace
            }
          />
        </div>
      </div>

      {ownedCount >= MAX_OWNED_ORGANIZATIONS ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("limitReached", { limit: MAX_OWNED_ORGANIZATIONS })}
        </p>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="settings-organization">
          {t("manage")}
        </label>
        <Select value={selected?._id} onValueChange={setSelectedId}>
          <SelectTrigger
            id="settings-organization"
            className="w-full sm:max-w-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team._id} value={team._id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
