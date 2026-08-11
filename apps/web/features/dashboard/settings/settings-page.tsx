"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import {
  DashboardPage,
  DashboardPageHeader,
} from "@/features/dashboard/layout/dashboard-page";
import { AccountSection } from "@/features/dashboard/settings/account-section";
import {
  OrganizationsSection,
  WorkspaceSettingsHeaderActions,
} from "@/features/dashboard/settings/organizations-section";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type SettingsPageSection = "account" | "organizations";

export function SettingsPage({ section }: { section: SettingsPageSection }) {
  const t = useTranslations("settings");
  const { team, teams, user } = useTeamAccess();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    team._id,
  );
  const title =
    section === "account" ? t("accountTitle") : t("organizations.title");

  useEffect(() => {
    if (!teams.some((candidate) => candidate._id === selectedOrganizationId)) {
      setSelectedOrganizationId(team._id);
    }
  }, [selectedOrganizationId, team._id, teams]);

  return (
    <DashboardPage className="max-w-[48rem]">
      <DashboardPageHeader
        action={
          section === "organizations" ? (
            <WorkspaceSettingsHeaderActions
              onSelectedOrganizationChange={setSelectedOrganizationId}
              selectedOrganizationId={selectedOrganizationId}
              teams={teams}
            />
          ) : null
        }
        title={title}
      />
      {section === "account" ? (
        <AccountSection user={user} />
      ) : (
        <OrganizationsSection
          currentOrganizationId={team._id}
          selectedOrganizationId={selectedOrganizationId}
          teams={teams}
          user={user}
        />
      )}
    </DashboardPage>
  );
}
