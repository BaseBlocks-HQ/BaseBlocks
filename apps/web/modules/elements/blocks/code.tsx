"use client";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Code } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

type TokenKind = "comment" | "string" | "keyword" | "number" | "plain";

const KEYWORD_PATTERN =
  /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|class|new|import|export|from|try|catch|finally|throw|await|async|type|interface)\b/;
const STRING_PATTERN = /^(['"`])(?:\\.|(?!\1).)*\1/;
const NUMBER_PATTERN = /^\b\d+(\.\d+)?\b/;

function tokenizeLine(line: string): Array<{ value: string; kind: TokenKind }> {
  const tokens: Array<{ value: string; kind: TokenKind }> = [];
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
    if (numberMatch) {
      tokens.push({ value: numberMatch[0], kind: "number" });
      rest = rest.slice(numberMatch[0].length);
      continue;
    }

    if (commentIndex > 0) {
      tokens.push({ value: rest.slice(0, commentIndex), kind: "plain" });
      rest = rest.slice(commentIndex);
      continue;
    }

    const [firstChar = ""] = rest;
    tokens.push({ value: firstChar, kind: "plain" });
    rest = rest.slice(1);
  }

  return tokens;
}

function tokenClassName(kind: TokenKind) {
  switch (kind) {
    case "comment":
      return "text-zinc-500 dark:text-zinc-400";
    case "string":
      return "text-emerald-700 dark:text-emerald-300";
    case "keyword":
      return "text-indigo-700 dark:text-indigo-300";
    case "number":
      return "text-amber-700 dark:text-amber-300";
    default:
      return "text-foreground";
  }
}

function CodeEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"code">) {
  const [localText, setLocalText] = useState(content.text || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    requestAnimationFrame(autoResize);
  }, [autoResize, localText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onSaveStatusChange?.("pending");
    save({ ...content, text: newText });
  };

  return (
    <div className="bg-muted text-foreground rounded-lg p-4 font-mono text-sm transition-colors">
      <div className="relative">
        <pre
          aria-hidden
          className="pointer-events-none whitespace-pre-wrap break-words pr-1"
        >
          <code className="text-sm font-mono">
            {(localText || " ").split("\n").map((line, lineIndex) => {
              const tokens = tokenizeLine(line);
              return (
                <span className="block" key={`editor-line-${lineIndex}`}>
                  {tokens.map((token, tokenIndex) => (
                    <span
                      className={tokenClassName(token.kind)}
                      key={`editor-token-${lineIndex}-${tokenIndex}`}
                    >
                      {token.value}
                    </span>
                  ))}
                </span>
              );
            })}
          </code>
        </pre>
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleChange}
        className="absolute inset-0 w-full resize-none border-none bg-transparent text-transparent caret-foreground focus:outline-none overflow-hidden placeholder:text-muted-foreground"
        placeholder="// Code here..."
        spellCheck={false}
        rows={1}
      />
      </div>
    </div>
  );
}

function CodeRenderer({ content }: ElementRendererProps<"code">) {
  const lines = (content.text || "").split("\n");

  return (
    <pre className="my-4 p-4 bg-muted rounded-lg overflow-x-auto">
      <code className="text-sm font-mono whitespace-pre-wrap text-foreground">
        {lines.map((line, lineIndex) => {
          const tokens = tokenizeLine(line);
          return (
            <span className="block" key={`line-${lineIndex}`}>
              {tokens.map((token, tokenIndex) => (
                <span
                  className={tokenClassName(token.kind)}
                  key={`token-${lineIndex}-${tokenIndex}`}
                >
                  {token.value}
                </span>
              ))}
            </span>
          );
        })}
      </code>
    </pre>
  );
}

const CodePreview = themedPickerImagePreview(
  "/editor/picker/blocks/code-light.png",
  "/editor/picker/blocks/code-dark.png",
);

registerElement({
  type: "code",
  category: "blocks",
  label: "Code",
  description: "Code snippet with syntax highlighting",
  icon: Code,
  keywords: ["code", "snippet", "programming", "syntax", "script"],
  editor: CodeEditor,
  renderer: CodeRenderer,
  preview: CodePreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.code,
});
