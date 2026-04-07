"use client";

import { useSite } from "@/lib/data";
import { useImageUpload } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { DropZone } from "@/modules/documents";
import { useEditorUndoOptional } from "@/modules/shared/contexts/editor-context";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Switch } from "@baseblocks/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useMutation } from "convex/react";
import {
  Eye,
  EyeOff,
  Globe,
  ImageIcon,
  Info,
  Loader2,
  PanelLeft,
  Route,
  Search,
  Type,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { MetadataDialog } from "./metadata-dialog";

interface SiteConfigPanelProps {
  siteId: Id<"sites">;
}

function SettingSection({
  control,
  description,
  icon,
  label,
}: {
  control: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <Label className="text-sm font-medium">{label}</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/60 cursor-default" />
            </TooltipTrigger>
            <TooltipContent side="top">{description}</TooltipContent>
          </Tooltip>
        </div>
        {control}
      </div>
    </div>
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
      <div className="ml-6 space-y-2">
        <div className="flex items-center gap-3">
          <Image
            src={logoUrl}
            alt="Site logo"
            className="h-10 w-10 rounded-md object-contain border bg-muted"
            width={40}
            height={40}
            unoptimized
          />
          <div className="flex-1">
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
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  Replace
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-6 space-y-2">
      <DropZone
        onFilesAccepted={onFilesAccepted}
        accept={{
          "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
        }}
        maxSize={5 * 1024 * 1024}
        className="py-4"
      >
        <div className="flex flex-col items-center justify-center">
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-5 w-5 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Drop logo here</p>
            </>
          )}
        </div>
      </DropZone>
    </div>
  );
}

function SiteNameSection({
  isEditing,
  name,
  onCancel,
  onChange,
  onEdit,
  onSave,
}: {
  isEditing: boolean;
  name: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  return (
    <div className="ml-6 space-y-2">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(event) => onChange(event.target.value)}
            className="text-sm h-8"
            onKeyDown={(event) => {
              if (event.key === "Enter") onSave();
              if (event.key === "Escape") onCancel();
            }}
          />
          <Button size="sm" className="h-8" onClick={onSave}>
            Save
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md border text-sm",
            "hover:bg-muted/50 transition-colors cursor-text",
          )}
        >
          {name}
        </button>
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
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);

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
      <div className="p-4 flex items-center justify-center">
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
    <div className="p-4 space-y-6">
      <div>
        <h3 className="font-semibold text-sm">Site Settings</h3>
      </div>

      <SettingSection
        control={
          <Switch
            id="show-header"
            checked={showHeader}
            onCheckedChange={(checked) => updateSettings("showHeader", checked)}
          />
        }
        description="Display the site header with logo and navigation"
        icon={
          showHeader ? (
            <Eye className="h-4 w-4 text-muted-foreground" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )
        }
        label="Show Header"
      />

      {showHeader && (
        <SettingSection
          control={
            <Switch
              id="show-logo"
              checked={showLogo}
              onCheckedChange={(checked) => updateSettings("showLogo", checked)}
            />
          }
          description="Display your uploaded logo in the site header"
          icon={<ImageIcon className="h-4 w-4 text-muted-foreground" />}
          label="Show Logo"
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
        <SettingSection
          control={
            <Switch
              id="show-site-name"
              checked={showSiteName}
              onCheckedChange={(checked) =>
                updateSettings("showSiteName", checked)
              }
            />
          }
          description="Display your site name beside the logo"
          icon={<Type className="h-4 w-4 text-muted-foreground" />}
          label="Show Site Name"
        />
      )}

      {showHeader && showSiteName && (
        <SiteNameSection
          isEditing={isEditingName}
          name={localName}
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
        <SettingSection
          control={
            <Switch
              id="show-header-search"
              checked={showHeaderSearch}
              onCheckedChange={(checked) =>
                updateSettings("showHeaderSearch", checked)
              }
            />
          }
          description="Add a document search bar to the site header"
          icon={<Search className="h-4 w-4 text-muted-foreground" />}
          label="Search in Header"
        />
      )}

      <SettingSection
        control={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMetadataDialogOpen(true)}
          >
            Configure
          </Button>
        }
        description="Set favicon, title, description, and social sharing metadata"
        icon={<Globe className="h-4 w-4 text-muted-foreground" />}
        label="SEO & Metadata"
      />

      <SettingSection
        control={
          <Switch
            id="show-breadcrumbs"
            checked={showBreadcrumbs}
            onCheckedChange={(checked) =>
              updateSettings("showBreadcrumbs", checked)
            }
          />
        }
        description="Display the current page path below navigation"
        icon={<Route className="h-4 w-4 text-muted-foreground" />}
        label="Show Breadcrumbs"
      />

      {isSidebarNav && (
        <SettingSection
          control={
            <Switch
              id="sidebar-default-expanded"
              checked={sidebarDefaultExpanded}
              onCheckedChange={(checked) =>
                updateSettings("sidebarDefaultExpanded", checked)
              }
            />
          }
          description="Show subpages expanded in the sidebar navigation"
          icon={<PanelLeft className="h-4 w-4 text-muted-foreground" />}
          label="Expand Pages by Default"
        />
      )}

      <MetadataDialog
        open={metadataDialogOpen}
        onOpenChange={setMetadataDialogOpen}
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
    </div>
  );
}
