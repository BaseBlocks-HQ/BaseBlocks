"use client";

/* oxlint-disable react-doctor/react-compiler-no-manual-memoization, react-doctor/no-derived-state-effect -- This hook is a synchronization boundary for a versioned remote document. Stable callbacks protect queued writes, and the effect reconciles an external revision with unsaved local edits rather than deriving presentation state. */

import type { Id } from "@baseblocks/backend";
import {
  hasSameChildPageProjection,
  hasSameNonPageContent,
  reconcileChildPageProjection,
} from "@baseblocks/openeditor-contracts";
import type { SaveStatus } from "@baseblocks/domain";
import type { OpenEditorDocument } from "@openeditor/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { areOpenEditorDocumentsEqual } from "./open-editor-document-sync";
import type { VersionedDocument } from "./versioned-document";

type SaveResult = VersionedDocument & {
  status: "saved" | "conflict";
};

export function useVersionedPageDocument({
  authoritativeRefreshRevision = 0,
  onError,
  onSaveStatusChange,
  pageId,
  remote,
  save,
}: {
  authoritativeRefreshRevision?: number;
  onError: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
  pageId: Id<"pages">;
  remote: VersionedDocument;
  save: (args: {
    pageId: Id<"pages">;
    content: OpenEditorDocument;
    expectedContentHash: string;
  }) => Promise<SaveResult>;
}) {
  const [document, setDocument] = useState<OpenEditorDocument>(remote.document);
  const documentRef = useRef<OpenEditorDocument>(remote.document);
  const baseHashRef = useRef<string>(remote.contentHash);
  const baseDocumentRef = useRef<OpenEditorDocument>(remote.document);
  const pendingRef = useRef<OpenEditorDocument | undefined>(undefined);
  const inFlightDocumentRef = useRef<OpenEditorDocument | undefined>(undefined);
  const savingRef = useRef(false);
  const writeGenerationRef = useRef(0);
  const authoritativeRefreshRevisionRef = useRef(authoritativeRefreshRevision);
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
    if (savingRef.current) return;
    const writeGeneration = writeGenerationRef.current;
    savingRef.current = true;
    while (
      writeGeneration === writeGenerationRef.current &&
      pendingRef.current
    ) {
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
      if (writeGeneration !== writeGenerationRef.current) return;
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
        if (!hasSameNonPageContent(baseDocument, result.document)) {
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
        const local = documentRef.current;
        const rebased = reconcileChildPageProjection(local, result.document);
        if (!areOpenEditorDocumentsEqual(local, rebased)) apply(rebased);
        if (!areOpenEditorDocumentsEqual(rebased, result.document)) {
          pendingRef.current = rebased;
        }
        continue;
      }

      if (baseHashRef.current !== expectedContentHash) {
        pendingRef.current = documentRef.current;
        continue;
      }
      baseHashRef.current = result.contentHash;
      baseDocumentRef.current = result.document;
      const current = documentRef.current;
      if (areOpenEditorDocumentsEqual(current, submitted)) {
        if (!areOpenEditorDocumentsEqual(current, result.document)) {
          apply(result.document);
        }
      } else {
        pendingRef.current = current;
      }
    }
    onSaveStatusChangeRef.current?.("saved");
    savingRef.current = false;
  }, [apply, pageId, save]);

  useEffect(() => {
    if (
      authoritativeRefreshRevisionRef.current === authoritativeRefreshRevision
    ) {
      return;
    }
    authoritativeRefreshRevisionRef.current = authoritativeRefreshRevision;
    writeGenerationRef.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    pendingRef.current = undefined;
    inFlightDocumentRef.current = undefined;
    savingRef.current = false;
    conflictRef.current = false;
    onSaveStatusChangeRef.current?.("saved");
  });

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
    const incoming = remote.document;
    if (conflictRef.current) return;
    if (remote.contentHash === baseHashRef.current) return;

    const local = documentRef.current;
    if (!pendingRef.current && !savingRef.current) {
      baseHashRef.current = remote.contentHash;
      baseDocumentRef.current = incoming;
      apply(incoming);
      onSaveStatusChangeRef.current?.("saved");
      return;
    }

    const baseDocument = baseDocumentRef.current;
    const inFlightDocument = inFlightDocumentRef.current;
    if (
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
    if (!areOpenEditorDocumentsEqual(local, rebased)) apply(rebased);
    if (!areOpenEditorDocumentsEqual(rebased, incoming)) {
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
      schedule(!hasSameChildPageProjection(previous, next) ? 0 : 750);
    },
    [apply, schedule],
  );

  return { document, onChange };
}
