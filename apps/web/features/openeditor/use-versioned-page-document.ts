"use client";

import type { Id } from "@baseblocks/backend";
import {
  hasSameChildPageProjection,
  hasSameNonPageContent,
  reconcileChildPageProjection,
} from "@baseblocks/openeditor-contracts";
import type { SaveStatus } from "@baseblocks/domain";
import type { OpenEditorDocument } from "@openeditor/core";
import { useCallback, useEffect, useRef, useState } from "react";

type VersionedDocument = {
  document: OpenEditorDocument;
  contentHash: string;
};

type SaveResult = VersionedDocument & {
  status: "saved" | "conflict";
};

export function useVersionedPageDocument({
  onError,
  onSaveStatusChange,
  pageId,
  remote,
  save,
}: {
  onError: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
  pageId: Id<"pages">;
  remote: VersionedDocument | null | undefined;
  save: (args: {
    pageId: Id<"pages">;
    content: OpenEditorDocument;
    expectedContentHash: string;
  }) => Promise<SaveResult>;
}) {
  const [document, setDocument] = useState<OpenEditorDocument>();
  const documentRef = useRef<OpenEditorDocument | undefined>(undefined);
  const baseHashRef = useRef<string | undefined>(undefined);
  const baseDocumentRef = useRef<OpenEditorDocument | undefined>(undefined);
  const pendingRef = useRef<OpenEditorDocument | undefined>(undefined);
  const inFlightDocumentRef = useRef<OpenEditorDocument | undefined>(undefined);
  const savingRef = useRef(false);
  const conflictRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);
  const onErrorRef = useRef(onError);
  const onSaveStatusChangeRef = useRef(onSaveStatusChange);

  useEffect(() => {
    onErrorRef.current = onError;
    onSaveStatusChangeRef.current = onSaveStatusChange;
  }, [onError, onSaveStatusChange]);

  const apply = useCallback((next: OpenEditorDocument) => {
    documentRef.current = next;
    if (mountedRef.current) setDocument(next);
  }, []);

  const persist = useCallback(async () => {
    if (savingRef.current || !baseHashRef.current) return;
    savingRef.current = true;
    while (pendingRef.current && baseHashRef.current) {
      const submitted = pendingRef.current;
      if (!submitted) break;
      pendingRef.current = undefined;
      const expectedContentHash: string = baseHashRef.current;
      inFlightDocumentRef.current = submitted;
      onSaveStatusChangeRef.current?.("saving");
      const result = await save({
        pageId,
        content: submitted,
        expectedContentHash,
      }).catch(() => null);
      if (!result) {
        inFlightDocumentRef.current = undefined;
        if (mountedRef.current) {
          if (!pendingRef.current) pendingRef.current = submitted;
          onSaveStatusChangeRef.current?.("error");
          onErrorRef.current();
        }
        savingRef.current = false;
        return;
      }
      if (!mountedRef.current) {
        savingRef.current = false;
        return;
      }
      inFlightDocumentRef.current = undefined;

      if (result.status === "conflict") {
        const baseDocument = baseDocumentRef.current;
        if (
          baseDocument &&
          !hasSameNonPageContent(baseDocument, result.document)
        ) {
          conflictRef.current = true;
          baseHashRef.current = result.contentHash;
          baseDocumentRef.current = result.document;
          pendingRef.current = undefined;
          onSaveStatusChangeRef.current?.("error");
          onErrorRef.current();
          savingRef.current = false;
          return;
        }
        baseHashRef.current = result.contentHash;
        baseDocumentRef.current = result.document;
        const local = documentRef.current ?? submitted;
        const rebased = reconcileChildPageProjection(local, result.document);
        apply(rebased);
        if (JSON.stringify(rebased) !== JSON.stringify(result.document)) {
          pendingRef.current = rebased;
        }
        continue;
      }

      if (baseHashRef.current !== expectedContentHash) {
        const current = documentRef.current;
        if (current) pendingRef.current = current;
        continue;
      }
      baseHashRef.current = result.contentHash;
      baseDocumentRef.current = result.document;
      const current = documentRef.current;
      if (!current || JSON.stringify(current) === JSON.stringify(submitted)) {
        apply(result.document);
      } else {
        pendingRef.current = current;
      }
    }
    onSaveStatusChangeRef.current?.("saved");
    savingRef.current = false;
  }, [apply, pageId, save]);

  const schedule = useCallback(
    (delay: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        void persist();
      }, delay);
    },
    [persist],
  );

  useEffect(() => {
    if (!remote) return;
    const incoming = remote.document as OpenEditorDocument;
    if (conflictRef.current) return;
    if (!baseHashRef.current) {
      baseHashRef.current = remote.contentHash;
      baseDocumentRef.current = incoming;
      apply(incoming);
      return;
    }
    if (remote.contentHash === baseHashRef.current) return;

    const local = documentRef.current;
    if (!local || (!pendingRef.current && !savingRef.current)) {
      baseHashRef.current = remote.contentHash;
      baseDocumentRef.current = incoming;
      apply(incoming);
      onSaveStatusChangeRef.current?.("saved");
      return;
    }

    const baseDocument = baseDocumentRef.current;
    const inFlightDocument = inFlightDocumentRef.current;
    if (
      baseDocument &&
      !hasSameNonPageContent(baseDocument, incoming) &&
      (!inFlightDocument || !hasSameNonPageContent(inFlightDocument, incoming))
    ) {
      conflictRef.current = true;
      baseHashRef.current = remote.contentHash;
      baseDocumentRef.current = incoming;
      pendingRef.current = undefined;
      onSaveStatusChangeRef.current?.("error");
      onErrorRef.current();
      return;
    }

    baseHashRef.current = remote.contentHash;
    baseDocumentRef.current = incoming;
    const rebased = reconcileChildPageProjection(local, incoming);
    apply(rebased);
    if (JSON.stringify(rebased) !== JSON.stringify(incoming)) {
      pendingRef.current = rebased;
      schedule(0);
    }
  }, [apply, remote, schedule]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingRef.current) void persist();
    };
  }, [persist]);

  const onChange = useCallback(
    (next: OpenEditorDocument) => {
      const previous = documentRef.current;
      apply(next);
      if (conflictRef.current) {
        onSaveStatusChangeRef.current?.("error");
        return;
      }
      pendingRef.current = next;
      onSaveStatusChangeRef.current?.("pending");
      schedule(
        previous && !hasSameChildPageProjection(previous, next) ? 0 : 750,
      );
    },
    [apply, schedule],
  );

  return { document, onChange };
}
