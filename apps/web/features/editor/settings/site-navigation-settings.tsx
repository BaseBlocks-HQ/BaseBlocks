"use client";

import { api } from "@baseblocks/backend";
import type { Doc } from "@baseblocks/backend";
import { Label } from "@baseblocks/ui/label";
import { Switch } from "@baseblocks/ui/switch";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { SiteSettingsSectionTitle } from "./site-settings-section-title";

type BooleanSiteSetting =
  | "showSiteName"
  | "showLogo"
  | "showHeaderSearch"
  | "expandNavigationByDefault";

export function SiteNavigationSettings({ site }: { site: Doc<"sites"> }) {
  const updateSite = useMutation(api.sites.update);
  const updateSetting = async (key: BooleanSiteSetting, value: boolean) => {
    try {
      await updateSite({ siteId: site._id, settings: { [key]: value } });
    } catch {
      toast.error("Unable to update this setting. Try again.");
    }
  };

  return (
    <div className="space-y-10">
      <SettingsGroup title="Branding">
        <SettingRow
          checked={site.settings.showSiteName !== false}
          id="show-site-name"
          label="Show site name"
          onChange={(value) => updateSetting("showSiteName", value)}
        />
        <SettingRow
          checked={site.settings.showLogo !== false}
          id="show-logo"
          label="Show logo"
          onChange={(value) => updateSetting("showLogo", value)}
        />
      </SettingsGroup>
      <SettingsGroup title="Browsing">
        <SettingRow
          checked={site.settings.showHeaderSearch === true}
          id="show-header-search"
          label="Search in header"
          onChange={(value) => updateSetting("showHeaderSearch", value)}
        />
        <SettingRow
          checked={site.settings.expandNavigationByDefault === true}
          id="expand-navigation-by-default"
          label="Expand pages by default"
          onChange={(value) =>
            updateSetting("expandNavigationByDefault", value)
          }
        />
      </SettingsGroup>
    </div>
  );
}

function SettingsGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-5">
      <SiteSettingsSectionTitle>{title}</SiteSettingsSectionTitle>
      {children}
    </section>
  );
}

function SettingRow({
  checked,
  id,
  label,
  onChange,
}: {
  checked: boolean;
  id: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-1">
      <Label htmlFor={id}>{label}</Label>
      <Switch checked={checked} id={id} onCheckedChange={onChange} />
    </div>
  );
}
