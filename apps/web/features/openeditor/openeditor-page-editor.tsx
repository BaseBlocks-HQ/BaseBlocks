"use client";

import { SiteRenderActionsProvider } from "@/components/site-runtime/actions";
import {
  useEditorSite,
  useEditorUi,
  useRegisterEditorBlockPicker,
} from "@/features/editor/editor-state";
import { baseBlocksSlashMenuOrder } from "@/features/openeditor/slash-menu";
import { api, type Doc, type Id } from "@baseblocks/backend";
import { generateSlug } from "@baseblocks/domain";
import type { SaveStatus } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import type {
  OpenEditorAttachmentRuntime,
  OpenEditorDocument,
  OpenEditorPageRuntime,
} from "@openeditor/core";
import {
  OpenEditorContent,
  OpenEditorPageHeader,
  type OpenEditorSlashMenuItem,
  OpenEditorViewer,
  useOpenEditorController,
} from "@openeditor/react";
import {
  OpenEditorBlockMenu,
  OpenEditorSelectionBubble,
  OpenEditorSlashMenu,
  OpenEditorThemeProvider,
} from "@openeditor/ui";
import "@openeditor/ui/styles.css";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, PanelsTopLeft } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useBaseBlocksAttachmentRuntime } from "./attachment-runtime";
import { openEditorExtensions } from "./extensions";
import { baseBlocksOpenEditorTheme } from "./openeditor-theme";
import { OpenEditorTabbedPage } from "./page-tabs";
import {
  createOpenEditorPageTabs,
  deleteOpenEditorTextRange,
  readOpenEditorPageTabs,
} from "./page-tabs-model";

