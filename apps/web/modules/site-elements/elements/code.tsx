"use client";

import { cn } from "@/lib/utils";
import { useAutoSave } from "@/modules/editor/shared/use-auto-save";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { cssLanguage } from "@codemirror/lang-css";
import { htmlLanguage } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { jsonLanguage } from "@codemirror/lang-json";
import { markdownLanguage } from "@codemirror/lang-markdown";
import { LanguageSupport } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useState } from "react";
import type { ElementEditorProps } from "../registry";

type TokenKind = "comment" | "string" | "keyword" | "number" | "plain";

type CodeLanguageOption = {
  label: string;
  value: string;
};

const CODE_EDITOR_MIN_HEIGHT = "192px";

const CODE_LANGUAGE_OPTIONS: CodeLanguageOption[] = [
  { value: "plaintext", label: "Plain text" },
  { value: "typescript", label: "TypeScript" },
  { value: "tsx", label: "TSX" },
  { value: "javascript", label: "JavaScript" },
  { value: "jsx", label: "JSX" },
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "markdown", label: "Markdown" },
];

const KEYWORD_PATTERN =
  /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|class|new|import|export|from|try|catch|finally|throw|await|async|type|interface|extends|implements|enum|public|private|protected|static)\b/;
const STRING_PATTERN = /^(['"`])(?:\\.|(?!\1).)*\1/;
const NUMBER_PATTERN = /^\d+(?:\.\d+)?\b/;

const codeEditorClassName =
  "[&_.cm-editor]:border-0 [&_.cm-editor]:bg-transparent [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:px-0 [&_.cm-scroller]:pt-4 [&_.cm-scroller]:pb-10 [&_.cm-scroller]:font-mono [&_.cm-gutters]:border-0 [&_.cm-gutters]:bg-transparent [&_.cm-gutters]:pr-2 [&_.cm-gutter]:font-mono [&_.cm-gutter]:text-sm [&_.cm-gutter]:leading-6 [&_.cm-gutterElement]:font-mono [&_.cm-gutterElement]:text-sm [&_.cm-gutterElement]:leading-6 [&_.cm-gutterElement]:text-muted-foreground/70 [&_.cm-content]:min-h-[192px] [&_.cm-content]:font-mono [&_.cm-content]:text-sm [&_.cm-content]:leading-6 [&_.cm-line]:px-4 [&_.cm-line]:leading-6 [&_.cm-activeLine]:bg-transparent [&_.cm-activeLineGutter]:bg-transparent [&_.cm-selectionBackground]:!bg-primary/20 [&_.cm-cursor]:border-l-foreground";

const codeOverlayControlClassName = "absolute right-2 bottom-2 z-10";

const codeOverlaySurfaceClassName =
  "border-border/70 bg-background/90 shadow-sm backdrop-blur";

export function normalizeCodeText(text: string | undefined): string {
  return (text ?? "").replace(/\r\n?/g, "\n");
}

export function getCodeLineCount(text: string): number {
  return text === "" ? 1 : text.split("\n").length;
}

export function getCodeLanguageValue(language: string | undefined): string {
  const normalized = language?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : "plaintext";
}

export function getDisplayLanguage(language: string | undefined): string {
  const normalized = getCodeLanguageValue(language);
  const matchedOption = CODE_LANGUAGE_OPTIONS.find(
    (option) => option.value === normalized,
  );

  if (matchedOption) {
    return matchedOption.label;
  }

  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function getLanguageExtension(language: string): LanguageSupport | null {
  switch (language) {
    case "typescript":
    case "ts":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ jsx: true, typescript: true });
    case "javascript":
    case "js":
      return javascript();
    case "jsx":
      return javascript({ jsx: true });
    case "json":
      return new LanguageSupport(jsonLanguage);
    case "html":
      return new LanguageSupport(htmlLanguage);
    case "css":
      return new LanguageSupport(cssLanguage);
    case "markdown":
    case "md":
      return new LanguageSupport(markdownLanguage);
    default:
      return null;
  }
}

export function tokenizeCodeLine(
  line: string,
): Array<{ kind: TokenKind; value: string }> {
  const tokens: Array<{ kind: TokenKind; value: string }> = [];
  let rest = line;

  while (rest.length > 0) {
    const commentIndex = rest.indexOf("//");
    if (commentIndex === 0) {
      tokens.push({ value: rest, kind: "comment" });
      break;
    }

    const stringMatch = rest.match(STRING_PATTERN);
    if (stringMatch) {
      tokens.push({ value: stringMatch[0], kind: "string" });
      rest = rest.slice(stringMatch[0].length);
      continue;
    }

    const keywordMatch = rest.match(KEYWORD_PATTERN);
    if (keywordMatch?.index === 0) {
      tokens.push({ value: keywordMatch[0], kind: "keyword" });
      rest = rest.slice(keywordMatch[0].length);
      continue;
    }

    const numberMatch = rest.match(NUMBER_PATTERN);
    if (numberMatch?.index === 0) {
      tokens.push({ value: numberMatch[0], kind: "number" });
      rest = rest.slice(numberMatch[0].length);
      continue;
    }

    if (commentIndex > 0) {
      tokens.push({ value: rest.slice(0, commentIndex), kind: "plain" });
      rest = rest.slice(commentIndex);
      continue;
    }

    const [firstCharacter = ""] = rest;
    tokens.push({ value: firstCharacter, kind: "plain" });
    rest = rest.slice(1);
  }

  return tokens;
}

export function CodeEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"code">) {
  const { resolvedTheme } = useTheme();
  const save = useAutoSave(onUpdate, onSaveStatusChange);
  const [localText, setLocalText] = useState(() =>
    normalizeCodeText(content.text),
  );
  const [localLanguage, setLocalLanguage] = useState(() =>
    getCodeLanguageValue(content.language),
  );

  const editorExtensions = useMemo(() => {
    const languageExtension = getLanguageExtension(localLanguage);
    return languageExtension ? [languageExtension] : [];
  }, [localLanguage]);

  const knownLanguage = CODE_LANGUAGE_OPTIONS.some(
    (option) => option.value === localLanguage,
  );

  const saveContent = useCallback(
    (nextText: string, nextLanguage: string) => {
      const normalizedText = normalizeCodeText(nextText);
      setLocalText(normalizedText);
      setLocalLanguage(nextLanguage);
      onSaveStatusChange?.("pending");
      save({ ...content, text: normalizedText, language: nextLanguage });
    },
    [content, onSaveStatusChange, save],
  );

  return (
    <div className="not-prose relative overflow-hidden rounded-xl border border-border/70 bg-muted/35 shadow-sm">
      <CodeMirror
        value={localText}
        minHeight={CODE_EDITOR_MIN_HEIGHT}
        theme={resolvedTheme === "dark" ? oneDark : "light"}
        extensions={editorExtensions}
        indentWithTab
        placeholder="// Add code here"
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          autocompletion: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          highlightSelectionMatches: false,
          searchKeymap: false,
          foldKeymap: false,
          completionKeymap: false,
          lintKeymap: false,
          tabSize: 2,
        }}
        className={cn(codeEditorClassName)}
        onChange={(value) => saveContent(value, localLanguage)}
      />
      <div className={codeOverlayControlClassName}>
        <Select
          value={localLanguage}
          onValueChange={(nextLanguage) => saveContent(localText, nextLanguage)}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              "h-8 rounded-lg text-xs",
              codeOverlaySurfaceClassName,
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {!knownLanguage ? (
              <SelectItem value={localLanguage}>
                {getDisplayLanguage(localLanguage)}
              </SelectItem>
            ) : null}
            {CODE_LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
