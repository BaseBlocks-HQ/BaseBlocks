"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./public-subpage-block-viewer.css";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { Block } from "@blocknote/core";
import { useEffect, useRef } from "react";

interface PublicSubpageBlockViewerProps {
  content?: Block[];
  searchTerm?: string;
}

/**
 * Highlight text in a text node by wrapping matches in <mark> elements
 */
function highlightTextNode(
  textNode: Text,
  searchTerm: string,
  marks: HTMLElement[]
): void {
  const text = textNode.textContent || "";
  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();

  let lastIndex = 0;
  let matchIndex = lowerText.indexOf(lowerTerm);

  if (matchIndex === -1) return;

  const fragment = document.createDocumentFragment();

  while (matchIndex !== -1) {
    // Add text before match
    if (matchIndex > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, matchIndex)));
    }

    // Add highlighted match
    const mark = document.createElement("mark");
    mark.className = "search-highlight";
    mark.textContent = text.slice(matchIndex, matchIndex + searchTerm.length);
    fragment.appendChild(mark);
    marks.push(mark);

    lastIndex = matchIndex + searchTerm.length;
    matchIndex = lowerText.indexOf(lowerTerm, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  // Replace the text node with our fragment
  textNode.parentNode?.replaceChild(fragment, textNode);
}

/**
 * Recursively find and highlight text in an element
 */
function highlightElement(
  element: Element,
  searchTerm: string,
  marks: HTMLElement[]
): void {
  // Skip certain elements
  if (element.tagName === "SCRIPT" || element.tagName === "STYLE" || element.tagName === "MARK") {
    return;
  }

  // Process child nodes (iterate in reverse to handle DOM mutations)
  const childNodes = Array.from(element.childNodes);
  for (const child of childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      highlightTextNode(child as Text, searchTerm, marks);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      highlightElement(child as Element, searchTerm, marks);
    }
  }
}

/**
 * Remove all highlight marks from an element
 */
function removeHighlights(element: Element): void {
  const marks = element.querySelectorAll("mark.search-highlight");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      const textNode = document.createTextNode(mark.textContent || "");
      parent.replaceChild(textNode, mark);
      parent.normalize();
    }
  });
}

export function PublicSubpageBlockViewer({ content, searchTerm }: PublicSubpageBlockViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAppliedRef = useRef(false);

  const editor = useCreateBlockNote({
    initialContent: content && content.length > 0 ? content : undefined,
  });

  // Apply highlighting once after initial render
  useEffect(() => {
    if (!content || content.length === 0 || !searchTerm?.trim()) {
      return;
    }

    // Reset flag when searchTerm changes
    hasAppliedRef.current = false;

    const container = containerRef.current;
    if (!container) return;

    // Wait for BlockNote to render, then apply highlighting once
    const applyOnce = () => {
      if (hasAppliedRef.current) return;

      const marks: HTMLElement[] = [];
      removeHighlights(container);
      highlightElement(container, searchTerm.trim(), marks);

      if (marks.length > 0) {
        hasAppliedRef.current = true;
        // Scroll to first match
        setTimeout(() => {
          marks[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      }
    };

    // Try after a delay to let BlockNote render
    const timeoutId = setTimeout(applyOnce, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [content, searchTerm]);

  if (!content || content.length === 0) {
    return <p className="text-muted-foreground text-sm">No content.</p>;
  }

  return (
    <div ref={containerRef}>
      <BlockNoteView
        editor={editor}
        editable={false}
        data-public-viewer
      />
    </div>
  );
}