export function OpenEditorPageEditor({
  onSaveStatusChange,
  pageId,
  pages,
  preview = false,
  siteId,
}: {
  onSaveStatusChange?: (status: SaveStatus) => void;
  pageId: Id<"pages">;
  pages: Doc<"pages">[];
  preview?: boolean;
  siteId: Id<"sites">;
}) {
  const t = useTranslations("editor.pageEditor");
  const { canEdit } = useEditorSite();
  const { canGoBack, goBack, openPage } = useEditorUi();
  const content = useQuery(api.pageContent.get, { pageId });
  const createPage = useMutation(api.pages.create);
  const updatePage = useMutation(api.pages.update);
  const saveContent = useMutation(api.pageContent.save);
  const attachmentRuntime = useBaseBlocksAttachmentRuntime(siteId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDocument = useRef<OpenEditorDocument | null>(null);
  const [localDocument, setLocalDocument] = useState<{
    pageId: Id<"pages">;
    document: OpenEditorDocument;
  } | null>(null);

  const initialDocument = content as OpenEditorDocument | undefined;
  const resolvedDocument =
    localDocument?.pageId === pageId ? localDocument.document : initialDocument;
  const handleConvertToTabs = (document: OpenEditorDocument) =>
    setLocalDocument({ pageId, document });
  const activePage = pages.find((candidate) => candidate._id === pageId);

  const pageRuntime: OpenEditorPageRuntime = {
    createPage: async ({ title, icon }) => {
      const suffix = crypto.randomUUID().slice(0, 8);
      const childPageId = await createPage({
        siteId,
        parentId: pageId,
        title,
        icon: icon ?? undefined,
        slug: `${generateSlug(title) || "page"}-${suffix}`,
      });
      return {
        pageId: childPageId,
        title,
        icon: icon ?? "📄",
        href: `?page=${childPageId}`,
      };
    },
    resolvePage: async (targetPageId) => {
      const page = pages.find((candidate) => candidate._id === targetPageId);
      return page
        ? {
            pageId: targetPageId,
            title: page.title,
            icon: page.icon ?? "📄",
            href: `?page=${targetPageId}`,
          }
        : null;
    },
    updatePage: async (targetPageId, pageUpdate) => {
      try {
        await updatePage({
          pageId: targetPageId as Id<"pages">,
          title: pageUpdate.title,
          icon: pageUpdate.icon ?? undefined,
          clearIcon: pageUpdate.icon === null,
        });
      } catch (error) {
        toast.error("Failed to update page");
        throw error;
      }
      const current = pages.find((candidate) => candidate._id === targetPageId);
      return {
        pageId: targetPageId,
        title: pageUpdate.title ?? current?.title ?? "Untitled",
        icon:
          pageUpdate.icon === undefined
            ? (current?.icon ?? "📄")
            : pageUpdate.icon,
        href: `?page=${targetPageId}`,
      };
    },
    openPage: ({ pageId: targetPageId }) => openPage(targetPageId),
  };

  const pageSnapshot = activePage
    ? {
        pageId: activePage._id,
        title: activePage.title,
        icon: activePage.icon ?? "📄",
        href: `?page=${activePage._id}`,
      }
    : null;
  const pageHeading = pageSnapshot ? (
    <OpenEditorPageHeading
      canGoBack={canGoBack}
      editable={canEdit && !preview}
      onGoBack={goBack}
      page={pageSnapshot}
      pageRuntime={pageRuntime}
    />
  ) : null;

  if (!resolvedDocument) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  return (
    <SiteRenderActionsProvider actions={{ siteId }}>
      {readOpenEditorPageTabs(resolvedDocument) ? (
        <OpenEditorTabbedPageEditor
          attachmentRuntime={attachmentRuntime}
          canEdit={canEdit}
          initialDocument={resolvedDocument}
          onSaveStatusChange={onSaveStatusChange}
          pageId={pageId}
          pageHeading={pageHeading}
          pageRuntime={pageRuntime}
          preview={preview}
          saveContent={saveContent}
          saveFailedMessage={t("saveFailed")}
        />
      ) : (
        <OpenEditorDocumentEditor
          attachmentRuntime={attachmentRuntime}
          canEdit={canEdit}
          initialDocument={resolvedDocument}
          onConvertToTabs={handleConvertToTabs}
          onSaveStatusChange={onSaveStatusChange}
          pageId={pageId}
          pageHeading={pageHeading}
          pageRuntime={pageRuntime}
          preview={preview}
          saveContent={saveContent}
          saveTimer={saveTimer}
          pendingDocument={pendingDocument}
          saveFailedMessage={t("saveFailed")}
        />
      )}
    </SiteRenderActionsProvider>
  );
}

function OpenEditorTabbedPageEditor({
  attachmentRuntime,
  canEdit,
  initialDocument,
  onSaveStatusChange,
  pageId,
  pageHeading,
  pageRuntime,
  preview,
  saveContent,
  saveFailedMessage,
}: {
  attachmentRuntime: OpenEditorAttachmentRuntime<File>;
  canEdit: boolean;
  initialDocument: OpenEditorDocument;
  onSaveStatusChange?: (status: SaveStatus) => void;
  pageId: Id<"pages">;
  pageHeading: ReactNode;
  pageRuntime: OpenEditorPageRuntime;
  preview: boolean;
  saveContent: (args: {
    pageId: Id<"pages">;
    content: OpenEditorDocument;
  }) => Promise<null>;
  saveFailedMessage: string;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDocument = useRef<OpenEditorDocument | null>(null);
  const saveRevision = useRef(0);
  const persist = async (document: OpenEditorDocument, revision: number) => {
    if (revision === saveRevision.current) onSaveStatusChange?.("saving");
    try {
      await saveContent({ pageId, content: document });
      if (revision === saveRevision.current) onSaveStatusChange?.("saved");
    } catch (_error) {
      toast.error(saveFailedMessage);
      onSaveStatusChange?.("error");
    }
  };
  const queueSave = (document: OpenEditorDocument) => {
    const revision = ++saveRevision.current;
    onSaveStatusChange?.("pending");
    pendingDocument.current = document;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const nextDocument = pendingDocument.current;
      pendingDocument.current = null;
      if (nextDocument) void persist(nextDocument, revision);
    }, 750);
  };
  const flushPendingSave = useEffectEvent(persist);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const nextDocument = pendingDocument.current;
      pendingDocument.current = null;
      if (nextDocument)
        void flushPendingSave(nextDocument, saveRevision.current);
    },
    [],
  );

  return (
    <OpenEditorThemeProvider
      className="contents"
      theme={baseBlocksOpenEditorTheme}
    >
      <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-4xl rounded-xl bg-background px-6 py-10 sm:px-10">
        {pageHeading}
        <OpenEditorTabbedPage
          attachmentRuntime={attachmentRuntime}
          editable={canEdit && !preview}
          extensions={openEditorExtensions}
          initialDocument={initialDocument}
          onChange={queueSave}
          pageRuntime={pageRuntime}
        />
      </div>
    </OpenEditorThemeProvider>
  );
}

