"use client";

import { SiteRenderActionsProvider } from "@/components/site-runtime/actions";
import { useEditorSite, useEditorUi } from "@/features/editor/editor-state";
import { api, type Doc, type Id } from "@baseblocks/backend";
import { generateSlug } from "@baseblocks/domain";
import type {
  OpenEditorAttachmentRuntime,
  OpenEditorDocument,
} from "@openeditor/core";
import {
  OpenEditorContent,
  type OpenEditorPageRuntime,
  OpenEditorViewer,
  useOpenEditorController,
} from "@openeditor/react";
import {
  OpenEditorSelectionBubble,
  OpenEditorSlashMenu,
  OpenEditorThemeProvider,
} from "@openeditor/ui";
import "@openeditor/ui/styles.css";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useBaseBlocksAttachmentRuntime } from "./attachment-runtime";
import { convertLegacyPageToOpenEditor } from "./conversion/convert-page";
import { editorV2Extensions } from "./extensions";
import { baseBlocksOpenEditorTheme } from "./openeditor-theme";
import { OpenEditorTabbedPage } from "./page-tabs";
import {
  readOpenEditorPageTabs,
  shouldRefreshLegacyTabbedDocument,
} from "./page-tabs-model";

export function OpenEditorPageEditor({
  pageId,
  pages,
  preview = false,
  siteId,
}: {
  pageId: Id<"pages">;
  pages: Doc<"pages">[];
  preview?: boolean;
  siteId: Id<"sites">;
}) {
  const t = useTranslations("editor.pageEditor");
  const { canEdit } = useEditorSite();
  const { openPage } = useEditorUi();
  const content = useQuery(api.pageContent.get, { pageId });
  const createPage = useMutation(api.pages.create);
  const updatePage = useMutation(api.pages.update);
  const saveDocument = useMutation(api.pageContent.saveOpenEditorDocument);
  const attachmentRuntime = useBaseBlocksAttachmentRuntime(siteId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDocument = useRef<OpenEditorDocument | null>(null);

  const pageTitles = useMemo(
    () => new Map(pages.map((page) => [page._id, page.title])),
    [pages],
  );
  const convertedDocument = useMemo(
    () =>
      content
        ? convertLegacyPageToOpenEditor(content, { pageTitles }).document
        : null,
    [content, pageTitles],
  );
  const storedDocument = content?.openEditorDocument as
    | OpenEditorDocument
    | undefined;
  const initialDocument = shouldRefreshLegacyTabbedDocument(
    content?.tabs.length ?? 0,
    storedDocument,
  )
    ? convertedDocument
    : (storedDocument ?? convertedDocument);

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
          showInNavigation: false,
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
      openPage: ({ pageId: targetPageId }) => openPage(targetPageId),
    }),
    [createPage, openPage, pageId, pages, siteId, updatePage],
  );

  if (!initialDocument) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  return (
    <SiteRenderActionsProvider actions={{ siteId }}>
      {readOpenEditorPageTabs(initialDocument) ? (
        <OpenEditorTabbedPageEditor
          canEdit={canEdit}
          initialDocument={initialDocument}
          pageId={pageId}
          pageRuntime={pageRuntime}
          preview={preview}
          saveDocument={saveDocument}
          saveFailedMessage={t("saveFailed")}
        />
      ) : (
        <OpenEditorDocumentEditor
          attachmentRuntime={attachmentRuntime}
          canEdit={canEdit}
          initialDocument={initialDocument}
          pageId={pageId}
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
  pageId,
  pageRuntime,
  preview,
  saveDocument,
  saveFailedMessage,
}: {
  canEdit: boolean;
  initialDocument: OpenEditorDocument;
  pageId: Id<"pages">;
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
  const persist = useCallback(
    (document: OpenEditorDocument) => {
      void saveDocument({ pageId, document }).catch(() =>
        toast.error(saveFailedMessage),
      );
    },
    [pageId, saveDocument, saveFailedMessage],
  );
  const queueSave = (document: OpenEditorDocument) => {
    pendingDocument.current = document;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const nextDocument = pendingDocument.current;
      pendingDocument.current = null;
      if (nextDocument) persist(nextDocument);
    }, 750);
  };

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const nextDocument = pendingDocument.current;
      pendingDocument.current = null;
      if (nextDocument) persist(nextDocument);
    },
    [persist],
  );

  return (
    <OpenEditorThemeProvider
      className="contents"
      theme={baseBlocksOpenEditorTheme}
    >
      <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-4xl rounded-xl bg-background px-6 py-10 sm:px-10">
        <OpenEditorTabbedPage
          document={initialDocument}
          editable={canEdit && !preview}
          extensions={editorV2Extensions}
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
  pageId,
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
  pageId: Id<"pages">;
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
  const persist = useCallback(
    (document: OpenEditorDocument) => {
      void saveDocument({ pageId, document }).catch(() => {
        toast.error(saveFailedMessage);
      });
    },
    [pageId, saveDocument, saveFailedMessage],
  );
  const controller = useOpenEditorController({
    initialDocument,
    editable: canEdit,
    extensions: editorV2Extensions,
    pageRuntime,
    attachmentRuntime,
    onChange: (document) => {
      pendingDocument.current = document;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const nextDocument = pendingDocument.current;
        pendingDocument.current = null;
        if (nextDocument) persist(nextDocument);
      }, 750);
    },
  });

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const nextDocument = pendingDocument.current;
      pendingDocument.current = null;
      if (nextDocument) persist(nextDocument);
    },
    [pendingDocument, persist, saveTimer],
  );

  return (
    <OpenEditorThemeProvider
      className="contents"
      theme={baseBlocksOpenEditorTheme}
    >
      <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-4xl rounded-xl bg-background px-6 py-10 sm:px-10">
        {preview ? (
          <OpenEditorViewer
            attachmentRuntime={attachmentRuntime}
            className="oe-viewer"
            document={controller.document}
            extensions={editorV2Extensions}
            pageRuntime={pageRuntime}
          />
        ) : (
          <OpenEditorContent
            className="oe-editor-surface"
            controller={controller}
          />
        )}
        {canEdit && !preview ? (
          <>
            <OpenEditorSelectionBubble controller={controller} />
            <OpenEditorSlashMenu controller={controller} />
          </>
        ) : null}
      </div>
    </OpenEditorThemeProvider>
  );
}
