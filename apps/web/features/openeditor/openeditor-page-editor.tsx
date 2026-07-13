"use client";

import { SiteRenderActionsProvider } from "@/components/site-runtime/actions";
import { useEditorSite, useEditorUi } from "@/features/editor/editor-state";
import { baseBlocksSlashMenuOrder } from "@/features/openeditor/slash-menu";
import { api, type Doc, type Id } from "@baseblocks/backend";
import { generateSlug } from "@baseblocks/domain";
import type { SaveStatus } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import type {
  OpenEditorAttachmentRuntime,
  OpenEditorDocument,
} from "@openeditor/core";
import {
  OpenEditorContent,
  type OpenEditorPageRuntime,
  type OpenEditorSlashMenuItem,
  OpenEditorViewer,
  useOpenEditorController,
} from "@openeditor/react";
import {
  OpenEditorBlockMenu,
  OpenEditorEmojiPicker,
  OpenEditorSelectionBubble,
  OpenEditorSlashMenu,
  OpenEditorThemeProvider,
} from "@openeditor/ui";
import "@openeditor/ui/styles.css";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, PanelsTopLeft } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
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
  const saveDocument = useMutation(api.pageContent.save);
  const attachmentRuntime = useBaseBlocksAttachmentRuntime(siteId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDocument = useRef<OpenEditorDocument | null>(null);
  const [localDocument, setLocalDocument] = useState<{
    pageId: Id<"pages">;
    document: OpenEditorDocument;
  } | null>(null);

  const initialDocument = content?.document as OpenEditorDocument | undefined;
  const resolvedDocument =
    localDocument?.pageId === pageId ? localDocument.document : initialDocument;
  const handleConvertToTabs = useCallback(
    (document: OpenEditorDocument) => setLocalDocument({ pageId, document }),
    [pageId],
  );
  const activePage = pages.find((candidate) => candidate._id === pageId);

  const pageHeading = activePage ? (
    <OpenEditorPageHeading
      canGoBack={canGoBack}
      editable={canEdit && !preview}
      icon={activePage.icon ?? "📄"}
      onGoBack={goBack}
      onIconChange={async (icon) => {
        try {
          await updatePage({ pageId, icon });
        } catch (_error) {
          toast.error("Failed to update page icon");
        }
      }}
      onTitleChange={async (title) => {
        try {
          await updatePage({ pageId, title });
        } catch (error) {
          toast.error("Failed to update page title");
          throw error;
        }
      }}
      title={activePage.title}
    />
  ) : null;

  const pageRuntime = useMemo<OpenEditorPageRuntime>(
    () => ({
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
      renamePage: async (targetPageId, title) => {
        await updatePage({ pageId: targetPageId as Id<"pages">, title });
      },
      updatePageIcon: async (targetPageId, icon) => {
        await updatePage({ pageId: targetPageId as Id<"pages">, icon });
      },
      openPage: ({ pageId: targetPageId }) => openPage(targetPageId),
    }),
    [createPage, openPage, pageId, pages, siteId, updatePage],
  );

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
          canEdit={canEdit}
          initialDocument={resolvedDocument}
          onSaveStatusChange={onSaveStatusChange}
          pageId={pageId}
          pageHeading={pageHeading}
          pageRuntime={pageRuntime}
          preview={preview}
          saveDocument={saveDocument}
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
          saveDocument={saveDocument}
          saveTimer={saveTimer}
          pendingDocument={pendingDocument}
          saveFailedMessage={t("saveFailed")}
        />
      )}
    </SiteRenderActionsProvider>
  );
}

