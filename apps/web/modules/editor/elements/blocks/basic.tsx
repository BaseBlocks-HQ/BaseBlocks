"use client";

import { cn } from "@/lib/utils";
import { useAutoSave } from "@/modules/editor/elements/hooks/use-auto-save";
import {
  type BlockSpacerContent,
  DEFAULT_BLOCK_CONTENT,
} from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import {
  AlignLeft,
  Check,
  ChevronDown,
  Heading,
  MessageSquare,
  Minus,
  MoveVertical,
} from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ContentEditable from "react-contenteditable";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

function plainTextFromEditable(html: string, preserveLineBreaks = false) {
  return html
    .replace(preserveLineBreaks ? /<br\s*\/?>/gi : /$^/, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function HeadingEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"heading">) {
  const [localText, setLocalText] = useState(content.text || "");
  const save = useAutoSave(onUpdate, onSaveStatusChange);
  const isEmpty = !localText.trim();

  const handleChange = (e: { target: { value: string } }) => {
    const plainText = plainTextFromEditable(e.target.value);
    setLocalText(plainText);
    onSaveStatusChange?.("pending");
    save({ ...content, text: plainText });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") e.preventDefault();
  };

  return (
    <div className="relative rounded-md px-2 py-2">
      <ContentEditable
        html={localText.trim() ? localText : ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full text-xl font-semibold leading-tight outline-none"
      />
      {isEmpty && (
        <span className="absolute left-2 top-2 text-xl font-semibold leading-tight text-muted-foreground pointer-events-none">
          Heading...
        </span>
      )}
    </div>
  );
}

function HeadingRenderer({ content }: ElementRendererProps<"heading">) {
  const level = content.level || 2;

  switch (level) {
    case 1:
      return (
        <h1 className="text-3xl font-semibold mt-6 mb-4">{content.text}</h1>
      );
    case 2:
      return (
        <h2 className="text-2xl font-semibold mt-6 mb-4">{content.text}</h2>
      );
    case 3:
      return (
        <h3 className="text-xl font-semibold mt-6 mb-4">{content.text}</h3>
      );
    case 4:
      return (
        <h4 className="text-lg font-semibold mt-6 mb-4">{content.text}</h4>
      );
    default:
      return <h5 className="font-semibold mt-6 mb-4">{content.text}</h5>;
  }
}

function ParagraphEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"paragraph">) {
  const [localText, setLocalText] = useState(content.text || "");
  const save = useAutoSave(onUpdate, onSaveStatusChange);
  const isEmpty = !localText.trim();

  const handleChange = (e: { target: { value: string } }) => {
    const plainText = plainTextFromEditable(e.target.value, true);
    setLocalText(plainText);
    onSaveStatusChange?.("pending");
    save({ ...content, text: plainText });
  };

  return (
    <div className="relative rounded-md px-2 py-2">
      <ContentEditable
        html={localText.trim() ? localText : ""}
        onChange={handleChange}
        className="w-full outline-none whitespace-pre-wrap"
      />
      {isEmpty && (
        <span className="absolute left-2 top-2 text-muted-foreground pointer-events-none">
          Start writing...
        </span>
      )}
    </div>
  );
}

function ParagraphRenderer({ content }: ElementRendererProps<"paragraph">) {
  return <p className="mb-4 leading-relaxed">{content.text}</p>;
}

function CalloutEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"callout">) {
  const [localText, setLocalText] = useState(content.text || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useEffect(() => {
    requestAnimationFrame(autoResize);
  }, [autoResize]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onSaveStatusChange?.("pending");
    requestAnimationFrame(autoResize);
    save({ ...content, text: newText });
  };

  return (
    <div className="bg-muted rounded-lg p-4 transition-colors">
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleChange}
        className="w-full resize-none border-none bg-transparent focus:outline-none overflow-hidden"
        placeholder="Callout text..."
        rows={1}
      />
    </div>
  );
}

function CalloutRenderer({ content }: ElementRendererProps<"callout">) {
  return (
    <div className="my-4 bg-muted rounded-lg p-4">
      <p className="whitespace-pre-wrap text-foreground">{content.text}</p>
    </div>
  );
}

function DividerEditor(_props: ElementEditorProps<"divider">) {
  return (
    <div className="group relative py-2">
      <hr className="border-border transition-colors group-hover:border-muted-foreground/50" />
    </div>
  );
}

function DividerRenderer(_props: ElementRendererProps<"divider">) {
  return <hr className="my-8" />;
}

const SPACER_HEIGHTS: Record<BlockSpacerContent["height"], number> = {
  small: 32,
  medium: 64,
  large: 96,
  xlarge: 128,
};

