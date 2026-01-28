"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounceCallback } from "@/hooks/use-debounce";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Code,
  Eye,
  FileText,
  Globe,
  Heading,
  Home,
  Loader2,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Text,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";

type Props = {
  params: Promise<{ siteId: string }>;
};

type PageType = {
  _id: string;
  title: string;
  slug: string;
  icon?: string;
  parentId?: string;
  order: number;
};

export default function SiteEditorPage({ params }: Props) {
  const { siteId } = use(params);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pages");

  const siteData = useQuery(api.sites.queries.getWithCompany, {
    siteId: siteId as Id<"sites">,
  });
  const pages = useQuery(api.pages.queries.list, {
    siteId: siteId as Id<"sites">,
  });
  const publishSite = useMutation(api.sites.mutations.publish);
  const createBlock = useMutation(api.blocks.mutations.create);

  if (siteData === undefined || pages === undefined) {
    return <EditorSkeleton />;
  }

  if (!siteData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }

  const { site, company } = siteData;
  const selectedPage = selectedPageId
    ? pages.find((p) => p._id === selectedPageId)
    : pages[0];

  const handlePublish = async () => {
    await publishSite({ siteId: siteId as Id<"sites"> });
  };

  const handleAddBlock = async (
    type: "heading" | "paragraph" | "divider" | "callout" | "code",
  ) => {
    if (!selectedPage) return;

    const content = (() => {
      switch (type) {
        case "heading":
          return { text: "New Heading", level: 2 };
        case "paragraph":
          return { text: "" };
        case "divider":
          return {};
        case "callout":
          return { text: "", variant: "info" };
        case "code":
          return { text: "", language: "typescript" };
        default:
          return { text: "" };
      }
    })();

    await createBlock({
      pageId: selectedPage._id as Id<"pages">,
      type,
      content,
    });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <Sidebar>
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate">{site.name}</h2>
                <p className="text-xs text-muted-foreground truncate">
                  {company.slug}.baseblocks.dev
                </p>
              </div>
            </div>
          </SidebarHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-2 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="pages" className="flex-1">Pages</TabsTrigger>
                <TabsTrigger value="components" className="flex-1">Components</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pages" className="flex-1 mt-0">
              <SidebarContent>
                <SidebarGroup>
                  <div className="flex items-center justify-between px-2">
                    <SidebarGroupLabel>Pages</SidebarGroupLabel>
                    <CreatePageDialog siteId={siteId} />
                  </div>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {pages
                        .filter((p) => !p.parentId)
                        .sort((a, b) => a.order - b.order)
                        .map((page) => (
                          <PageMenuItem
                            key={page._id}
                            page={page}
                            allPages={pages}
                            selectedPageId={selectedPage?._id}
                            onSelect={(id) => {
                              setSelectedPageId(id);
                              setActiveTab("components");
                            }}
                            siteId={siteId}
                            defaultPageId={site.defaultPageId}
                          />
                        ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </TabsContent>

            <TabsContent value="components" className="flex-1 mt-0">
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel className="px-2">Add to Page</SidebarGroupLabel>
                  <SidebarGroupContent className="px-2">
                    {selectedPage ? (
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          size="sm"
                          onClick={() => handleAddBlock("heading")}
                        >
                          <Heading className="h-4 w-4 mr-2" />
                          Heading
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          size="sm"
                          onClick={() => handleAddBlock("paragraph")}
                        >
                          <Text className="h-4 w-4 mr-2" />
                          Paragraph
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          size="sm"
                          onClick={() => handleAddBlock("callout")}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Callout
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          size="sm"
                          onClick={() => handleAddBlock("code")}
                        >
                          <Code className="h-4 w-4 mr-2" />
                          Code
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          size="sm"
                          onClick={() => handleAddBlock("divider")}
                        >
                          <Minus className="h-4 w-4 mr-2" />
                          Divider
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground px-2">
                        Select a page first
                      </p>
                    )}
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </TabsContent>
          </Tabs>

          <div className="mt-auto border-t p-4">
            <Button
              className="w-full"
              onClick={handlePublish}
              disabled={site.isPublished}
            >
              <Globe className="h-4 w-4 mr-2" />
              {site.isPublished ? "Published" : "Publish Site"}
            </Button>
          </div>
        </Sidebar>

        {/* Main Editor Area */}
        <main className="flex-1 flex flex-col">
          <header className="border-b h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              {selectedPage && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedPage.title}</span>
                  {site.defaultPageId === selectedPage._id && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <PreviewButton companySlug={company.slug} />
              {site.isPublished && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://${company.slug}.baseblocks.dev/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="h-4 w-4 mr-1.5" />
                    View Live
                  </a>
                </Button>
              )}
            </div>
          </header>

          <div className="flex-1 p-8 overflow-auto">
            {selectedPage ? (
              <PageEditor pageId={selectedPage._id} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a page to edit
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function PageMenuItem({
  page,
  allPages,
  selectedPageId,
  onSelect,
  siteId,
  defaultPageId,
  depth = 0,
}: {
  page: PageType;
  allPages: PageType[];
  selectedPageId?: string;
  onSelect: (id: string) => void;
  siteId: string;
  defaultPageId?: string;
  depth?: number;
}) {
  const children = allPages
    .filter((p) => p.parentId === page._id)
    .sort((a, b) => a.order - b.order);

  const isDefault = defaultPageId === page._id;

  return (
    <>
      <SidebarMenuItem className="group/page">
        <div className="flex items-center w-full">
          <SidebarMenuButton
            isActive={selectedPageId === page._id}
            onClick={() => onSelect(page._id)}
            className="flex-1"
            style={{ paddingLeft: `${(depth + 1) * 12}px` }}
          >
            {isDefault ? (
              <Home className="h-4 w-4 text-primary" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="truncate">{page.title}</span>
          </SidebarMenuButton>
          <PageActionsMenu
            page={page}
            siteId={siteId}
            isDefault={isDefault}
            onSelect={onSelect}
          />
        </div>
      </SidebarMenuItem>
      {children.map((child) => (
        <PageMenuItem
          key={child._id}
          page={child}
          allPages={allPages}
          selectedPageId={selectedPageId}
          onSelect={onSelect}
          siteId={siteId}
          defaultPageId={defaultPageId}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

function PageActionsMenu({
  page,
  siteId,
  isDefault,
  onSelect,
}: {
  page: PageType;
  siteId: string;
  isDefault: boolean;
  onSelect: (id: string) => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const setDefaultPage = useMutation(api.sites.mutations.setDefaultPage);
  const removePage = useMutation(api.pages.mutations.remove);

  const handleSetDefault = async () => {
    await setDefaultPage({
      siteId: siteId as Id<"sites">,
      pageId: page._id as Id<"pages">,
    });
  };

  const handleDelete = async () => {
    await removePage({ pageId: page._id as Id<"pages"> });
    setDeleteOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover/page:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSetDefault} disabled={isDefault}>
            <Star className="h-4 w-4" />
            {isDefault ? "Default Page" : "Set as Default"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenamePageDialog
        page={page}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{page.title}&rdquo;? This
              will also delete all content and child pages. This action cannot
              be undone.
              {isDefault && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  This is the default page. A new default will be assigned
                  automatically.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RenamePageDialog({
  page,
  open,
  onOpenChange,
}: {
  page: PageType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePage = useMutation(api.pages.mutations.update);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(page.title);
      setSlug(page.slug);
    }
  }, [open, page.title, page.slug]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updatePage({
        pageId: page._id as Id<"pages">,
        title,
        slug,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to rename page:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Page</DialogTitle>
          <DialogDescription>
            Update the title and URL slug for this page
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="renameTitle">Page Title</Label>
            <Input
              id="renameTitle"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="renameSlug">URL Slug</Label>
            <Input
              id="renameSlug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
              pattern="[a-z0-9-]+"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type SaveStatus = "idle" | "pending" | "saving" | "saved";

function PageEditor({ pageId }: { pageId: string }) {
  const pageData = useQuery(api.pages.queries.getWithBlocks, {
    pageId: pageId as Id<"pages">,
  });
  const updateBlock = useMutation(api.blocks.mutations.update);
  const removeBlock = useMutation(api.blocks.mutations.remove);

  // Track save status across all blocks
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear "saved" status after 2 seconds
  useEffect(() => {
    if (saveStatus === "saved") {
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [saveStatus]);

  if (pageData === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!pageData) {
    return <p className="text-muted-foreground">Page not found</p>;
  }

  const { page, blocks } = pageData;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <SaveIndicator status={saveStatus} />
      </div>

      <div className="space-y-4">
        {blocks.map((block) => (
          <BlockEditor
            key={block._id}
            block={block}
            onUpdate={(content) =>
              updateBlock({ blockId: block._id as Id<"blocks">, content })
            }
            onRemove={() => removeBlock({ blockId: block._id as Id<"blocks"> })}
            onSaveStatusChange={setSaveStatus}
          />
        ))}

        {blocks.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Add components from the sidebar to get started
          </p>
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1.5 text-sm transition-opacity duration-300 ${
        status === "saved" ? "text-green-600" : "text-muted-foreground"
      }`}
    >
      {status === "pending" && (
        <>
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <span>Unsaved changes</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3.5 w-3.5" />
          <span>Saved</span>
        </>
      )}
    </div>
  );
}

function BlockEditor({
  block,
  onUpdate,
  onRemove,
  onSaveStatusChange,
}: {
  block: { _id: string; type: string; content: unknown };
  onUpdate: (content: unknown) => Promise<unknown> | void;
  onRemove: () => void;
  onSaveStatusChange: (status: SaveStatus) => void;
}) {
  const content = block.content as {
    text?: string;
    level?: number;
    language?: string;
    variant?: string;
  };

  // Local state for immediate responsiveness
  const [localText, setLocalText] = useState(content.text || "");

  // Debounced save to server (500ms delay)
  const debouncedSave = useDebounceCallback(
    useCallback(
      async (text: string) => {
        onSaveStatusChange("saving");
        try {
          await onUpdate({ ...content, text });
          onSaveStatusChange("saved");
        } catch (error) {
          console.error("Failed to save:", error);
          onSaveStatusChange("idle");
        }
      },
      [onUpdate, content, onSaveStatusChange],
    ),
    500,
  );

  // Sync local state when block changes (e.g., switching between blocks)
  useEffect(() => {
    setLocalText(content.text || "");
  }, [block._id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const newText = e.target.value;
    setLocalText(newText); // Instant local update
    onSaveStatusChange("pending"); // Show unsaved indicator
    debouncedSave(newText); // Debounced server save
  };

  if (block.type === "heading") {
    return (
      <div className="group relative">
        <Input
          value={localText}
          onChange={handleChange}
          className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0"
          placeholder="Heading..."
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (block.type === "paragraph") {
    return (
      <div className="group relative">
        <textarea
          value={localText}
          onChange={handleChange}
          className="w-full min-h-[100px] resize-none border-none bg-transparent focus:outline-none"
          placeholder="Start writing..."
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (block.type === "divider") {
    return (
      <div className="group relative py-4">
        <hr className="border-border" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (block.type === "callout") {
    return (
      <div className="group relative">
        <div className="bg-muted border rounded-lg p-4">
          <textarea
            value={localText}
            onChange={handleChange}
            className="w-full min-h-[60px] resize-none border-none bg-transparent focus:outline-none"
            placeholder="Callout text..."
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (block.type === "code") {
    return (
      <div className="group relative">
        <div className="bg-zinc-950 text-zinc-100 rounded-lg p-4 font-mono text-sm">
          <textarea
            value={localText}
            onChange={handleChange}
            className="w-full min-h-[100px] resize-none border-none bg-transparent focus:outline-none text-zinc-100"
            placeholder="// Code here..."
            spellCheck={false}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-100"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded text-muted-foreground">
      Block type: {block.type}
    </div>
  );
}

function CreatePageDialog({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPage = useMutation(api.pages.mutations.create);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createPage({
        siteId: siteId as Id<"sites">,
        title,
        slug,
      });
      setOpen(false);
      setTitle("");
      setSlug("");
    } catch (err) {
      console.error("Failed to create page:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Page</DialogTitle>
          <DialogDescription>Add a new page to your site</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pageTitle">Page Title</Label>
            <Input
              id="pageTitle"
              placeholder="Getting Started"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pageSlug">URL Slug</Label>
            <Input
              id="pageSlug"
              placeholder="getting-started"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
              pattern="[a-z0-9-]+"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Page"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 border-r p-4">
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full" />
      </div>
      <div className="flex-1 p-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

function PreviewButton({ companySlug }: { companySlug: string }) {
  const handlePreview = () => {
    const port = window.location.port || "3000";
    window.open(`http://${companySlug}.localhost:${port}/`, "_blank");
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePreview}>
      <Eye className="h-4 w-4 mr-1.5" />
      Preview
    </Button>
  );
}