function OpenEditorTabbedPageEditor({
  canEdit,
  initialDocument,
  onSaveStatusChange,
  pageId,
  pageHeading,
  pageRuntime,
  preview,
  saveDocument,
  saveFailedMessage,
}: {
  canEdit: boolean;
  initialDocument: OpenEditorDocument;
  onSaveStatusChange?: (status: SaveStatus) => void;
  pageId: Id<"pages">;
  pageHeading: ReactNode;
  pageRuntime: OpenEditorPageRuntime;
  preview: boolean;
  saveDocument: (args: {
    pageId: Id<"pages">;
    document: OpenEditorDocument;
  }) => Promise<null>;
  saveFailedMessage: string;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDocument = useRef<OpenEditorDocument | null>(null);
  const saveRevision = useRef(0);
  const persist = useCallback(
    async (document: OpenEditorDocument, revision: number) => {
      if (revision === saveRevision.current) onSaveStatusChange?.("saving");
      try {
        await saveDocument({ pageId, document });
        if (revision === saveRevision.current) onSaveStatusChange?.("saved");
      } catch (_error) {
        toast.error(saveFailedMessage);
        onSaveStatusChange?.("error");
      }
    },
    [onSaveStatusChange, pageId, saveDocument, saveFailedMessage],
  );
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

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const nextDocument = pendingDocument.current;
      pendingDocument.current = null;
      if (nextDocument) void persist(nextDocument, saveRevision.current);
    },
    [persist],
  );

  return (
    <OpenEditorThemeProvider
      className="contents"
      theme={baseBlocksOpenEditorTheme}
    >
      <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-4xl rounded-xl bg-background px-6 py-10 sm:px-10">
        {pageHeading}
        <OpenEditorTabbedPage
          document={initialDocument}
          editable={canEdit && !preview}
          extensions={openEditorExtensions}
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
  saveDocument,
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
  saveDocument: (args: {
    pageId: Id<"pages">;
    document: OpenEditorDocument;
  }) => Promise<null>;
  saveTimer: RefObject<ReturnType<typeof setTimeout> | null>;
  saveFailedMessage: string;
}) {
  const saveRevision = useRef(0);
  const persist = useCallback(
    async (document: OpenEditorDocument, revision: number) => {
      if (revision === saveRevision.current) onSaveStatusChange?.("saving");
      try {
        await saveDocument({ pageId, document });
        if (revision === saveRevision.current) onSaveStatusChange?.("saved");
      } catch (_error) {
        toast.error(saveFailedMessage);
        onSaveStatusChange?.("error");
      }
    },
    [onSaveStatusChange, pageId, saveDocument, saveFailedMessage],
  );
  const slashMenuItems = useMemo<readonly OpenEditorSlashMenuItem[]>(
    () => [
      {
        key: "baseblocksPageTabs",
        label: "Tabs",
        group: "structure",
        icon: PanelsTopLeft,
        keywords: ["tabs", "sections", "organize"],
        order: baseBlocksSlashMenuOrder.tabs,
        execute: ({ controller: current, range }) => {
          if (!current.editor) return false;
          current.editor.chain().focus().deleteRange(range).run();
          if (saveTimer.current) clearTimeout(saveTimer.current);
          pendingDocument.current = null;
          const revision = ++saveRevision.current;
          const document = createOpenEditorPageTabs(
            current.getContent(),
            crypto.randomUUID(),
          );
          void persist(document, revision);
          onConvertToTabs(document);
          return true;
        },
      },
    ],
    [onConvertToTabs, pendingDocument, persist, saveTimer],
  );
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

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const nextDocument = pendingDocument.current;
      pendingDocument.current = null;
      if (nextDocument) void persist(nextDocument, saveRevision.current);
    },
    [pendingDocument, persist, saveTimer],
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
            className="oe-editor-surface min-w-0 [&_.oe-prosemirror]:w-full [&_.oe-prosemirror]:min-w-0"
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
  icon,
  onGoBack,
  onIconChange,
  onTitleChange,
  title,
}: {
  canGoBack: boolean;
  editable: boolean;
  icon: string;
  onGoBack: () => void;
  onIconChange: (icon: string) => Promise<void>;
  onTitleChange: (title: string) => Promise<void>;
  title: string;
}) {
  const t = useTranslations("editor.header");
  const [draftTitle, setDraftTitle] = useState(title);

  useEffect(() => setDraftTitle(title), [title]);

  const saveTitle = async () => {
    const nextTitle = draftTitle.trim() || t("untitledPage");
    setDraftTitle(nextTitle);
    if (nextTitle === title) return;
    try {
      await onTitleChange(nextTitle);
    } catch {
      setDraftTitle(title);
    }
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setDraftTitle(title);
      event.currentTarget.blur();
    }
  };

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
      <OpenEditorEmojiPicker
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-3xl hover:bg-muted disabled:cursor-default"
        disabled={!editable}
        emoji={icon}
        label={t("changePageEmoji")}
        onEmojiSelect={(nextIcon) => void onIconChange(nextIcon)}
      />
      <h1 className="min-w-0 flex-1 text-3xl font-bold">
        {editable ? (
          <input
            aria-label={t("pageTitle")}
            className="w-full min-w-0 rounded-md bg-transparent px-1.5 font-inherit outline-none hover:bg-muted/70 focus:bg-background focus:ring-2 focus:ring-ring"
            onBlur={() => void saveTitle()}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder={t("untitledPage")}
            value={draftTitle}
          />
        ) : (
          <span className="block truncate px-1.5">
            {title || t("untitledPage")}
          </span>
        )}
      </h1>
    </div>
  );
}
