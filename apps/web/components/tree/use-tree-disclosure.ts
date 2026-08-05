"use client";

import { getTreeAncestorIds, type TreeIndex } from "@baseblocks/domain";
import { useState } from "react";

type DisclosureState = {
  revealKey: string;
  expandedIds: Set<string>;
};

function revealSelection<T>(
  state: DisclosureState,
  index: TreeIndex<T>,
  selectedId?: string | null,
): DisclosureState {
  const ancestors = getTreeAncestorIds(index, selectedId);
  const revealKey = [selectedId ?? "", ...ancestors].join(":");
  if (state.revealKey === revealKey) return state;
  return {
    revealKey,
    expandedIds: new Set([...state.expandedIds, ...ancestors]),
  };
}

/**
 * Owns only user disclosure state. Selection is reconciled synchronously so a
 * selected page is visible on the first committed frame, while a later manual
 * collapse remains authoritative until selection actually changes.
 */
export function useTreeDisclosure<T>(
  index: TreeIndex<T>,
  selectedId?: string | null,
  defaultExpandedIds: Iterable<string> = [],
) {
  const [storedState, setStoredState] = useState<DisclosureState>(() =>
    revealSelection(
      { revealKey: "", expandedIds: new Set(defaultExpandedIds) },
      index,
      selectedId,
    ),
  );
  const state = revealSelection(storedState, index, selectedId);
  if (state !== storedState) setStoredState(state);

  return {
    expandedIds: state.expandedIds,
    expand(id: string) {
      setStoredState((current) => {
        const next = revealSelection(current, index, selectedId);
        if (next.expandedIds.has(id)) return next;
        return { ...next, expandedIds: new Set(next.expandedIds).add(id) };
      });
    },
    toggle(id: string) {
      setStoredState((current) => {
        const next = revealSelection(current, index, selectedId);
        const expandedIds = new Set(next.expandedIds);
        if (expandedIds.has(id)) expandedIds.delete(id);
        else expandedIds.add(id);
        return { ...next, expandedIds };
      });
    },
  };
}
