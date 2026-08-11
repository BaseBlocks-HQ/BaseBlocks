"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import {
  DashboardPage,
  DashboardPageHeader,
} from "@/features/dashboard/layout/dashboard-page";
import { AccountSection } from "@/features/dashboard/settings/account-section";
import { OrganizationsSection } from "@/features/dashboard/settings/organizations-section";
import { useTranslations } from "next-intl";

type SettingsPageSection = "account" | "organizations";

export function SettingsPage({ section }: { section: SettingsPageSection }) {
  const t = useTranslations("settings");
  const { team, teams, user } = useTeamAccess();
  const title =
    section === "account" ? t("accountTitle") : t("organizations.title");

  return (
    <DashboardPage className="max-w-[48rem]">
      <DashboardPageHeader title={title} />
      {section === "account" ? (
        <AccountSection user={user} />
      ) : (
        <OrganizationsSection
          currentOrganizationId={team._id}
          teams={teams}
          user={user}
        />
      )}
    </DashboardPage>
  );
}
