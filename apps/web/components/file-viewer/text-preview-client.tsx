"use client";

import type { PreviewFile } from "@/components/file-viewer/file-viewer";
import { Spinner } from "@baseblocks/ui/spinner";
import { useEffect, useState } from "react";

export default function TextPreview({ file }: { file: PreviewFile }) {
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    text: string;
  }>({ status: "loading", text: "" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", text: "" });
    fetch(file.url, { signal: controller.signal, credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Preview request failed (${response.status})`);
        const text = await response.text();
        setState({ status: "ready", text: text.slice(0, 10 * 1024 * 1024) });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setState({
          status: "error",
          text: "This text preview could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [file.url]);

  if (state.status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="flex h-full items-center justify-center p-6 text-sm text-destructive"
      >
        {state.text}
      </div>
    );
  }

  return (
    <pre className="h-full overflow-auto whitespace-pre-wrap break-words bg-background p-6 font-mono text-sm leading-6 text-foreground">
      {state.text}
    </pre>
  );
}