const SIZE_LABELS: Record<BlockSpacerContent["height"], string> = {
  small: "S",
  medium: "M",
  large: "L",
  xlarge: "XL",
};

const SIZE_FULL_LABELS: Record<BlockSpacerContent["height"], string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "Extra Large",
};

function useContainerWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(ref.current);
    setWidth(ref.current.offsetWidth);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}

function SpacerEditor({
  content,
  onUpdate,
}: ElementEditorProps<"block-spacer">) {
  const height = content.height || "medium";
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef);
  const useDropdown = containerWidth > 0 && containerWidth < 200;

  const handleHeightChange = (newHeight: BlockSpacerContent["height"]) => {
    onUpdate({ height: newHeight });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full max-w-full box-border",
        "border border-dashed border-muted-foreground/30 rounded-md",
        "flex items-center justify-center gap-2 sm:gap-3",
        "transition-colors hover:border-muted-foreground/50",
      )}
      style={{ height: `${SPACER_HEIGHTS[height]}px` }}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <MoveVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        {!useDropdown && (
          <span className="text-xs hidden sm:inline">Spacer</span>
        )}
      </div>

      {useDropdown ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {SIZE_LABELS[height]}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {(
              Object.keys(SPACER_HEIGHTS) as Array<BlockSpacerContent["height"]>
            ).map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHeightChange(size);
                }}
                className="gap-2"
              >
                <Check
                  className={cn(
                    "h-3 w-3",
                    height === size ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="font-medium">{SIZE_LABELS[size]}</span>
                <span className="text-muted-foreground">
                  {SIZE_FULL_LABELS[size]}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex gap-0.5 sm:gap-1">
          {(
            Object.keys(SPACER_HEIGHTS) as Array<BlockSpacerContent["height"]>
          ).map((size) => (
            <Button
              key={size}
              variant={height === size ? "default" : "outline"}
              size="sm"
              className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-[10px] sm:text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleHeightChange(size);
              }}
            >
              {SIZE_LABELS[size]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

const RENDERER_HEIGHTS = {
  small: "h-8",
  medium: "h-16",
  large: "h-24",
  xlarge: "h-32",
} as const;

function SpacerRenderer({ content }: ElementRendererProps<"block-spacer">) {
  const height = content.height || "medium";
  return (
    <div
      className={cn("w-full", RENDERER_HEIGHTS[height])}
      aria-hidden="true"
    />
  );
}

const pickerPreview = (name: string) =>
  themedPickerImagePreview(
    `/editor/picker/blocks/${name}-light.png`,
    `/editor/picker/blocks/${name}-dark.png`,
  );

registerElement({
  type: "heading",
  category: "blocks",
  label: "Heading",
  description: "A title or heading with adjustable size",
  icon: Heading,
  keywords: ["title", "h1", "h2", "h3", "h4", "h5", "header"],
  editor: HeadingEditor,
  renderer: HeadingRenderer,
  preview: pickerPreview("heading"),
  defaultContent: DEFAULT_BLOCK_CONTENT.heading,
});

registerElement({
  type: "paragraph",
  category: "blocks",
  label: "Paragraph",
  description: "Plain text content",
  icon: AlignLeft,
  keywords: ["text", "body", "content", "write"],
  editor: ParagraphEditor,
  renderer: ParagraphRenderer,
  preview: pickerPreview("paragraph"),
  defaultContent: DEFAULT_BLOCK_CONTENT.paragraph,
});

registerElement({
  type: "callout",
  category: "blocks",
  label: "Callout",
  description: "Highlighted message box",
  icon: MessageSquare,
  keywords: ["alert", "note", "warning", "info", "tip", "message"],
  editor: CalloutEditor,
  renderer: CalloutRenderer,
  preview: pickerPreview("callout"),
  defaultContent: DEFAULT_BLOCK_CONTENT.callout,
});

registerElement({
  type: "divider",
  category: "blocks",
  label: "Divider",
  description: "Horizontal line separator",
  icon: Minus,
  keywords: ["line", "separator", "hr", "horizontal"],
  editor: DividerEditor,
  renderer: DividerRenderer,
  preview: pickerPreview("divider"),
  defaultContent: DEFAULT_BLOCK_CONTENT.divider,
});

registerElement({
  type: "block-spacer",
  category: "blocks",
  label: "Spacer",
  description: "Vertical spacing between content",
  icon: MoveVertical,
  keywords: ["space", "gap", "vertical", "padding", "margin"],
  editor: SpacerEditor,
  renderer: SpacerRenderer,
  preview: pickerPreview("spacer"),
  defaultContent: DEFAULT_BLOCK_CONTENT["block-spacer"],
});
