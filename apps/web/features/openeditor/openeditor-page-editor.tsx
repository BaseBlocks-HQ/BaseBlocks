"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, LayoutTopIcon } from "@hugeicons/core-free-icons";
import { SiteRenderActionsProvider } from "@/components/site-runtime/actions";
import { useEditorSite, useEditorUi } from "@/features/editor/editor-state";
import {
  baseBlocksSlashMenuOrder,
  createOpenEditorIcon,
} from "@/features/openeditor/slash-menu";
import { api, type Doc, type Id } from "@baseblocks/backend";
import { generateSlug } from "@baseblocks/domain";
import type { SaveStatus } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import type {
  OpenEditorAttachmentRuntime,
  OpenEditorDocument,
  OpenEditorImageRuntime,
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
  OpenEditorTableMenu,
  OpenEditorThemeProvider,
} from "@openeditor/ui";
import "@openeditor/ui/styles.css";
import { useMutation, useQuery } from "convex/react";
import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useBaseBlocksAttachmentRuntime } from "./attachment-runtime";
import { openEditorExtensions } from "./extensions";
import { useBaseBlocksImageRuntime } from "./image-runtime";
import { baseBlocksOpenEditorTheme } from "./openeditor-theme";
import { OpenEditorTabbedPage } from "./page-tabs";
import { useVersionedPageDocument } from "./use-versioned-page-document";
import {
  createOpenEditorPageTabs,
  deleteOpenEditorTextRange,
  readOpenEditorPageTabs,
} from "./page-tabs-model";

const PageTabsMenuIcon = createOpenEditorIcon(LayoutTopIcon);

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
  const createPage = useMutation(api.pages.create);
  const renamePage = useMutation(api.pages.rename);
  const updatePage = useMutation(api.pages.update);
  const saveContent = useMutation(api.pageContent.save);
  const attachmentRuntime = useBaseBlocksAttachmentRuntime(siteId);
  const imageRuntime = useBaseBlocksImageRuntime(siteId);
  const remoteDocument = useQuery(api.pageContent.getVersioned, { pageId });
  const { document, onChange } = useVersionedPageDocument({
    pageId,
    remote: remoteDocument
      ? {
          document: remoteDocument.document as OpenEditorDocument,
          contentHash: remoteDocument.contentHash,
        }
      : remoteDocument,
    save: saveContent,
    onSaveStatusChange,
    onError: () => toast.error(t("saveFailed")),
  });
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
        const targetId = targetPageId as Id<"pages">;
        await Promise.all([
          pageUpdate.title === undefined
            ? Promise.resolve()
            : renamePage({ pageId: targetId, title: pageUpdate.title }),
          pageUpdate.icon === undefined
            ? Promise.resolve()
            : updatePage({
                pageId: targetId,
                icon: pageUpdate.icon ?? undefined,
                clearIcon: pageUpdate.icon === null,
              }),
        ]);
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

  if (!document) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  return (
    <SiteRenderActionsProvider actions={{ siteId }}>
      {readOpenEditorPageTabs(document) ? (
        <OpenEditorTabbedPageEditor
          attachmentRuntime={attachmentRuntime}
          canEdit={canEdit}
          imageRuntime={imageRuntime}
          document={document}
          onChange={onChange}
          pageHeading={pageHeading}
          pageRuntime={pageRuntime}
          preview={preview}
        />
      ) : (
        <OpenEditorDocumentEditor
          attachmentRuntime={attachmentRuntime}
          canEdit={canEdit}
          imageRuntime={imageRuntime}
          document={document}
          onChange={onChange}
          pageHeading={pageHeading}
          pageRuntime={pageRuntime}
          preview={preview}
        />
      )}
    </SiteRenderActionsProvider>
  );
}

function OpenEditorTabbedPageEditor({
  attachmentRuntime,
  canEdit,
  document,
  imageRuntime,
  onChange,
  pageHeading,
  pageRuntime,
  preview,
}: {
  attachmentRuntime: OpenEditorAttachmentRuntime<File>;
  canEdit: boolean;
  document: OpenEditorDocument;
  imageRuntime: OpenEditorImageRuntime<File>;
  onChange: (document: OpenEditorDocument) => void;
  pageHeading: ReactNode;
  pageRuntime: OpenEditorPageRuntime;
  preview: boolean;
}) {
  return (
    <OpenEditorThemeProvider
      className="contents"
      theme={baseBlocksOpenEditorTheme}
    >
      <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-4xl rounded-xl bg-background px-6 py-10 sm:px-10">
        {pageHeading}
        <OpenEditorTabbedPage
          attachmentRuntime={attachmentRuntime}
          document={document}
          editable={canEdit && !preview}
          extensions={openEditorExtensions}
          imageRuntime={imageRuntime}
          onChange={onChange}
          pageRuntime={pageRuntime}
        />
      </div>
    </OpenEditorThemeProvider>
  );
}

function OpenEditorDocumentEditor({
  attachmentRuntime,
  canEdit,
  document,
  imageRuntime,
  onChange,
  pageHeading,
  pageRuntime,
  preview,
}: {
  attachmentRuntime: OpenEditorAttachmentRuntime<File>;
  canEdit: boolean;
  document: OpenEditorDocument;
  imageRuntime: OpenEditorImageRuntime<File>;
  onChange: (document: OpenEditorDocument) => void;
  pageHeading: ReactNode;
  pageRuntime: OpenEditorPageRuntime;
  preview: boolean;
}) {
  const slashMenuItems: readonly OpenEditorSlashMenuItem[] = [
    {
      key: "baseblocksPageTabs",
      label: "Tabs",
      group: "structure",
      icon: PageTabsMenuIcon,
      keywords: ["tabs", "sections", "organize"],
      order: baseBlocksSlashMenuOrder.tabs,
      execute: ({ controller: current, range }) => {
        if (!current.ready) return false;
        const nextDocument = createOpenEditorPageTabs(
          deleteOpenEditorTextRange(current.getContent(), range),
          crypto.randomUUID(),
        );
        onChange(nextDocument);
        return true;
      },
    },
  ];
  const controller = useOpenEditorController({
    initialDocument: document,
    editable: canEdit,
    extensions: openEditorExtensions,
    pageRuntime,
    attachmentRuntime,
    imageRuntime,
    slashMenuItems,
    onChange,
  });
  useEffect(() => {
    if (!controller.ready) return;
    const incoming = JSON.stringify(document);
    let active = true;
    const frame = requestAnimationFrame(() => {
      if (!active || !controller.ready) return;
      const current = JSON.stringify(controller.getContent());
      if (incoming === current) return;
      controller.setContent(document, { emitChange: false });
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [controller, controller.ready, document]);

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
            imageRuntime={imageRuntime}
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
            <OpenEditorTableMenu controller={controller} />
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
          <HugeiconsIcon icon={ArrowLeft01Icon} />
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
