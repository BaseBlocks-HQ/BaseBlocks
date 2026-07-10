"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import type { ElementRendererProps } from "@/components/site-runtime/rendering";
import { Button } from "@baseblocks/ui/button";
import { cssLanguage } from "@codemirror/lang-css";
import { htmlLanguage } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { jsonLanguage } from "@codemirror/lang-json";
import { markdownLanguage } from "@codemirror/lang-markdown";
import { LanguageSupport } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { Check, ClipboardCopy } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const CODE_EDITOR_MIN_HEIGHT = "192px";

const codeEditorClassName =
  "[&_.cm-editor]:border-0 [&_.cm-editor]:bg-transparent [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:px-0 [&_.cm-scroller]:pt-4 [&_.cm-scroller]:pb-10 [&_.cm-scroller]:font-mono [&_.cm-gutters]:border-0 [&_.cm-gutters]:bg-transparent [&_.cm-gutters]:pr-2 [&_.cm-gutter]:font-mono [&_.cm-gutter]:text-sm [&_.cm-gutter]:leading-6 [&_.cm-gutterElement]:font-mono [&_.cm-gutterElement]:text-sm [&_.cm-gutterElement]:leading-6 [&_.cm-gutterElement]:text-muted-foreground/70 [&_.cm-content]:min-h-[192px] [&_.cm-content]:font-mono [&_.cm-content]:text-sm [&_.cm-content]:leading-6 [&_.cm-line]:px-4 [&_.cm-line]:leading-6 [&_.cm-activeLine]:bg-transparent [&_.cm-activeLineGutter]:bg-transparent [&_.cm-selectionBackground]:!bg-primary/20 [&_.cm-cursor]:border-l-foreground";

const codeOverlayControlClassName = "absolute right-2 bottom-2 z-10";
const codeOverlaySurfaceClassName =
  "border-border/70 bg-background/90 shadow-sm backdrop-blur";

function normalizeCodeText(text: string | undefined): string {
  return (text ?? "").replace(/\r\n?/g, "\n");
}

function getCodeLanguageValue(language: string | undefined): string {
  const normalized = language?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : "plaintext";
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

export function CodeRenderer({ content }: ElementRendererProps<"code">) {
  const { resolvedTheme } = useTheme();
  const [isCopied, setIsCopied] = useState(false);
  const text = normalizeCodeText(content.text);
  const language = getCodeLanguageValue(content.language);

  const editorExtensions = useMemo(() => {
    const languageExtension = getLanguageExtension(language);
    return languageExtension ? [languageExtension] : [];
  }, [language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="not-prose relative my-4 overflow-hidden rounded-xl border border-border/70 bg-muted/35 shadow-sm">
      <CodeMirror
        value={text}
        minHeight={CODE_EDITOR_MIN_HEIGHT}
        theme={resolvedTheme === "dark" ? oneDark : "light"}
        extensions={editorExtensions}
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
        editable={false}
        readOnly
        className={cn(codeEditorClassName)}
      />
      <div className={codeOverlayControlClassName}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          className={cn("rounded-lg", codeOverlaySurfaceClassName)}
          aria-label={isCopied ? "Copied" : "Copy code"}
        >
          {isCopied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <ClipboardCopy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
