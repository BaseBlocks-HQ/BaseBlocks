"use client";

import { baseBlocksOpenEditorTheme } from "@/features/openeditor/openeditor-theme";
import {
  createDocument,
  textBlock,
  type OpenEditorBlock,
} from "@openeditor/document";
import { OpenEditorContent, useOpenEditorController } from "@openeditor/react";
import {
  OpenEditorBlockMenu,
  OpenEditorSelectionBubble,
  OpenEditorSlashMenu,
  OpenEditorTableMenu,
  OpenEditorThemeProvider,
} from "@openeditor/ui";
import "@openeditor/ui/styles.css";
import { useRef } from "react";
import { EditorParticleField } from "./editor-particle-field";

const sandboxBlocks = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "taskList",
  "toggleList",
  "callout",
  "blockquote",
  "codeBlock",
  "table",
  "divider",
  "columns",
  "page",
] as const;

const initialDocument = createDocument([
  textBlock("heading", "A site, assembled", { level: 1 }),
  textBlock(
    "paragraph",
    "A closer look at the layers that give a site its structure, content, context, and reach.",
  ),
  {
    type: "callout",
    attrs: { emoji: "🧩" },
    content: [
      textBlock(
        "paragraph",
        "Four layers, one site: content, structure, connections, and access.",
      ),
    ],
  },
  textBlock("heading", "The page", { level: 2 }),
  {
    type: "columns",
    content: [
      {
        type: "column",
        content: [
          textBlock("heading", "Content", { level: 3 }),
          textBlock(
            "paragraph",
            "Words, media, files, tables, and interactive blocks share the same surface.",
          ),
        ],
      },
      {
        type: "column",
        content: [
          textBlock("heading", "Structure", { level: 3 }),
          textBlock(
            "paragraph",
            "Pages sit inside navigation, search, and clear relationships.",
          ),
        ],
      },
    ],
  },
  {
    type: "blockquote",
    content: [
      textBlock(
        "paragraph",
        "One page can move from narrative to reference to interaction without becoming a stack of disconnected documents.",
      ),
    ],
  },
  textBlock("heading", "Related pages", { level: 2 }),
  {
    type: "page",
    attrs: {
      pageId: "landing-content-and-media",
      icon: "📝",
      href: null,
    },
    content: [{ type: "text", text: "Content and media" }],
  },
  {
    type: "page",
    attrs: {
      pageId: "landing-connected-sources",
      icon: "🔗",
      href: null,
    },
    content: [{ type: "text", text: "Connected sources" }],
  },
  {
    type: "page",
    attrs: {
      pageId: "landing-navigation-and-access",
      icon: "🧭",
      href: null,
    },
    content: [{ type: "text", text: "Navigation and access" }],
  },
  { type: "horizontalRule" },
  textBlock("heading", "Content has more than one shape", { level: 2 }),
  {
    type: "bulletList",
    content: [
      {
        type: "listItem",
        content: [
          textBlock("paragraph", "Narrative: headings, paragraphs, and lists"),
        ],
      },
      {
        type: "listItem",
        content: [
          textBlock("paragraph", "Reference: tables, files, and callouts"),
        ],
      },
      {
        type: "listItem",
        content: [
          textBlock(
            "paragraph",
            "Interaction: tasks, toggles, and connected blocks",
          ),
        ],
      },
      {
        type: "listItem",
        content: [textBlock("paragraph", "Media: images, video, and embeds")],
      },
    ],
  },
  textBlock("heading", "The layers around it", { level: 2 }),
  {
    type: "table",
    content: [
      {
        type: "tableRow",
        content: [
          {
            type: "tableHeader",
            content: [textBlock("paragraph", "Layer")],
          },
          {
            type: "tableHeader",
            content: [textBlock("paragraph", "Contains")],
          },
          {
            type: "tableHeader",
            content: [textBlock("paragraph", "Appears as")],
          },
        ],
      },
      {
        type: "tableRow",
        content: [
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Content")],
          },
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Text, media, files")],
          },
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Blocks")],
          },
        ],
      },
      {
        type: "tableRow",
        content: [
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Structure")],
          },
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Pages, relationships")],
          },
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Navigation")],
          },
        ],
      },
      {
        type: "tableRow",
        content: [
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Connections")],
          },
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Files, data, tools")],
          },
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Live content")],
          },
        ],
      },
      {
        type: "tableRow",
        content: [
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Access")],
          },
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Visibility, domain")],
          },
          {
            type: "tableCell",
            content: [textBlock("paragraph", "Published site")],
          },
        ],
      },
    ],
  },
  textBlock("heading", "From source to surface", { level: 2 }),
  textBlock(
    "codeBlock",
    "FILES + DATA + TOOLS\n          ↓\n        BLOCKS\n          ↓\n         PAGES\n          ↓\n          SITE",
    { language: "text" },
  ),
  {
    type: "toggleList",
    content: [
      {
        type: "toggleListItem",
        attrs: { open: true },
        content: [
          textBlock("paragraph", "Content"),
          textBlock(
            "paragraph",
            "Each block keeps its own purpose while remaining part of the same reading flow.",
          ),
        ],
      },
      {
        type: "toggleListItem",
        attrs: { open: false },
        content: [
          textBlock("paragraph", "Connections"),
          textBlock(
            "paragraph",
            "Files, data, and tools can remain connected to the pages where they are used.",
          ),
        ],
      },
      {
        type: "toggleListItem",
        attrs: { open: false },
        content: [
          textBlock("paragraph", "Access"),
          textBlock(
            "paragraph",
            "A finished site can move from private work to a published destination.",
          ),
        ],
      },
    ],
  },
] satisfies OpenEditorBlock[]);

export function OpenEditorDemo() {
  const contourRef = useRef<HTMLDivElement>(null);
  const controller = useOpenEditorController({
    enabledBlocks: sandboxBlocks,
    initialDocument,
    placeholder: "Write something, or type / for blocks…",
  });

  return (
    <OpenEditorThemeProvider theme={baseBlocksOpenEditorTheme}>
      <div className="landing-editor-demo">
        <div
          aria-hidden="true"
          className="landing-editor-contour-target"
          ref={contourRef}
        />
        <EditorParticleField contourRef={contourRef} shape="masses" />
        <div className="landing-editor-paper">
          <div className="landing-editor-paper-inner">
            <OpenEditorContent
              className="oe-canvas landing-editor-canvas"
              controller={controller}
            />
          </div>
        </div>

        <OpenEditorBlockMenu controller={controller} />
        <OpenEditorSelectionBubble controller={controller} />
        <OpenEditorTableMenu controller={controller} />
        <OpenEditorSlashMenu controller={controller} />
      </div>
    </OpenEditorThemeProvider>
  );
}
