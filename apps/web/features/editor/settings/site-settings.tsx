"use client";

import { useImageUpload } from "@/components/site-elements/use-image-upload";
import {
  CollapsibleSettingsSection,
  PanelSettingRow,
} from "@/features/editor/settings/settings-panel";
import { DropZone } from "@/components/file-viewer/file-ui";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Switch } from "@baseblocks/ui/switch";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SiteMetadataSection } from "./site-metadata-section";

interface SiteConfigPanelProps {
  siteId: Id<"sites">;
}

type DomainOperationResult = {
  error?: string;
  hostname?: string;
  status?: "pending" | "verified" | "misconfigured";
  verification?: Array<{ type: string; domain: string; value: string }>;
  recommendedCNAME?: Array<{ rank: number; value: string }>;
  recommendedIPv4?: Array<{ rank: number; value: string[] }>;
};

function DomainSettingsSection({ siteId }: SiteConfigPanelProps) {
  const domains = useQuery(api.siteDomains.listForSite, { siteId });
  const [hostname, setHostname] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [details, setDetails] = useState<DomainOperationResult | null>(null);

  const operate = async (
    action: "add" | "inspect" | "remove" | "verify",
    target: string,
  ) => {
    setIsWorking(true);
    try {
      const response = await fetch("/api/site-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, hostname: target, siteId }),
      });
      const result = (await response.json()) as DomainOperationResult;
      if (!response.ok)
        throw new Error(result.error ?? "Domain operation failed");
      setDetails(action === "remove" ? null : result);
      if (action === "add") setHostname("");
      toast.success(
        action === "remove" ? "Domain removed" : "Domain status refreshed",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Domain operation failed",
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <CollapsibleSettingsSection title="Custom domain" contentClassName="p-3">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          A custom domain opens this site at its root. Vercel provisions and
          renews TLS automatically.
        </p>
        <div className="flex gap-2">
          <Input
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            placeholder="docs.example.com"
            aria-label="Custom domain"
            disabled={isWorking}
          />
          <Button
            size="sm"
            disabled={isWorking || !hostname.trim()}
            onClick={() => operate("add", hostname)}
          >
            Add
          </Button>
        </div>
        {domains?.map((domain) => (
          <div
            key={domain._id}
            className="rounded-md border border-border/60 p-2.5"
          >
            <div className="flex items-center gap-2">
              {domain.status === "verified" ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {domain.hostname}
              </span>
              <span className="text-xs capitalize text-muted-foreground">
                {domain.status}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={isWorking}
                onClick={() => operate("verify", domain.hostname)}
              >
                <RefreshCw className="size-3.5" />
                <span className="sr-only">Verify domain</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={isWorking}
                onClick={() => operate("remove", domain.hostname)}
              >
                <Trash2 className="size-3.5" />
                <span className="sr-only">Remove domain</span>
              </Button>
            </div>
          </div>
        ))}
        {details?.verification?.map((record) => (
          <div
            key={`${record.domain}-${record.value}`}
            className="rounded-md bg-muted p-2 text-xs"
          >
            Add {record.type} record <strong>{record.domain}</strong> with value{" "}
            <code className="break-all">{record.value}</code>
          </div>
        ))}
        {details?.status === "misconfigured" &&
        details.recommendedCNAME?.[0] ? (
          <p className="text-xs text-muted-foreground">
            Point a CNAME record to{" "}
            <code>{details.recommendedCNAME[0].value}</code>, then verify again.
          </p>
        ) : null}
      </div>
    </CollapsibleSettingsSection>
  );
}

function LogoUploadSection({
  fileInputRef,
  isUploading,
  logoUrl,
  onFilesAccepted,
  uploadProgress,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  logoUrl?: string;
  onFilesAccepted: (files: File[]) => void;
  uploadProgress: number;
}) {
  if (logoUrl) {
    return (
      <div className="border-t border-border/60 px-3 py-3">
        <p className="mb-2 text-xs text-muted-foreground">Current logo</p>
        <div className="flex items-center gap-3">
          <Image
            src={logoUrl}
            alt="Site logo"
            className="h-10 w-10 rounded-md border border-border/60 bg-background object-contain"
            width={40}
            height={40}
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                if (files.length > 0) {
                  onFilesAccepted(files);
                }
                event.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  {uploadProgress}%
                </>
              ) : (
                "Replace"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border/60 px-3 py-3">
      <DropZone
        onFilesAccepted={onFilesAccepted}
        accept={{
          "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
        }}
        maxSize={5 * 1024 * 1024}
        className="border-dashed py-6"
      >
        <div className="flex flex-col items-center justify-center gap-1 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Drop an image here, or click to browse
            </p>
          )}
        </div>
      </DropZone>
    </div>
  );
}

function SiteNameSection({
  displayName,
  editValue,
  isEditing,
  onCancel,
  onChange,
  onEdit,
  onSave,
}: {
  displayName: string;
  editValue: string;
  isEditing: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  return (
    <div className="border-t border-border/60 px-3 py-3">
      {isEditing ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={editValue}
            onChange={(event) => onChange(event.target.value)}
            aria-label="Site name"
            className="h-8 text-sm sm:min-w-0 sm:flex-1"
            onKeyDown={(event) => {
              if (event.key === "Enter") onSave();
              if (event.key === "Escape") onCancel();
            }}
          />
          <div className="flex shrink-0 gap-2">
            <Button size="sm" className="h-8" onClick={onSave}>
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/80 px-2.5 py-1.5">
          <span className="min-w-0 flex-1 truncate text-sm">
            {displayName.trim() ? displayName : "Untitled site"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={onEdit}
          >
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}

export function SiteConfigPanel({ siteId }: SiteConfigPanelProps) {
  const site = useQuery(api.sites.get, { siteId });
  const updateSite = useMutation(api.sites.update);
  const { uploadImage, uploadState } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localName, setLocalName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const isUploading = uploadState.isUploading;
  const uploadProgress = uploadState.progress?.percentage || 0;

  const updateSettings = async (settingKey: string, value: boolean) => {
    if (!site) return;
    try {
      await updateSite({
        siteId,
        settings: {
          [settingKey]: value,
        },
      });
    } catch (_error) {
      toast.error("Failed to update setting");
    }
  };

  const handleLogoUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const result = await uploadImage(file, siteId);

    if (result) {
      await updateSite({
        siteId,
        logoUrl: result.url,
      });
      toast.success("Logo uploaded");
    } else if (uploadState.error) {
      toast.error(uploadState.error);
    }
  };

  const handleSaveName = async () => {
    if (!site || localName === site.name) {
      setIsEditingName(false);
      return;
    }

    const newName = localName;
    try {
      await updateSite({
        siteId,
        name: newName,
      });
      setIsEditingName(false);
      toast.success("Site name updated");
    } catch (_error) {
      toast.error("Failed to update name");
    }
  };

  if (!site) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showHeader = site.settings.showHeader !== false;
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;
  const showHeaderSearch = site.settings.showHeaderSearch === true;
  const showBreadcrumbs =
    site.settings.showBreadcrumbs ??
    site.settings.navigationStyle !== "sidebar";
  const isSidebarNav =
    !site.settings.navigationStyle ||
    site.settings.navigationStyle === "sidebar";
  const sidebarDefaultExpanded = !!(site.settings as Record<string, unknown>)
    .sidebarDefaultExpanded;

  return (
    <div className="space-y-5 p-4">
      <header>
        <h3 className="text-sm font-semibold tracking-tight">Site settings</h3>
      </header>

      <CollapsibleSettingsSection title="Header">
        <PanelSettingRow
          htmlFor="show-header"
          label="Show header"
          tooltip="Top bar with your branding, site name, and navigation."
          control={
            <Switch
              id="show-header"
              checked={showHeader}
              onCheckedChange={(checked) =>
                updateSettings("showHeader", checked)
              }
            />
          }
        />

        {showHeader && (
          <PanelSettingRow
            htmlFor="show-site-name"
            label="Show site name"
            tooltip="Displays your site name beside the logo when both logo and name are turned on."
            control={
              <Switch
                id="show-site-name"
                checked={showSiteName}
                onCheckedChange={(checked) =>
                  updateSettings("showSiteName", checked)
                }
              />
            }
          />
        )}

        {showHeader && showSiteName && (
          <SiteNameSection
            displayName={site.name}
            editValue={localName}
            isEditing={isEditingName}
            onCancel={() => {
              setLocalName(site.name);
              setIsEditingName(false);
            }}
            onChange={setLocalName}
            onEdit={() => {
              setLocalName(site.name);
              setIsEditingName(true);
            }}
            onSave={handleSaveName}
          />
        )}

        {showHeader && (
          <PanelSettingRow
            htmlFor="show-logo"
            label="Show logo"
            tooltip="When enabled, the logo you upload appears in the header (if the header is visible)."
            control={
              <Switch
                id="show-logo"
                checked={showLogo}
                onCheckedChange={(checked) =>
                  updateSettings("showLogo", checked)
                }
              />
            }
          />
        )}

        {showHeader && showLogo && (
          <LogoUploadSection
            fileInputRef={fileInputRef}
            isUploading={isUploading}
            logoUrl={site.logoUrl}
            onFilesAccepted={handleLogoUpload}
            uploadProgress={uploadProgress}
          />
        )}

        {showHeader && (
          <PanelSettingRow
            htmlFor="show-header-search"
            label="Search in header"
            tooltip="Adds a search field so visitors can find documents from the header."
            control={
              <Switch
                id="show-header-search"
                checked={showHeaderSearch}
                onCheckedChange={(checked) =>
                  updateSettings("showHeaderSearch", checked)
                }
              />
            }
          />
        )}

        <PanelSettingRow
          htmlFor="show-breadcrumbs"
          label="Breadcrumbs"
          tooltip="Shows the path to the current page under the main navigation so visitors know where they are."
          control={
            <Switch
              id="show-breadcrumbs"
              checked={showBreadcrumbs}
              onCheckedChange={(checked) =>
                updateSettings("showBreadcrumbs", checked)
              }
            />
          }
        />

        {isSidebarNav && (
          <PanelSettingRow
            htmlFor="sidebar-default-expanded"
            label="Expand sidebar pages"
            tooltip="When using sidebar navigation, nested pages start expanded instead of collapsed."
            control={
              <Switch
                id="sidebar-default-expanded"
                checked={sidebarDefaultExpanded}
                onCheckedChange={(checked) =>
                  updateSettings("sidebarDefaultExpanded", checked)
                }
              />
            }
          />
        )}
      </CollapsibleSettingsSection>

      <CollapsibleSettingsSection
        title="Discovery and SEO"
        contentClassName="p-3"
      >
        <SiteMetadataSection
          siteId={siteId}
          siteName={site.name}
          initialValues={{
            siteTitle: site.settings.siteTitle ?? "",
            siteDescription: site.settings.siteDescription ?? "",
            siteKeywords: site.settings.siteKeywords ?? "",
            favicon: site.settings.favicon ?? "",
            ogImage: site.settings.ogImage ?? "",
          }}
          onSave={async (values) => {
            await updateSite({ siteId, settings: values });
          }}
        />
      </CollapsibleSettingsSection>

      <DomainSettingsSection siteId={siteId} />
    </div>
  );
}
