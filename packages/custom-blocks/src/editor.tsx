"use client";

import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { useState } from "react";
import {
  addDecisionNode,
  addDecisionTree,
  deleteDecisionNode,
  deleteDecisionTree,
  renameDecisionTree,
  updateDecisionDocument,
  updateDecisionTree,
} from "./decision-tree";
import {
  addDirectory,
  deleteDirectory,
  deleteDirectoryRow,
  duplicateDirectory,
  duplicateDirectoryColumn,
  duplicateDirectoryRow,
  insertDirectoryColumn,
  insertDirectoryRow,
  moveDirectoryItem,
  pasteDirectoryColumn,
  pasteDirectoryRow,
  removeDirectoryColumn,
  renameDirectory,
} from "./directory";
import { decisionTreeBlock, directoryBlock, quickLinksBlock } from "./index";
import { reorderDecisionTreeSiblings } from "./decision-tree-navigation";
import {
  duplicateQuickLink,
  moveQuickLink,
  type QuickLink,
} from "./quick-links";

const createId = () => crypto.randomUUID();

export const directoryEditor = defineOpenEditorCustomBlockEditor({
  block: directoryBlock,
  render: function DirectoryEditor({ data, updateData }) {
    const updateDataJson = (value: unknown) => updateData(value as typeof data);
    const [activeId, setActiveId] = useState(data.directories[0]?.id ?? "");
    const active =
      data.directories.find(({ id }) => id === activeId) ?? data.directories[0];
    if (!active) return null;
    const updateActive = (next: typeof active) =>
      updateDataJson({
        directories: data.directories.map((item) =>
          item.id === active.id ? next : item,
        ),
      });
    return (
      <section aria-label="Edit directory">
        <select
          aria-label="Directory"
          onChange={(event) => setActiveId(event.target.value)}
          value={active.id}
        >
          {data.directories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const next = addDirectory(data, createId);
            updateDataJson(next.content);
            setActiveId(next.activeId);
          }}
          type="button"
        >
          Add directory
        </button>
        <button
          onClick={() => {
            const next = duplicateDirectory(data, active.id, createId);
            updateDataJson(next.content);
            setActiveId(next.activeId);
          }}
          type="button"
        >
          Duplicate directory
        </button>
        <button
          disabled={data.directories.length === 1}
          onClick={() => {
            const next = deleteDirectory(data, active.id);
            updateDataJson(next.content);
            setActiveId(next.activeId);
          }}
          type="button"
        >
          Delete directory
        </button>
        <input
          aria-label="Directory name"
          onChange={(event) =>
            updateDataJson(renameDirectory(data, active.id, event.target.value))
          }
          value={active.label}
        />
        <label>
          Public page size
          <input
            min={1}
            onChange={(event) =>
              updateDataJson({
                directories: data.directories.map((item) =>
                  item.id === active.id
                    ? {
                        ...item,
                        pageSize: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }
                    : item,
                ),
              })
            }
            type="number"
            value={active.pageSize ?? ""}
          />
        </label>
        <table>
          <caption>{active.label}</caption>
          <thead>
            <tr>
              {active.columnIds.map((columnId, index) => (
                <th key={columnId} scope="col">
                  <span>{`Column ${index + 1}`}</span>
                  <button
                    onClick={() =>
                      updateActive(
                        insertDirectoryColumn(
                          active,
                          columnId,
                          false,
                          createId,
                        ),
                      )
                    }
                    type="button"
                  >
                    Insert column before
                  </button>
                  <button
                    onClick={() =>
                      updateActive(
                        insertDirectoryColumn(active, columnId, true, createId),
                      )
                    }
                    type="button"
                  >
                    Insert column after
                  </button>
                  <button
                    onClick={() =>
                      updateActive(
                        duplicateDirectoryColumn(active, columnId, createId),
                      )
                    }
                    type="button"
                  >
                    Duplicate column
                  </button>
                  <button
                    disabled={active.columnIds.length === 1}
                    onClick={() =>
                      updateActive(removeDirectoryColumn(active, columnId))
                    }
                    type="button"
                  >
                    Delete column
                  </button>
                  <button
                    disabled={index === 0}
                    onClick={() =>
                      updateActive({
                        ...active,
                        columnIds: moveDirectoryItem(
                          active.columnIds,
                          columnId,
                          active.columnIds[index - 1]!,
                        ),
                      })
                    }
                    type="button"
                  >
                    Move column left
                  </button>
                  <button
                    disabled={index + 1 === active.columnIds.length}
                    onClick={() =>
                      updateActive({
                        ...active,
                        columnIds: moveDirectoryItem(
                          active.columnIds,
                          columnId,
                          active.columnIds[index + 1]!,
                        ),
                      })
                    }
                    type="button"
                  >
                    Move column right
                  </button>
                  <button
                    onClick={async () =>
                      navigator.clipboard.writeText(
                        active.rows
                          .map((row) => row.cells[columnId] ?? "")
                          .join("\n"),
                      )
                    }
                    type="button"
                  >
                    Copy column
                  </button>
                  <button
                    onClick={async () =>
                      updateActive(
                        pasteDirectoryColumn(
                          active,
                          columnId,
                          (await navigator.clipboard.readText()).split(/\r?\n/),
                          createId,
                        ),
                      )
                    }
                    type="button"
                  >
                    Paste column
                  </button>
                </th>
              ))}
              <th scope="col">Row actions</th>
            </tr>
          </thead>
          <tbody>
            {active.rows.map((row, rowIndex) => (
              <tr key={row.id}>
                {active.columnIds.map((columnId, columnIndex) => (
                  <td key={columnId}>
                    <input
                      aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                      onChange={(event) =>
                        updateDataJson({
                          directories: data.directories.map((item) =>
                            item.id === active.id
                              ? {
                                  ...item,
                                  rows: item.rows.map((itemRow) =>
                                    itemRow.id === row.id
                                      ? {
                                          ...itemRow,
                                          cells: {
                                            ...itemRow.cells,
                                            [columnId]: event.target.value,
                                          },
                                        }
                                      : itemRow,
                                  ),
                                }
                              : item,
                          ),
                        })
                      }
                      value={row.cells[columnId] ?? ""}
                    />
                  </td>
                ))}
                <td>
                  <button
                    onClick={() =>
                      updateActive(
                        insertDirectoryRow(active, row.id, false, createId),
                      )
                    }
                    type="button"
                  >
                    Insert row before
                  </button>
                  <button
                    onClick={() =>
                      updateActive(
                        insertDirectoryRow(active, row.id, true, createId),
                      )
                    }
                    type="button"
                  >
                    Insert row after
                  </button>
                  <button
                    onClick={() =>
                      updateActive(
                        duplicateDirectoryRow(active, row.id, createId),
                      )
                    }
                    type="button"
                  >
                    Duplicate row
                  </button>
                  <button
                    disabled={active.rows.length === 1}
                    onClick={() =>
                      updateActive(deleteDirectoryRow(active, row.id))
                    }
                    type="button"
                  >
                    Delete row
                  </button>
                  <button
                    disabled={rowIndex === 0}
                    onClick={() =>
                      updateActive({
                        ...active,
                        rows: moveDirectoryItem(
                          active.rows,
                          row.id,
                          active.rows[rowIndex - 1]!.id,
                        ),
                      })
                    }
                    type="button"
                  >
                    Move row up
                  </button>
                  <button
                    disabled={rowIndex + 1 === active.rows.length}
                    onClick={() =>
                      updateActive({
                        ...active,
                        rows: moveDirectoryItem(
                          active.rows,
                          row.id,
                          active.rows[rowIndex + 1]!.id,
                        ),
                      })
                    }
                    type="button"
                  >
                    Move row down
                  </button>
                  <button
                    onClick={async () =>
                      navigator.clipboard.writeText(
                        active.columnIds
                          .map((id) => row.cells[id] ?? "")
                          .join("\t"),
                      )
                    }
                    type="button"
                  >
                    Copy row
                  </button>
                  <button
                    onClick={async () =>
                      updateActive(
                        pasteDirectoryRow(
                          active,
                          row.id,
                          (await navigator.clipboard.readText()).split("\t"),
                          createId,
                        ),
                      )
                    }
                    type="button"
                  >
                    Paste row
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  },
});

export const decisionTreeEditor = defineOpenEditorCustomBlockEditor({
  block: decisionTreeBlock,
  render: function DecisionTreeEditor({ data, host, updateData }) {
    const updateDataJson = (value: unknown) => updateData(value as typeof data);
    const [treeId, setTreeId] = useState(data.trees[0]?.id ?? "");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const tree = data.trees.find(({ id }) => id === treeId) ?? data.trees[0];
    if (!tree) return null;
    const selected = tree.nodes.find(({ id }) => id === selectedId);
    const Document = host.fields.document;
    return (
      <section
        aria-label="Edit decision tree"
        className="baseblocks-decision-tree-editor"
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
        }}
      >
        <div className="baseblocks-decision-tree-navigation">
          <select
            aria-label="Decision tree"
            onChange={(event) => {
              setTreeId(event.target.value);
              setSelectedId(null);
            }}
            value={tree.id}
          >
            {data.trees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const next = addDecisionTree(data, createId());
              updateDataJson(next.value);
              setTreeId(next.activeId);
            }}
            type="button"
          >
            Add tree
          </button>
          <button
            disabled={data.trees.length === 1}
            onClick={() => {
              const next = deleteDecisionTree(data, tree.id);
              updateDataJson(next.value);
              setTreeId(next.activeId);
            }}
            type="button"
          >
            Delete tree
          </button>
          <input
            aria-label="Tree name"
            onChange={(event) =>
              updateDataJson(
                renameDecisionTree(data, tree.id, event.target.value),
              )
            }
            value={tree.label}
          />
          <nav aria-label="Question path">
            <button onClick={() => setSelectedId(null)} type="button">
              Root
            </button>
            {selected ? (
              <button
                onClick={() => setSelectedId(selected.parentId)}
                type="button"
              >
                Back
              </button>
            ) : null}
          </nav>
          <ul>
            {tree.nodes
              .filter(({ parentId }) => parentId === (selected?.id ?? null))
              .sort((left, right) => left.order - right.order)
              .map((node, index, siblings) => (
                <li key={node.id}>
                  <button onClick={() => setSelectedId(node.id)} type="button">
                    {node.name}
                  </button>
                  <button
                    disabled={index === 0}
                    onClick={() =>
                      updateDataJson(
                        updateDecisionTree(data, {
                          ...tree,
                          nodes: reorderDecisionTreeSiblings(
                            tree.nodes,
                            selected?.id ?? null,
                            node.id,
                            siblings[index - 1]!.id,
                          ),
                        }),
                      )
                    }
                    type="button"
                  >
                    Move up
                  </button>
                  <button
                    disabled={index + 1 === siblings.length}
                    onClick={() =>
                      updateDataJson(
                        updateDecisionTree(data, {
                          ...tree,
                          nodes: reorderDecisionTreeSiblings(
                            tree.nodes,
                            selected?.id ?? null,
                            node.id,
                            siblings[index + 1]!.id,
                          ),
                        }),
                      )
                    }
                    type="button"
                  >
                    Move down
                  </button>
                  <button
                    onClick={() =>
                      updateDataJson(
                        updateDecisionTree(
                          data,
                          deleteDecisionNode(tree, node.id).tree,
                        ),
                      )
                    }
                    type="button"
                  >
                    Delete
                  </button>
                </li>
              ))}
          </ul>
          <input
            aria-label="New question"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <button
            onClick={() => {
              const next = addDecisionNode(tree, {
                id: createId(),
                name,
                parentId: selected?.id ?? null,
                document: {
                  type: "doc",
                  version: 1,
                  content: [
                    {
                      type: "paragraph",
                      attrs: { "openeditor-id": createId() },
                    },
                  ],
                },
              });
              updateDataJson(updateDecisionTree(data, next));
              setName("");
            }}
            type="button"
          >
            Add question
          </button>
        </div>
        {selected ? (
          <aside aria-label="Question context">
            <input
              aria-label="Question name"
              onChange={(event) =>
                updateDataJson(
                  updateDecisionTree(data, {
                    ...tree,
                    nodes: tree.nodes.map((node) =>
                      node.id === selected.id
                        ? { ...node, name: event.target.value }
                        : node,
                    ),
                  }),
                )
              }
              value={selected.name}
            />
            <Document
              ariaLabel={`${selected.name} context`}
              onChange={(document) =>
                updateDataJson(
                  updateDecisionTree(
                    data,
                    updateDecisionDocument(tree, selected.id, document),
                  ),
                )
              }
              value={selected.document}
            />
          </aside>
        ) : null}
      </section>
    );
  },
});