function OpenEditorDocumentEditor({
  attachmentRuntime,
  canEdit,
  initialDocument,
  onConvertToTabs,
  onSaveStatusChange,
  pageId,
  pageHeading,
  pageRuntime,
  preview,
  pendingDocument,
  saveContent,
  saveTimer,
  saveFailedMessage,
}: {
  attachmentRuntime: OpenEditorAttachmentRuntime<File>;
  canEdit: boolean;
  initialDocument: OpenEditorDocument;
  onConvertToTabs: (document: OpenEditorDocument) => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
  pageId: Id<"pages">;
  pageHeading: ReactNode;
  pageRuntime: OpenEditorPageRuntime;
  preview: boolean;
  pendingDocument: RefObject<OpenEditorDocument | null>;
  saveContent: (args: {
    pageId: Id<"pages">;
    content: OpenEditorDocument;
  }) => Promise<null>;
  saveTimer: RefObject<ReturnType<typeof setTimeout> | null>;
  saveFailedMessage: string;
}) {
  const saveRevision = useRef(0);
  const persist = async (document: OpenEditorDocument, revision: number) => {
    if (revision === saveRevision.current) onSaveStatusChange?.("saving");
    try {
      await saveContent({ pageId, content: document });
      if (revision === saveRevision.current) onSaveStatusChange?.("saved");
    } catch (_error) {
      toast.error(saveFailedMessage);
      onSaveStatusChange?.("error");
    }
  };
  const slashMenuItems: readonly OpenEditorSlashMenuItem[] = [
    {
      key: "baseblocksPageTabs",
      label: "Tabs",
      group: "structure",
      icon: PanelsTopLeft,
      keywords: ["tabs", "sections", "organize"],
      order: baseBlocksSlashMenuOrder.tabs,
      execute: ({ controller: current, range }) => {
        if (!current.ready) return false;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        pendingDocument.current = null;
        const revision = ++saveRevision.current;
        const document = createOpenEditorPageTabs(
          deleteOpenEditorTextRange(current.getContent(), range),
          crypto.randomUUID(),
        );
        void persist(document, revision);
        onConvertToTabs(document);
        return true;
      },
    },
  ];
  const controller = useOpenEditorController({
    initialDocument,
    editable: canEdit,
    extensions: openEditorExtensions,
    pageRuntime,
    attachmentRuntime,
    slashMenuItems,
    onChange: (document) => {
      const revision = ++saveRevision.current;
      onSaveStatusChange?.("pending");
      pendingDocument.current = document;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const nextDocument = pendingDocument.current;
        pendingDocument.current = null;
        if (nextDocument) void persist(nextDocument, revision);
      }, 750);
    },
  });
  useRegisterEditorBlockPicker(controller, canEdit && !preview);
  const flushPendingSave = useEffectEvent(persist);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const nextDocument = pendingDocument.current;
      pendingDocument.current = null;
      if (nextDocument)
        void flushPendingSave(nextDocument, saveRevision.current);
    },
    [pendingDocument, saveTimer],
  );

  return (
    <OpenEditorThemeProvider
      className="contents"
      theme={baseBlocksOpenEditorTheme}
    >
      <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-4xl rounded-xl bg-background px-6 py-10 sm:px-10">
        {pageHeading}
        {preview ? (
          <OpenEditorViewer
            attachmentRuntime={attachmentRuntime}
            className="oe-viewer"
            document={controller.document}
            extensions={openEditorExtensions}
            pageRuntime={pageRuntime}
          />
        ) : (
          <OpenEditorContent
            className="oe-canvas min-w-0"
            controller={controller}
          />
        )}
        {canEdit && !preview ? (
          <>
            <OpenEditorBlockMenu controller={controller} />
            <OpenEditorSelectionBubble controller={controller} />
            <OpenEditorSlashMenu controller={controller} />
          </>
        ) : null}
      </div>
    </OpenEditorThemeProvider>
  );
}

function OpenEditorPageHeading({
  canGoBack,
  editable,
  onGoBack,
  page,
  pageRuntime,
}: {
  canGoBack: boolean;
  editable: boolean;
  onGoBack: () => void;
  page: { pageId: string; title: string; icon: string; href: string };
  pageRuntime: OpenEditorPageRuntime;
}) {
  const t = useTranslations("editor.header");

  return (
    <div className="mb-8 flex min-w-0 items-center gap-2">
      {canGoBack ? (
        <Button
          aria-label={t("backToPreviousPage")}
          className="shrink-0 rounded-lg"
          onClick={onGoBack}
          size="icon"
          title={t("backToPreviousPage")}
          variant="ghost"
        >
          <ArrowLeft />
        </Button>
      ) : null}
      {editable ? (
        <OpenEditorPageHeader
          className="min-w-0 flex-1"
          page={page}
          runtime={pageRuntime}
        />
      ) : (
        <>
          <span aria-hidden="true" className="shrink-0 text-3xl leading-none">
            {page.icon}
          </span>
          <h1 className="min-w-0 flex-1 truncate px-1.5 text-3xl font-bold">
            {page.title || t("untitledPage")}
          </h1>
        </>
      )}
    </div>
  );
}
