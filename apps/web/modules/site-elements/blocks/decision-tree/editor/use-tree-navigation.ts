"use client";

import { useState } from "react";

export function useTreeNavigation() {
  const [path, setPath] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const currentParentId: string | null =
    path.length > 0 ? (path[path.length - 1] ?? null) : null;

  const navigateInto = (nodeId: string) => {
    setPath((prev) => [...prev, nodeId]);
    setSelectedNodeId(null);
  };

  const navigateBack = () => {
    setPath((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
    setSelectedNodeId(null);
  };

  const navigateToIndex = (index: number) => {
    setPath((prev) => prev.slice(0, index));
    setSelectedNodeId(null);
  };

  const selectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  };

  return {
    path,
    currentParentId,
    selectedNodeId,
    selectNode,
    navigateInto,
    navigateBack,
    navigateToIndex,
  };
}
