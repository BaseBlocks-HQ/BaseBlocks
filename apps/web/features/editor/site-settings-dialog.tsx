"use client";

import { useImageUpload } from "@/lib/files/use-image-upload";
import { DropZone } from "@/components/file-viewer/file-ui";
import { useEditorWorkspace } from "@/features/editor/editor-state";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import {
  Image01Icon,
  Navigation03Icon,
  PaintBrush01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DEFAULT_SITE_SIDEBAR_VARIANT,
  DEFAULT_SITE_THEME,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Spinner } from "@baseblocks/ui/spinner";
import { Switch } from "@baseblocks/ui/switch";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@baseblocks/ui/sidebar";
import { useMutation } from "convex/react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FaviconSettings } from "./settings/favicon-settings";
import { SiteAppearanceSettings } from "./settings/site-appearance-settings";

interface SiteSettingsDialogProps {
  onOpenChange: (open: boolean) => void;
  returnFocusTo?: HTMLElement | null;
  siteId: Id<"sites">;
}

type SiteSettingsSection = "brand" | "appearance" | "navigation";

function SettingsSection({
  action,
  children,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex min-h-7 items-center justify-between gap-3 px-0.5">
        <h4 className="text-sm font-medium">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function SettingSurface({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-lg bg-muted/25 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function PanelSettingRow({
  control,
  htmlFor,
  label,
}: {
  control: React.ReactNode;
  htmlFor?: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1 pr-2">
        <Label className="text-sm font-medium leading-none" htmlFor={htmlFor}>
          {label}
        </Label>
      </div>
      <div className="shrink-0">{control}</div>
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
                <Spinner className="mr-1 size-3" />
                {uploadProgress}%
              </>
            ) : (
              "Replace"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DropZone
        onFilesAccepted={onFilesAccepted}
        accept={{
          "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
        }}
        maxSize={5 * 1024 * 1024}
        className="border-dashed bg-background/40 py-5"
      >
        <div className="flex flex-col items-center justify-center gap-1 text-center">
          {isUploading ? (
            <>
              <Spinner className="size-4 text-muted-foreground" />
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
    <div>
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
        <div className="flex items-center gap-2">
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

export function SiteSettingsDialog({
  onOpenChange,
  returnFocusTo,
  siteId,
}: SiteSettingsDialogProps) {
  const { site: workspaceSite } = useEditorWorkspace();
  const site = workspaceSite?._id === siteId ? workspaceSite : null;
  const updateSite = useMutation(api.sites.update);
  const { uploadImage, uploadState } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [localName, setLocalName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isResettingAppearance, setIsResettingAppearance] = useState(false);
  const [section, setSection] = useState<SiteSettingsSection>("brand");

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
        logoFileId: result.fileId,
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

  const handleResetAppearance = async () => {
    setIsResettingAppearance(true);
    try {
      await updateSite({
        siteId,
        settings: {
          sidebarVariant: DEFAULT_SITE_SIDEBAR_VARIANT,
          theme: DEFAULT_SITE_THEME,
        },
      });
    } catch (_error) {
      toast.error("Failed to reset site appearance");
    } finally {
      setIsResettingAppearance(false);
    }
  };

  const showLogo = site?.settings.showLogo !== false;
  const showSiteName = site?.settings.showSiteName !== false;
  const showHeaderSearch = site?.settings.showHeaderSearch === true;
  const expandNavigationByDefault =
    site?.settings.expandNavigationByDefault === true;

  const navigation = [
    { id: "brand" as const, icon: Image01Icon, label: "Brand" },
    {
      id: "appearance" as const,
      icon: PaintBrush01Icon,
      label: "Appearance",
    },
    {
      id: "navigation" as const,
      icon: Navigation03Icon,
      label: "Navigation",
    },
  ];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(88vh,42rem)] w-[calc(100%-2rem)] max-w-[56rem] overflow-hidden rounded-[1.5rem] border-sidebar-border bg-background p-0 text-foreground shadow-2xl sm:max-w-[56rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
        returnFocusTo={returnFocusTo}
      >
        <DialogDescription className="sr-only">
          Configure the site brand, appearance, and navigation.
        </DialogDescription>
        <SidebarProvider
          className="h-full min-h-0 items-stretch"
          cookieName={null}
        >
          <Sidebar
            className="w-40 border-e border-sidebar-border sm:w-52"
            collapsible="none"
          >
            <SidebarHeader className="h-16 shrink-0 justify-center px-4">
              <DialogTitle
                className="text-sm font-semibold focus:outline-none"
                ref={titleRef}
                tabIndex={-1}
              >
                Site settings
              </DialogTitle>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup className="p-2">
                <SidebarGroupContent>
                  <SidebarMenu aria-label="Site settings sections">
                    {navigation.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          aria-pressed={section === item.id}
                          isActive={section === item.id}
                          onClick={() => setSection(item.id)}
                        >
                          <HugeiconsIcon icon={item.icon} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            {!site ? (
              <div className="flex min-h-full items-center justify-center">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            ) : section === "brand" ? (
              <SettingsSection title="Brand">
                <div className="space-y-2">
                  <SettingSurface label="Site name">
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
                  </SettingSurface>
                  <SettingSurface label="Logo">
                    <LogoUploadSection
                      fileInputRef={fileInputRef}
                      isUploading={isUploading}
                      logoUrl={site.logoUrl}
                      onFilesAccepted={handleLogoUpload}
                      uploadProgress={uploadProgress}
                    />
                  </SettingSurface>
                  <SettingSurface label="Favicon">
                    <FaviconSettings
                      favicon={site.settings.favicon}
                      siteId={siteId}
                      onChange={async (favicon) => {
                        await updateSite(
                          favicon
                            ? { siteId, settings: { favicon } }
                            : { siteId, clearFavicon: true },
                        );
                      }}
                    />
                  </SettingSurface>
                </div>
              </SettingsSection>
            ) : section === "appearance" ? (
              <SettingsSection
                title="Appearance"
                action={
                  <Button
                    className="h-7 px-2 text-xs"
                    disabled={isResettingAppearance}
                    onClick={() => void handleResetAppearance()}
                    size="sm"
                    variant="ghost"
                  >
                    Reset
                  </Button>
                }
              >
                <SiteAppearanceSettings
                  sidebarVariant={site.settings.sidebarVariant}
                  siteId={siteId}
                  theme={site.settings.theme}
                />
              </SettingsSection>
            ) : (
              <SettingsSection title="Navigation">
                <div className="space-y-0.5">
                  <PanelSettingRow
                    htmlFor="show-site-name"
                    label="Show site name"
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
                  <PanelSettingRow
                    htmlFor="show-logo"
                    label="Show logo"
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
                  <PanelSettingRow
                    htmlFor="show-header-search"
                    label="Search in header"
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
                  <PanelSettingRow
                    htmlFor="expand-navigation-by-default"
                    label="Expand pages by default"
                    control={
                      <Switch
                        id="expand-navigation-by-default"
                        checked={expandNavigationByDefault}
                        onCheckedChange={(checked) =>
                          updateSettings("expandNavigationByDefault", checked)
                        }
                      />
                    }
                  />
                </div>
              </SettingsSection>
            )}
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