export const quickLinksEditor = defineOpenEditorCustomBlockEditor({
  block: quickLinksBlock,
  render: function QuickLinksEditor({ data, host, updateData }) {
    const updateDataJson = (value: unknown) => updateData(value as typeof data);
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [artwork, setArtwork] = useState<QuickLink["artwork"]>();
    const [linkType, setLinkType] = useState<"website" | "app">("website");
    const resolved = host.links?.resolve({ href: url, kind: linkType });
    return (
      <section aria-label="Edit quick links">
        <ul>
          {data.links.map((link, index) => (
            <li key={link.id}>
              <span>{link.title}</span>
              <button
                onClick={() => {
                  setEditingId(link.id);
                  setTitle(link.title);
                  setUrl(link.url);
                  setArtwork(link.artwork);
                  setLinkType(link.linkType === "app" ? "app" : "website");
                }}
                type="button"
              >
                Edit
              </button>
              <button
                onClick={() =>
                  updateDataJson({
                    links: [
                      ...data.links.slice(0, index + 1),
                      duplicateQuickLink(link, createId()),
                      ...data.links.slice(index + 1),
                    ],
                  })
                }
                type="button"
              >
                Duplicate
              </button>
              <button
                disabled={index === 0}
                onClick={() => {
                  updateDataJson({
                    links: moveQuickLink(data.links, link.id, -1),
                  });
                }}
                type="button"
              >
                Move up
              </button>
              <button
                disabled={index + 1 === data.links.length}
                onClick={() =>
                  updateDataJson({
                    links: moveQuickLink(data.links, link.id, 1),
                  })
                }
                type="button"
              >
                Move down
              </button>
              <button
                onClick={() =>
                  updateDataJson({
                    links: data.links.filter(({ id }) => id !== link.id),
                  })
                }
                type="button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <input
          aria-label="Link title"
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
        <input
          aria-invalid={Boolean(url && !resolved)}
          aria-label="Link destination"
          onChange={(event) => setUrl(event.target.value)}
          value={url}
        />
        <label>
          Link type
          <select
            onChange={(event) =>
              setLinkType(event.target.value === "app" ? "app" : "website")
            }
            value={linkType}
          >
            <option value="website">Website</option>
            <option value="app">App</option>
          </select>
        </label>
        {host.icons ? (
          <label>
            Icon
            <select
              onChange={(event) =>
                setArtwork(
                  event.target.value
                    ? { kind: "icon", id: event.target.value }
                    : undefined,
                )
              }
              value={artwork?.kind === "icon" ? artwork.id : ""}
            >
              <option value="">No icon</option>
              {host.icons.list().map((icon) => (
                <option key={icon.id} value={icon.id}>
                  {icon.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {host.assets?.pick ? (
          <button
            onClick={async () => {
              const asset = await host.assets?.pick?.();
              if (asset) setArtwork({ kind: "asset", assetId: asset.id });
            }}
            type="button"
          >
            Choose image
          </button>
        ) : null}
        <button
          disabled={!title.trim() || !resolved}
          onClick={() => {
            if (!resolved) return;
            const value: QuickLink = {
              id: editingId ?? createId(),
              title: title.trim(),
              url,
              linkType,
              artwork,
            };
            updateDataJson({
              links: editingId
                ? data.links.map((link) =>
                    link.id === editingId ? value : link,
                  )
                : [...data.links, value],
            });
            setTitle("");
            setUrl("");
            setArtwork(undefined);
            setEditingId(null);
            setLinkType("website");
          }}
          type="button"
        >
          {editingId ? "Save link" : "Add link"}
        </button>
      </section>
    );
  },
});

export const baseBlocksCustomBlockEditors = [
  directoryEditor,
  decisionTreeEditor,
  quickLinksEditor,
] as const;
