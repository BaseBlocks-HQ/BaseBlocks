"use client";

import "@blocknote/mantine/style.css";

import { useSiteAssetUpload } from "@/lib/files";
import { cn } from "@/lib/utils";
import { useAutoSave } from "@/modules/editor/elements/hooks/use-auto-save";
import { useEditorSite } from "@/modules/editor/state";
import type { Id } from "@baseblocks/backend";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/domain/elements";
import type { Block } from "@blocknote/core";
import { SideMenuExtension, SuggestionMenu } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import {
  BlockColorsItem,
  DragHandleButton,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  type SideMenuProps,
  useBlockNoteEditor,
  useComponentsContext,
  useCreateBlockNote,
  useExtensionState,
} from "@blocknote/react";
import { TextCursorInput } from "lucide-react";
import { useTheme } from "next-themes";
import { createContext, useCallback, useContext, useState } from "react";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

type RichTextEditorInstance = ReturnType<typeof useCreateBlockNote>;
type RichTextBlock = RichTextEditorInstance["document"][number];

type RichTextSideMenuContextValue = {
  block: RichTextBlock | undefined;
  editor: RichTextEditorInstance;
};

const RichTextSideMenuContext =
  createContext<RichTextSideMenuContextValue | null>(null);

/**
 * Must stay at module scope — BlockNote issue #688: an inline or recreated
 * `dragHandleMenu` component can prevent `DragHandleMenu` from rendering.
 * Block/editor are passed via RichTextSideMenuContext.
 */
function RichTextDragHandleMenu() {
  const ctx = useContext(RichTextSideMenuContext);

  return (
    <DragHandleMenu>
      {ctx?.block !== undefined ? (
        <AddBlockMenuRow block={ctx.block} editor={ctx.editor} />
      ) : null}
      <RemoveBlockItem>Delete</RemoveBlockItem>
      <BlockColorsItem>Colors</BlockColorsItem>
    </DragHandleMenu>
  );
}

/**
 * Subscribes to the side menu block at the same level as SideMenu, then
 * provides it to RichTextDragHandleMenu via context (see BlockNote #688).
 */
function RichTextSideMenu(props: SideMenuProps) {
  const editor = useBlockNoteEditor();
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  }) as RichTextBlock | undefined;

  const ctxValue: RichTextSideMenuContextValue = { block, editor };

  return (
    <RichTextSideMenuContext.Provider value={ctxValue}>
      {/*
        SideMenu only forwards dragHandleMenu when it renders its *default*
        children. With custom children you must pass dragHandleMenu to
        DragHandleButton (BlockNote issue #688 / SideMenu.tsx TODO).
      */}
      <SideMenu {...props}>
        <DragHandleButton {...props} dragHandleMenu={RichTextDragHandleMenu} />
      </SideMenu>
    </RichTextSideMenuContext.Provider>
  );
}

function AddBlockMenuRow({
  block,
  editor,
}: {
  block: RichTextBlock;
  editor: RichTextEditorInstance;
}) {
  const Components = useComponentsContext()!;

  const onClick = useCallback(() => {
    const suggestionMenu = editor.getExtension(SuggestionMenu);
    if (!suggestionMenu) {
      return;
    }

    const blockContent = block.content;
    const isBlockEmpty =
      blockContent !== undefined &&
      Array.isArray(blockContent) &&
      blockContent.length === 0;

    if (isBlockEmpty) {
      editor.setTextCursorPosition(block);
      suggestionMenu.openSuggestionMenu("/");
    } else {
      const insertedBlock = editor.insertBlocks(
        [{ type: "paragraph" }],
        block,
        "after",
      )[0];
      if (insertedBlock === undefined) {
        return;
      }
      editor.setTextCursorPosition(insertedBlock);
      suggestionMenu.openSuggestionMenu("/");
    }
  }, [block, editor]);

  return (
    <Components.Generic.Menu.Item className="bn-menu-item" onClick={onClick}>
      Add block below
    </Components.Generic.Menu.Item>
  );
}

function RichTextEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"richtext">) {
  const { resolvedTheme } = useTheme();
  const { siteId } = useEditorSite();
  const { uploadSiteAsset } = useSiteAssetUpload();
  const blockNoteTheme = resolvedTheme === "dark" ? "dark" : "light";
  const [initialContent] = useState(() =>
    content.document && content.document.length > 0
      ? (content.document as Block[])
      : undefined,
  );
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  const editor = useCreateBlockNote({
    initialContent,
    uploadFile: async (file) => {
      const asset = await uploadSiteAsset(file, siteId as Id<"sites">);
      if (!asset) {
        throw new Error("Upload failed");
      }
      return asset.url;
    },
  });

  return (
    <div
      className={cn(
        "rounded-md",
        "[&_.bn-container]:!border-none [&_.bn-container]:!bg-transparent",
        "[&_.bn-editor]:!bg-transparent",
        // BlockNote default is padding-inline: 54px for + and drag handle; one handle needs less gutter.
        "[&_.bn-editor]:!ps-7 [&_.bn-editor]:!pe-2",
      )}
    >
      <BlockNoteView
        editor={editor}
        theme={blockNoteTheme}
        sideMenu={false}
        onChange={() => {
          onSaveStatusChange?.("pending");
          save({ ...content, document: editor.document });
        }}
      >
        <SideMenuController
          sideMenu={(props) => <RichTextSideMenu {...props} />}
        />
      </BlockNoteView>
    </div>
  );
}

function RichTextRenderer({ content }: ElementRendererProps<"richtext">) {
  const { resolvedTheme } = useTheme();
  const blockNoteTheme = resolvedTheme === "dark" ? "dark" : "light";

  const editor = useCreateBlockNote({
    initialContent:
      content.document && content.document.length > 0
        ? (content.document as Block[])
        : undefined,
  });

  return (
    <div className="[&_.bn-container]:!border-none [&_.bn-editor]:!px-0 [&_.bn-container]:!bg-transparent [&_.bn-editor]:!bg-transparent">
      <BlockNoteView editor={editor} editable={false} theme={blockNoteTheme} />
    </div>
  );
}

const RichTextPreview = themedPickerImagePreview(
  "/editor/picker/blocks/richtext-light.png",
  "/editor/picker/blocks/richtext-dark.png",
);

registerElement({
  type: "richtext",
  category: "blocks",
  label: "Rich Text",
  description: "Rich text editor with formatting, lists, and more",
  icon: TextCursorInput,
  keywords: [
    "text",
    "rich",
    "editor",
    "blocknote",
    "write",
    "format",
    "wysiwyg",
  ],
  editor: RichTextEditor,
  renderer: RichTextRenderer,
  preview: RichTextPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.richtext,
});
