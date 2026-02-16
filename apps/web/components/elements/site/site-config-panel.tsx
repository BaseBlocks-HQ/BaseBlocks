"use client";

import { DropZone } from "@/components/document-library/drop-zone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useImageUpload } from "@/lib/storage";
import { toProxyDownloadUrl } from "@/lib/storage/client";
import { cn } from "@/lib/utils";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import {
  Eye,
  EyeOff,
  FileText,
  Globe,
  Image,
  ImageIcon,
  Loader2,
  Route,
  Search,
  Type,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useEditorContextOptional } from "@/components/editor/editor-context";

interface SiteConfigPanelProps {
  siteId: Id<"sites">;
}

export function SiteConfigPanel({ siteId }: SiteConfigPanelProps) {
  const site = useQuery(api.sites.queries.get, { siteId });
  const updateSite = useMutation(api.sites.mutations.update);
  const { uploadImage, uploadState } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);
  const editorCtx = useEditorContextOptional();

  // Local state for editing
  const [localName, setLocalName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [localSiteTitle, setLocalSiteTitle] = useState("");
  const [localSiteDescription, setLocalSiteDescription] = useState("");
  const [localSiteKeywords, setLocalSiteKeywords] = useState("");
  const [localFavicon, setLocalFavicon] = useState("");
  const [localOgImage, setLocalOgImage] = useState("");

  // Sync local name with site data
  useEffect(() => {
    if (site?.name) {
      setLocalName(site.name);
    }
  }, [site?.name]);

  // Sync metadata settings with site data
  useEffect(() => {
    if (!site) return;
    setLocalSiteTitle(site.settings.siteTitle ?? "");
    setLocalSiteDescription(site.settings.siteDescription ?? "");
    setLocalSiteKeywords(site.settings.siteKeywords ?? "");
    setLocalFavicon(site.settings.favicon ?? "");
    setLocalOgImage(site.settings.ogImage ?? "");
  }, [site]);

  const isUploading = uploadState.isUploading;
  const uploadProgress = uploadState.progress?.percentage || 0;

  // Helper to update settings
  const updateSettings = useCallback(
    async (settingKey: string, value: boolean) => {
      if (!site) return;
      const oldValue = (site.settings as Record<string, unknown>)[settingKey];
      try {
        await updateSite({
          siteId,
          settings: {
            [settingKey]: value,
          },
        });
        if (editorCtx && !editorCtx.isUndoRedoExecuting) {
          editorCtx.pushCommand({
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
      } catch (error) {
        console.error("Failed to update setting:", error);
        toast.error("Failed to update setting");
      }
    },
    [siteId, site, updateSite, editorCtx]
  );

  // Handle logo upload
  const handleLogoUpload = useCallback(
    async (files: File[]) => {
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

        if (editorCtx && !editorCtx.isUndoRedoExecuting) {
          const newLogoUrl = result.url;
          editorCtx.pushCommand({
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
    },
    [siteId, site, uploadImage, uploadState.error, updateSite, editorCtx]
  );

  // Handle name save
  const handleSaveName = useCallback(async () => {
    if (!site || localName === site.name) {
      setIsEditingName(false);
      return;
    }

    const oldName = site.name;
    const newName = localName;
    try {
      await updateSite({
        siteId,
        name: newName,
      });
      setIsEditingName(false);
      toast.success("Site name updated");

      if (editorCtx && !editorCtx.isUndoRedoExecuting) {
        editorCtx.pushCommand({
          description: "Rename site",
          undo: async () => {
            await updateSite({ siteId, name: oldName });
          },
          redo: async () => {
            await updateSite({ siteId, name: newName });
          },
        });
      }
    } catch (error) {
      console.error("Failed to update name:", error);
      toast.error("Failed to update name");
    }
  }, [siteId, localName, site, updateSite, editorCtx]);

  const toOptionalSetting = (value: string): string | undefined => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const handleMetadataImageUpload = useCallback(
    async (field: "favicon" | "ogImage", file?: File) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      const result = await uploadImage(file, siteId);
      if (!result) {
        if (uploadState.error) toast.error(uploadState.error);
        return;
      }

      if (field === "favicon") {
        setLocalFavicon(result.url);
      } else {
        setLocalOgImage(result.url);
      }
      toast.success(field === "favicon" ? "Favicon uploaded" : "OG image uploaded");
    },
    [siteId, uploadImage, uploadState.error],
  );

  const handleSaveMetadataSettings = useCallback(async () => {
    try {
      await updateSite({
        siteId,
        settings: {
          favicon: toOptionalSetting(localFavicon),
          ogImage: toOptionalSetting(localOgImage),
          siteTitle: toOptionalSetting(localSiteTitle),
          siteDescription: toOptionalSetting(localSiteDescription),
          siteKeywords: toOptionalSetting(localSiteKeywords),
        },
      });
      setMetadataDialogOpen(false);
      toast.success("Metadata settings updated");
    } catch (error) {
      console.error("Failed to update metadata settings:", error);
      toast.error("Failed to update metadata settings");
    }
  }, [
    localFavicon,
    localOgImage,
    localSiteDescription,
    localSiteKeywords,
    localSiteTitle,
    siteId,
    updateSite,
  ]);

  if (!site) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Settings with defaults
  const showHeader = site.settings.showHeader !== false;
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;
  const showHeaderSearch = site.settings.showHeaderSearch === true;
  const showBreadcrumbs =
    site.settings.showBreadcrumbs ?? site.settings.navigationStyle !== "sidebar";

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="font-semibold text-sm mb-1">Site Settings</h3>
        <p className="text-xs text-muted-foreground">
          Configure your site header and branding
        </p>
      </div>

      {/* Header Visibility */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showHeader ? (
              <Eye className="h-4 w-4 text-muted-foreground" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="show-header" className="text-sm font-medium">
              Show Header
            </Label>
          </div>
          <Switch
            id="show-header"
            checked={showHeader}
            onCheckedChange={(checked) => updateSettings("showHeader", checked)}
          />
        </div>
        <p className="text-xs text-muted-foreground -mt-2 ml-6">
          Display the site header with logo and navigation
        </p>
      </div>

      {/* Logo Settings - only show if header is visible */}
      {showHeader && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show-logo" className="text-sm font-medium">
                Show Logo
              </Label>
            </div>
            <Switch
              id="show-logo"
              checked={showLogo}
              onCheckedChange={(checked) => updateSettings("showLogo", checked)}
            />
          </div>

          {/* Logo Upload - only show if logo is enabled */}
          {showLogo && (
            <div className="ml-6 space-y-2">
              {site.logoUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={toProxyDownloadUrl(site.logoUrl)}
                    alt="Site logo"
                    className="h-10 w-10 rounded-md object-contain border bg-muted"
                  />
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) handleLogoUpload(files);
                        e.target.value = "";
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
              ) : (
                <DropZone
                  onFilesAccepted={handleLogoUpload}
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
                        <p className="text-xs text-muted-foreground">
                          {uploadProgress}%
                        </p>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-5 w-5 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">
                          Drop logo here
                        </p>
                      </>
                    )}
                  </div>
                </DropZone>
              )}
            </div>
          )}
        </div>
      )}

      {/* Site Name Settings - only show if header is visible */}
      {showHeader && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show-site-name" className="text-sm font-medium">
                Show Site Name
              </Label>
            </div>
            <Switch
              id="show-site-name"
              checked={showSiteName}
              onCheckedChange={(checked) =>
                updateSettings("showSiteName", checked)
              }
            />
          </div>

          {/* Site Name Input - only show if name is enabled */}
          {showSiteName && (
            <div className="ml-6 space-y-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="text-sm h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") {
                        setLocalName(site.name);
                        setIsEditingName(false);
                      }
                    }}
                  />
                  <Button size="sm" className="h-8" onClick={handleSaveName}>
                    Save
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md border text-sm",
                    "hover:bg-muted/50 transition-colors cursor-text"
                  )}
                >
                  {site.name}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Header Search Settings - only show if header is visible */}
      {showHeader && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="show-header-search" className="text-sm font-medium">
                Search in Header
              </Label>
            </div>
            <Switch
              id="show-header-search"
              checked={showHeaderSearch}
              onCheckedChange={(checked) =>
                updateSettings("showHeaderSearch", checked)
              }
            />
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Add a document search bar to the site header
          </p>
        </div>
      )}

      {/* SEO & Metadata */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">SEO & Metadata</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMetadataDialogOpen(true)}
          >
            Configure
          </Button>
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          Set favicon, title, description, and social sharing metadata
        </p>
      </div>

      {/* Breadcrumb Settings */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="show-breadcrumbs" className="text-sm font-medium">
              Show Breadcrumbs
            </Label>
          </div>
          <Switch
            id="show-breadcrumbs"
            checked={showBreadcrumbs}
            onCheckedChange={(checked) =>
              updateSettings("showBreadcrumbs", checked)
            }
          />
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          Display the current page path below navigation
        </p>
      </div>

      <Dialog open={metadataDialogOpen} onOpenChange={setMetadataDialogOpen}>
        <DialogContent
          className="max-w-2xl"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>SEO & Metadata</DialogTitle>
            <DialogDescription>
              These values are used on your published site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="site-meta-title" className="text-sm">
                Site Title
              </Label>
              <Input
                id="site-meta-title"
                value={localSiteTitle}
                onChange={(e) => setLocalSiteTitle(e.target.value)}
                placeholder={site.name}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="site-meta-description" className="text-sm">
                Description
              </Label>
              <Textarea
                id="site-meta-description"
                value={localSiteDescription}
                onChange={(e) => setLocalSiteDescription(e.target.value)}
                placeholder="Short summary for search engines and social cards"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="site-meta-keywords" className="text-sm">
                Keywords
              </Label>
              <Input
                id="site-meta-keywords"
                value={localSiteKeywords}
                onChange={(e) => setLocalSiteKeywords(e.target.value)}
                placeholder="knowledge base, support, docs"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  Favicon
                </div>
                {localFavicon ? (
                  <img
                    src={toProxyDownloadUrl(localFavicon)}
                    alt="Favicon preview"
                    className="h-12 w-12 rounded border bg-muted object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept=".ico,.png,.jpg,.jpeg,.webp,.svg,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    void handleMetadataImageUpload("favicon", file);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => faviconInputRef.current?.click()}
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
                      Upload
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Open Graph Image
                </div>
                {localOgImage ? (
                  <img
                    src={toProxyDownloadUrl(localOgImage)}
                    alt="Open Graph preview"
                    className="h-20 w-full rounded border bg-muted object-cover"
                  />
                ) : (
                  <div className="h-20 w-full rounded border bg-muted flex items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
                <input
                  ref={ogImageInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    void handleMetadataImageUpload("ogImage", file);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ogImageInputRef.current?.click()}
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
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMetadataDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMetadataSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
