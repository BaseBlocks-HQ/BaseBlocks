"use client";

import { baseBlocksOpenEditorTheme } from "@/features/openeditor/openeditor-theme";
import {
  createDocument,
  textBlock,
  type OpenEditorBlock,
} from "@openeditor/core";
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
] as const;

const initialDocument = createDocument([
  textBlock("heading", "Website launch brief", { level: 1 }),
  textBlock(
    "paragraph",
    "A shared plan for taking the new website from final review to a calm, coordinated launch.",
  ),
  {
    type: "callout",
    attrs: { emoji: "🎯" },
    content: [
      textBlock(
        "paragraph",
        "The goal: give customers a clearer path to understand the product and start using it.",
      ),
    ],
  },
  textBlock("heading", "Before we publish", { level: 2 }),
  {
    type: "taskList",
    content: [
      {
        type: "taskItem",
        attrs: { checked: true },
        content: [textBlock("paragraph", "Approve the final page copy")],
      },
      {
        type: "taskItem",
        attrs: { checked: false },
        content: [textBlock("paragraph", "Test every primary call to action")],
      },
      {
        type: "taskItem",
        attrs: { checked: false },
        content: [
          textBlock("paragraph", "Share the launch note with the team"),
        ],
      },
    ],
  },
  textBlock("heading", "What ships in version one", { level: 2 }),
  {
    type: "bulletList",
    content: [
      {
        type: "listItem",
        content: [textBlock("paragraph", "A focused product story")],
      },
      {
        type: "listItem",
        content: [textBlock("paragraph", "Clear documentation and examples")],
      },
      {
        type: "listItem",
        content: [textBlock("paragraph", "A faster path to getting started")],
      },
    ],
  },
  textBlock("heading", "Notes", { level: 2 }),
  textBlock(
    "paragraph",
    "This is a live document. Change the words, check off a task, drag a block, or type / on a new line to add something.",
  ),
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
        <EditorParticleField contourRef={contourRef} />
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
