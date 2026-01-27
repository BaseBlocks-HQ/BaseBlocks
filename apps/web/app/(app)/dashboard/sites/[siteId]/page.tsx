"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Plus,
  FileText,
  ChevronRight,
  Settings,
  Globe,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useDebounceCallback } from "@/hooks/use-debounce";
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

type Props = {
  params: Promise<{ siteId: string }>;
};

export default function SiteEditorPage({ params }: Props) {
  const { siteId } = use(params);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const siteData = useQuery(api.sites.queries.getWithCompany, {
    siteId: siteId as Id<"sites">,
  });
  const pages = useQuery(api.pages.queries.list, {
    siteId: siteId as Id<"sites">,
  });
  const publishSite = useMutation(api.sites.mutations.publish);

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
                  {company.slug}.baseblocks.dev/{site.slug}
                </p>
              </div>
            </div>
          </SidebarHeader>

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
                        onSelect={setSelectedPageId}
                      />
                    ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <div className="mt-auto border-t p-4 space-y-2">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Site Settings
            </Button>
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
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {site.isPublished && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://${company.slug}.baseblocks.dev/${site.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
  depth = 0,
}: {
  page: { _id: string; title: string; icon?: string; parentId?: string };
  allPages: Array<{ _id: string; title: string; icon?: string; parentId?: string; order: number }>;
  selectedPageId?: string;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const children = allPages
    .filter((p) => p.parentId === page._id)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={selectedPageId === page._id}
          onClick={() => onSelect(page._id)}
          className="pl-4"
          style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        >
          <FileText className="h-4 w-4" />
          <span>{page.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {children.map((child) => (
        <PageMenuItem
          key={child._id}
          page={child}
          allPages={allPages}
          selectedPageId={selectedPageId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

type SaveStatus = "idle" | "pending" | "saving" | "saved";

function PageEditor({ pageId }: { pageId: string }) {
  const pageData = useQuery(api.pages.queries.getWithBlocks, {
    pageId: pageId as Id<"pages">,
  });
  const createBlock = useMutation(api.blocks.mutations.create);
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

  const handleAddBlock = async (type: "heading" | "paragraph") => {
    await createBlock({
      pageId: pageId as Id<"pages">,
      type,
      content: type === "heading" ? { text: "New Heading", level: 2 } : { text: "" },
    });
  };

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

        {/* Add Block Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddBlock("heading")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Heading
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddBlock("paragraph")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Paragraph
          </Button>
        </div>
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
  const content = block.content as { text?: string; level?: number };

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
      [onUpdate, content, onSaveStatusChange]
    ),
    500
  );

  // Sync local state when block changes (e.g., switching between blocks)
  useEffect(() => {
    setLocalText(content.text || "");
  }, [block._id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
