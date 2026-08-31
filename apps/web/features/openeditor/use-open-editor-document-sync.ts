"use client";

import type { OpenEditorDocument } from "@openeditor/document";
import type { OpenEditorController } from "@openeditor/react";
import { useEffect, useRef } from "react";
import {
  areOpenEditorDocumentsEqual,
  shouldSyncOpenEditorDocument,
} from "./open-editor-document-sync";

type OpenEditorDocumentRef = {
  current: OpenEditorDocument | undefined;
};

export function useOpenEditorDocumentSync({
  controller,
  document,
  locallyEmittedDocumentRef,
}: {
  controller: OpenEditorController;
  document: OpenEditorDocument;
  locallyEmittedDocumentRef: OpenEditorDocumentRef;
}) {
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const ready = controller.ready;

  useEffect(() => {
    const currentController = controllerRef.current;
    if (!ready) return;

    const locallyEmitted = locallyEmittedDocumentRef.current;
    if (
      locallyEmitted &&
      !areOpenEditorDocumentsEqual(locallyEmitted, document)
    ) {
      locallyEmittedDocumentRef.current = undefined;
    }
    if (
      !shouldSyncOpenEditorDocument(
        currentController.getContent(),
        document,
        locallyEmitted,
      )
    ) {
      return;
    }

    let active = true;
    const frame = requestAnimationFrame(() => {
      const latestController = controllerRef.current;
      if (!active || !latestController.ready) return;
      if (
        !shouldSyncOpenEditorDocument(
          latestController.getContent(),
          document,
          locallyEmittedDocumentRef.current,
        )
      ) {
        return;
      }
      latestController.setContent(document, { emitChange: false });
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [document, locallyEmittedDocumentRef, ready]);
}
