"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import {
  type ReactElement,
  type RefCallback,
  useCallback,
  useEffect,
  useState,
} from "react";

export function OverflowTooltip({
  children,
  content,
  disabled = false,
}: {
  children: (textRef: RefCallback<HTMLElement>) => ReactElement;
  content: string;
  disabled?: boolean;
}) {
  const [textElement, setTextElement] = useState<HTMLElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const textRef = useCallback<RefCallback<HTMLElement>>((element) => {
    setTextElement(element);
  }, []);

  useEffect(() => {
    if (disabled || !textElement) {
      setIsOverflowing(false);
      setIsOpen(false);
      return;
    }

    const updateOverflow = () => {
      const nextIsOverflowing =
        content.length > 0 && textElement.scrollWidth > textElement.clientWidth;
      setIsOverflowing(nextIsOverflowing);
      if (!nextIsOverflowing) setIsOpen(false);
    };

    updateOverflow();
    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(textElement);

    return () => resizeObserver.disconnect();
  }, [content, disabled, textElement]);

  return (
    <Tooltip
      open={isOverflowing && isOpen}
      onOpenChange={(open) => setIsOpen(isOverflowing && open)}
    >
      <TooltipTrigger asChild>{children(textRef)}</TooltipTrigger>
      {isOverflowing ? (
        <TooltipContent
          side="right"
          sideOffset={8}
          className="max-w-72 break-words"
        >
          {content}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}
