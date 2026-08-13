"use client";
import type { OpenEditorCustomBlockViewerContext } from "@openeditor/custom-block/viewer";
import type { PageTabsData } from "@baseblocks/openeditor-contracts/core-blocks";
import { useState } from "react";
import { pageTabDomId } from "./page-tabs-dom";

export function PageTabsViewerSurface({
  data,
  host,
  instanceId,
}: OpenEditorCustomBlockViewerContext<PageTabsData>) {
  const [activeId, setActiveId] = useState(data.tabs[0]?.id ?? "");
  const active = data.tabs.find(({ id }) => id === activeId) ?? data.tabs[0];
  if (!active) return null;
  const Document = host.fields.document;
  const selectAt = (index: number) => {
    const tab = data.tabs[(index + data.tabs.length) % data.tabs.length];
    if (!tab) return;
    setActiveId(tab.id);
    requestAnimationFrame(() =>
      document.getElementById(pageTabDomId(instanceId, tab.id, "tab"))?.focus(),
    );
  };
  return (
    <section aria-label="Page tabs">
      <div aria-label="Page tabs" role="tablist">
        {data.tabs.map((tab, index) => (
          <button
            aria-controls={pageTabDomId(instanceId, tab.id, "panel")}
            aria-selected={tab.id === active.id}
            id={pageTabDomId(instanceId, tab.id, "tab")}
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") selectAt(index + 1);
              else if (event.key === "ArrowLeft") selectAt(index - 1);
              else if (event.key === "Home") selectAt(0);
              else if (event.key === "End") selectAt(data.tabs.length - 1);
              else return;
              event.preventDefault();
            }}
            role="tab"
            tabIndex={tab.id === active.id ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={pageTabDomId(instanceId, active.id, "tab")}
        id={pageTabDomId(instanceId, active.id, "panel")}
        role="tabpanel"
      >
        <Document ariaLabel={active.label} value={active.document} />
      </div>
    </section>
  );
}
