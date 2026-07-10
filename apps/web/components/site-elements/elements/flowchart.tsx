"use client";

import type {
  ElementEditorProps,
  ElementRendererProps,
} from "@/components/site-elements/registry";
import type { FlowchartContent } from "@baseblocks/domain/elements";
import { AlertCircle, Workflow } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { renderMermaidSVG } from "beautiful-mermaid";
import DOMPurify from "dompurify";

const PLACEHOLDER = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]`;

function singleDiagram(content: FlowchartContent) {
  return (
    content.diagrams[0] ?? {
      id: "default",
      label: "Diagram",
      mermaidCode: "",
    }
  );
}

function renderDiagram(code: string, theme: string | undefined) {
  const trimmed = code.trim();
  if (!trimmed) return { svg: "", error: "" };

  try {
    const dark = theme === "dark";
    return {
      svg: DOMPurify.sanitize(
        renderMermaidSVG(trimmed, {
          bg: dark ? "#09090b" : "#ffffff",
          fg: dark ? "#fafafa" : "#18181b",
          transparent: true,
          padding: 48,
        }),
        {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ["foreignObject"],
        },
      ),
      error: "",
    };
  } catch (error) {
    return {
      svg: "",
      error: error instanceof Error ? error.message : "Invalid diagram syntax",
    };
  }
}

function MermaidPreview({ code }: { code: string }) {
  const { resolvedTheme } = useTheme();
  const result = useMemo(
    () => renderDiagram(code, resolvedTheme),
    [code, resolvedTheme],
  );

  if (!code.trim()) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-border/70 bg-muted/20 px-6 text-center">
        <Workflow className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Write Mermaid code to preview it.
        </p>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/[0.035] px-6 text-center">
        <AlertCircle className="size-5 text-destructive" />
        <p className="max-w-md text-sm text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-64 overflow-auto rounded-md border border-border/70 bg-background p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid SVG is sanitized with DOMPurify immediately before rendering.
      dangerouslySetInnerHTML={{ __html: result.svg }}
    />
  );
}

export function FlowchartEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"flowchart">) {
  const initialDiagram = singleDiagram(content);
  const [code, setCode] = useState(initialDiagram.mermaidCode);

  const save = (nextCode: string) => {
    setCode(nextCode);
    onSaveStatusChange?.("saving");
    onUpdate({
      diagrams: [
        {
          id: initialDiagram.id,
          label: initialDiagram.label,
          mermaidCode: nextCode,
        },
      ],
    });
    onSaveStatusChange?.("saved");
  };

  return (
    <div className="grid min-h-[420px] gap-1 overflow-hidden rounded-lg border border-border/70 bg-background p-1 md:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
      <textarea
        value={code}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        className="min-h-48 resize-none rounded-md border border-border/70 bg-transparent p-3 font-mono text-sm leading-6 outline-none"
        onChange={(event) => save(event.target.value)}
      />
      <MermaidPreview code={code} />
    </div>
  );
}

export function FlowchartRenderer({
  content,
}: ElementRendererProps<"flowchart">) {
  const diagram = singleDiagram(content);
  return (
    <div className="not-prose">
      <MermaidPreview code={diagram.mermaidCode} />
    </div>
  );
}
