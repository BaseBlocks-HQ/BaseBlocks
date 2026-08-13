"use client";

import { createDocument, textBlock } from "@openeditor/core";
import {
  pageTabsBlock,
  type PageTabsData,
} from "@baseblocks/openeditor-contracts/core-blocks";
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { defineOpenEditorCustomBlockViewer } from "@openeditor/custom-block/viewer";
import { useState } from "react";
import { pageTabDomId } from "./page-tabs-dom";
export { pageTabDomId } from "./page-tabs-dom";

const initialDocument = () => createDocument([textBlock("paragraph", "")]);

function TabButtons({
  activeId,
  instanceId,
  tabs,
  onSelect,
}: {
  activeId: string;
  instanceId: string;
  tabs: PageTabsData["tabs"];
  onSelect: (id: string) => void;
}) {
  const selectAt = (index: number) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    if (!tab) return;
    onSelect(tab.id);
    requestAnimationFrame(() =>
      document.getElementById(pageTabDomId(instanceId, tab.id, "tab"))?.focus(),
    );
  };
  return (
    <div aria-label="Page tabs" role="tablist">
      {tabs.map((tab, index) => (
        <button
          aria-controls={pageTabDomId(instanceId, tab.id, "panel")}
          aria-selected={tab.id === activeId}
          id={pageTabDomId(instanceId, tab.id, "tab")}
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") selectAt(index + 1);
            else if (event.key === "ArrowLeft") selectAt(index - 1);
            else if (event.key === "Home") selectAt(0);
            else if (event.key === "End") selectAt(tabs.length - 1);
            else return;
            event.preventDefault();
          }}
          role="tab"
          tabIndex={tab.id === activeId ? 0 : -1}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export const pageTabsEditor = defineOpenEditorCustomBlockEditor({
  block: pageTabsBlock,
  render: function PageTabsEditor({ data, host, instanceId, updateData }) {
    const [activeId, setActiveId] = useState(data.tabs[0]?.id ?? "");
    const active = data.tabs.find(({ id }) => id === activeId) ?? data.tabs[0];
    if (!active) return null;
    const updateTabs = (tabs: PageTabsData["tabs"]) => updateData({ tabs });
    const Document = host.fields.document;
    return (
      <section aria-label="Edit page tabs">
        <TabButtons
          activeId={active.id}
          instanceId={instanceId}
          onSelect={setActiveId}
          tabs={data.tabs}
        />
        <div>
          <button
            onClick={() => {
              const id = crypto.randomUUID();
              updateTabs([
                ...data.tabs,
                {
                  id,
                  label: `Tab ${data.tabs.length + 1}`,
                  document: initialDocument(),
                },
              ]);
              setActiveId(id);
            }}
            type="button"
          >
            Add tab
          </button>
          <button
            disabled={data.tabs.length === 1}
            onClick={() => {
              const tabs = data.tabs.filter(({ id }) => id !== active.id);
              updateTabs(tabs);
              setActiveId(tabs[0]?.id ?? "");
            }}
            type="button"
          >
            Delete tab
          </button>
          <label>
            Tab name
            <input
              onChange={(event) =>
                updateTabs(
                  data.tabs.map((tab) =>
                    tab.id === active.id
                      ? { ...tab, label: event.target.value }
                      : tab,
                  ),
                )
              }
              value={active.label}
            />
          </label>
        </div>
        <div
          aria-labelledby={pageTabDomId(instanceId, active.id, "tab")}
          id={pageTabDomId(instanceId, active.id, "panel")}
          role="tabpanel"
        >
          <Document
            ariaLabel={`Edit ${active.label}`}
            onChange={(document) =>
              updateTabs(
                data.tabs.map((tab) =>
                  tab.id === active.id ? { ...tab, document } : tab,
                ),
              )
            }
            value={active.document}
          />
        </div>
      </section>
    );
  },
});

export const pageTabsViewer = defineOpenEditorCustomBlockViewer({
  block: pageTabsBlock,
  render: function PageTabsViewer({ data, host, instanceId }) {
    const [activeId, setActiveId] = useState(data.tabs[0]?.id ?? "");
    const active = data.tabs.find(({ id }) => id === activeId) ?? data.tabs[0];
    if (!active) return null;
    const Document = host.fields.document;
    return (
      <section aria-label="Page tabs">
        <TabButtons
          activeId={active.id}
          instanceId={instanceId}
          onSelect={setActiveId}
          tabs={data.tabs}
        />
        <div
          aria-labelledby={pageTabDomId(instanceId, active.id, "tab")}
          id={pageTabDomId(instanceId, active.id, "panel")}
          role="tabpanel"
        >
          <Document ariaLabel={active.label} value={active.document} />
        </div>
      </section>
    );
  },
});
