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
        const maxBytes = 10 * 1024 * 1024;
        const declaredLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
          throw new Error("Text preview exceeds the 10 MB limit.");
        }
        if (!response.body) throw new Error("Text preview has no body.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let bytesRead = 0;
        let text = "";
        while (bytesRead < maxBytes) {
          const chunk = await reader.read();
          if (chunk.done) {
            text += decoder.decode();
            break;
          }
          const remaining = maxBytes - bytesRead;
          const bytes = chunk.value.subarray(0, remaining);
          bytesRead += bytes.byteLength;
          text += decoder.decode(bytes, { stream: bytesRead < maxBytes });
          if (bytes.byteLength < chunk.value.byteLength) {
            await reader.cancel();
            text += "\n\n[Preview truncated at 10 MB]";
            break;
          }
        }
        setState({ status: "ready", text });
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
