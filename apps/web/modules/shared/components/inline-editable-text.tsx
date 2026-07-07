"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function InlineEditableText({
  disabled = false,
  emptyLabel = "Untitled",
  inputClassName,
  onSubmit,
  textClassName,
  value,
}: {
  disabled?: boolean;
  emptyLabel?: string;
  inputClassName?: string;
  onSubmit: (value: string) => Promise<void> | void;
  textClassName?: string;
  value: string;
}) {
  const [draft, setDraft] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) return;
    setDraft(value);
  }, [isEditing, value]);

  useEffect(() => {
    if (!isEditing || !inputRef.current) return;

    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  const beginEditing = () => {
    if (disabled || isSubmitting) return;

    setDraft(value);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const submitEditing = async () => {
    if (!isEditing) return;

    const nextValue = draft.trim();
    if (!nextValue) {
      cancelEditing();
      return;
    }

    if (nextValue === value.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(nextValue);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        aria-label="Edit title"
        className={cn(
          "min-w-0 bg-transparent p-0 text-inherit outline-none ring-0 placeholder:text-muted-foreground/60",
          inputClassName,
          textClassName,
        )}
        disabled={isSubmitting}
        onBlur={() => void submitEditing()}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void submitEditing();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            cancelEditing();
          }
        }}
        spellCheck={false}
        value={draft}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "min-w-0 rounded-md text-left outline-none transition-colors hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2",
        disabled && "cursor-default hover:text-inherit focus-visible:ring-0",
        textClassName,
      )}
      disabled={disabled}
      onClick={beginEditing}
    >
      <span className="block truncate">
        {value.trim() ? value : emptyLabel}
      </span>
    </button>
  );
}
