"use client";

import { api, type Doc, type Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

export interface DraftRestoreState {
  _id: Id<"draftRestores">;
  status: Doc<"draftRestores">["status"] | "orphaned";
  failure?: string;
}

export function DraftRestoreGate({ restore }: { restore: DraftRestoreState }) {
  const resume = useMutation(api.draftRestores.resume);
  const cancel = useMutation(api.draftRestores.cancel);
  const [resuming, setResuming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        {restore.status !== "paused" && restore.status !== "orphaned" ? (
          <Spinner className="mx-auto size-6 text-muted-foreground" />
        ) : null}
        <h1 className="mt-4 text-base font-semibold">
          {restore.status === "paused"
            ? "Draft restore paused"
            : restore.status === "orphaned"
              ? "Draft restore needs recovery"
              : restore.status === "validating"
                ? "Checking historical version"
                : "Restoring draft"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {restore.status === "paused"
            ? (restore.failure ??
              "The restore paused after repeated failures. Resume it to continue safely.")
            : restore.status === "orphaned"
              ? restore.failure
              : "The editor stays locked until the historical draft is coherent and ready."}
        </p>
        {restore.status === "paused" ? (
          <Button
            className="mt-4 rounded-full"
            disabled={resuming}
            onClick={async () => {
              setResuming(true);
              try {
                await resume({ restoreId: restore._id });
              } catch (error) {
                setResuming(false);
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "The restore could not resume",
                );
              }
            }}
          >
            {resuming ? <Spinner /> : null}
            Resume restore
          </Button>
        ) : null}
        {restore.status === "validating" ? (
          <Button
            className="mt-4 rounded-full"
            disabled={cancelling}
            onClick={async () => {
              setCancelling(true);
              try {
                await cancel({ restoreId: restore._id });
              } catch (error) {
                setCancelling(false);
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "The restore could not be cancelled",
                );
              }
            }}
            variant="outline"
          >
            {cancelling ? <Spinner /> : null}
            Cancel restore
          </Button>
        ) : null}
      </div>
    </div>
  );
}
