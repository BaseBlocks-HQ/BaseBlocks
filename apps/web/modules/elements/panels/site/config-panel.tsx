"use client";

import { useSite } from "@/lib/data";
import { useImageUpload } from "@/lib/storage";
import {
  CollapsibleSettingsSection,
  PanelSettingRow,
} from "@/modules/elements/panels/shared/editor-panel-primitives";
import { useEditorUndoOptional } from "@/modules/shared/contexts/editor-context";
import { DropZone } from "@/modules/shared/file-ui";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Switch } from "@baseblocks/ui/switch";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SiteMetadataSection } from "./site-metadata-section";

interface SiteConfigPanelProps {
  siteId: Id<"sites">;
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
  const site = useSite(siteId);
  const updateSite = useMutation(api.sites.mutations.update);
  const { uploadImage, uploadState } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const undoContext = useEditorUndoOptional();
  const [localName, setLocalName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const isUploading = uploadState.isUploading;
  const uploadProgress = uploadState.progress?.percentage || 0;

  const updateSettings = async (settingKey: string, value: boolean) => {
    if (!site) return;
    const oldValue = (site.settings as Record<string, unknown>)[settingKey];
    const shouldTrackUndo = Boolean(
      undoContext && !undoContext.isUndoRedoExecuting,
    );
    const activeUndoContext = shouldTrackUndo ? undoContext : null;
    try {
      await updateSite({
        siteId,
        settings: {
          [settingKey]: value,
        },
      });
      if (activeUndoContext) {
        activeUndoContext.pushCommand({
          description: `Toggle ${settingKey}`,
          undo: async () => {
            await updateSite({
              siteId,
              settings: { [settingKey]: oldValue as boolean },
            });
          },
          redo: async () => {
            await updateSite({
              siteId,
              settings: { [settingKey]: value },
            });
          },
        });
      }
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

    const oldLogoUrl = site?.logoUrl;
    const result = await uploadImage(file, siteId);

    if (result) {
      await updateSite({
        siteId,
        logoUrl: result.url,
      });
      toast.success("Logo uploaded");

      if (undoContext && !undoContext.isUndoRedoExecuting) {
        const newLogoUrl = result.url;
        undoContext.pushCommand({
          description: "Change logo",
          undo: async () => {
            await updateSite({
              siteId,
              logoUrl: oldLogoUrl ?? "",
            });
          },
          redo: async () => {
            await updateSite({
              siteId,
              logoUrl: newLogoUrl,
            });
          },
        });
      }
    } else if (uploadState.error) {
      toast.error(uploadState.error);
    }
  };

  const handleSaveName = async () => {
    if (!site || localName === site.name) {
      setIsEditingName(false);
      return;
    }

    const oldName = site.name;
    const newName = localName;
    const activeUndoContext =
      undoContext && !undoContext.isUndoRedoExecuting ? undoContext : null;
    try {
      await updateSite({
        siteId,
        name: newName,
      });
      setIsEditingName(false);
      toast.success("Site name updated");

      if (activeUndoContext) {
        activeUndoContext.pushCommand({
          description: "Rename site",
          undo: async () => {
            await updateSite({ siteId, name: oldName });
          },
          redo: async () => {
            await updateSite({ siteId, name: newName });
          },
        });
      }
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
    </div>
  );
}
