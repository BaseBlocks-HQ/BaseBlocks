"use client";

import { Input } from "@baseblocks/ui/input";
import { useEffect, useRef, useState } from "react";

export function InlineRename({
  label,
  value,
  onCancel,
  onError,
  onSave,
}: {
  label: string;
  value: string;
  onCancel: () => void;
  onError?: (error: unknown) => void;
  onSave: (value: string) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => inputRef.current?.select(), []);

  const commit = async () => {
    if (finished.current || pending) return;
    const next = draft.trim();
    if (!next) {
      inputRef.current?.focus();
      return;
    }
    if (next === value.trim()) {
      finished.current = true;
      onCancel();
      return;
    }
    finished.current = true;
    setPending(true);
    try {
      await onSave(next);
    } catch (error) {
      finished.current = false;
      setDraft(value);
      setPending(false);
      onError?.(error);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  return (
    <Input
      ref={inputRef}
      aria-label={label}
      className="h-7 min-w-0 flex-1 border-transparent bg-sidebar-accent/60 px-1.5 py-0 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
      disabled={pending}
      value={draft}
      onBlur={() => void commit()}
      onChange={(event) => setDraft(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") void commit();
        if (event.key === "Escape") {
          finished.current = true;
          onCancel();
        }
      }}
    />
  );
}
