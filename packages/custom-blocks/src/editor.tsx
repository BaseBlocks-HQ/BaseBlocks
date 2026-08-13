"use client";

import {
  Add01Icon,
  AppWindowIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Copy01Icon,
  Delete01Icon,
  FilePasteIcon,
  ImageAdd01Icon,
  Link02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import { type ReactNode, useState } from "react";
import {
  addDecisionNode,
  addDecisionTree,
  deleteDecisionNode,
  deleteDecisionTree,
  renameDecisionTree,
  updateDecisionDocument,
  updateDecisionTree,
} from "./decision-tree";
import { reorderDecisionTreeSiblings } from "./decision-tree-navigation";
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
import {
  destinationLabel,
  duplicateQuickLink,
  moveQuickLink,
  type QuickLink,
} from "./quick-links";
import { ActionMenu, BlockShell, BlockToolbar, selectClassName } from "./ui";

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
      <BlockShell label="Edit directory">
        <BlockToolbar>
          <select
            aria-label="Directory"
            className={`${selectClassName} max-w-48 flex-1`}
            onChange={(event) => setActiveId(event.target.value)}
            value={active.id}
          >
            {data.directories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <Input
            aria-label="Directory name"
            className="min-w-40 flex-1 rounded-xl border-transparent bg-background/70 font-medium shadow-none"
            onChange={(event) =>
              updateDataJson(
                renameDirectory(data, active.id, event.target.value),
              )
            }
            value={active.label}
          />
          <div className="flex items-center gap-2">
            <Label className="sr-only" htmlFor={`${active.id}-page-size`}>
              Public page size
            </Label>
            <Input
              aria-label="Public page size"
              className="w-28 rounded-xl border-transparent bg-background/70 shadow-none"
              id={`${active.id}-page-size`}
              min={1}
              onChange={(event) =>
                updateActive({
                  ...active,
                  pageSize: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              placeholder="All rows"
              type="number"
              value={active.pageSize ?? ""}
            />
          </div>
          <Button
            className="rounded-xl"
            onClick={() => {
              const next = addDirectory(data, createId);
              updateDataJson(next.content);
              setActiveId(next.activeId);
            }}
            size="sm"
            type="button"
          >
            <HugeiconsIcon icon={Add01Icon} />
            Add directory
          </Button>
          <ActionMenu
            items={[
              {
                icon: Copy01Icon,
                label: "Duplicate directory",
                onSelect: () => {
                  const next = duplicateDirectory(data, active.id, createId);
                  updateDataJson(next.content);
                  setActiveId(next.activeId);
                },
              },
              {
                destructive: true,
                disabled: data.directories.length === 1,
                icon: Delete01Icon,
                label: "Delete directory",
                onSelect: () => {
                  const next = deleteDirectory(data, active.id);
                  updateDataJson(next.content);
                  setActiveId(next.activeId);
                },
                separatorBefore: true,
              },
            ]}
            label="Directory actions"
          />
        </BlockToolbar>

        <div className="overflow-x-auto rounded-2xl bg-card shadow-xs">
          <table className="w-full min-w-[38rem] table-fixed text-sm">
            <caption className="sr-only">{active.label}</caption>
            <thead>
              <tr className="border-b border-border/60">
                {active.columnIds.map((columnId, index) => (
                  <th
                    className="px-3 py-2 text-left"
                    key={columnId}
                    scope="col"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {`Column ${index + 1}`}
                      </span>
                      <ActionMenu
                        items={[
                          {
                            icon: ArrowLeft01Icon,
                            label: "Insert column before",
                            onSelect: () =>
                              updateActive(
                                insertDirectoryColumn(
                                  active,
                                  columnId,
                                  false,
                                  createId,
                                ),
                              ),
                          },
                          {
                            icon: ArrowRight01Icon,
                            label: "Insert column after",
                            onSelect: () =>
                              updateActive(
                                insertDirectoryColumn(
                                  active,
                                  columnId,
                                  true,
                                  createId,
                                ),
                              ),
                          },
                          {
                            icon: Copy01Icon,
                            label: "Duplicate column",
                            onSelect: () =>
                              updateActive(
                                duplicateDirectoryColumn(
                                  active,
                                  columnId,
                                  createId,
                                ),
                              ),
                          },
                          {
                            disabled: index === 0,
                            icon: ArrowLeft01Icon,
                            label: "Move column left",
                            onSelect: () =>
                              updateActive({
                                ...active,
                                columnIds: moveDirectoryItem(
                                  active.columnIds,
                                  columnId,
                                  active.columnIds[index - 1]!,
                                ),
                              }),
                            separatorBefore: true,
                          },
                          {
                            disabled: index + 1 === active.columnIds.length,
                            icon: ArrowRight01Icon,
                            label: "Move column right",
                            onSelect: () =>
                              updateActive({
                                ...active,
                                columnIds: moveDirectoryItem(
                                  active.columnIds,
                                  columnId,
                                  active.columnIds[index + 1]!,
                                ),
                              }),
                          },
                          {
                            icon: Copy01Icon,
                            label: "Copy column",
                            onSelect: () =>
                              navigator.clipboard.writeText(
                                active.rows
                                  .map((row) => row.cells[columnId] ?? "")
                                  .join("\n"),
                              ),
                            separatorBefore: true,
                          },
                          {
                            icon: FilePasteIcon,
                            label: "Paste column",
                            onSelect: async () =>
                              updateActive(
                                pasteDirectoryColumn(
                                  active,
                                  columnId,
                                  (await navigator.clipboard.readText()).split(
                                    /\r?\n/,
                                  ),
                                  createId,
                                ),
                              ),
                          },
                          {
                            destructive: true,
                            disabled: active.columnIds.length === 1,
                            icon: Delete01Icon,
                            label: "Delete column",
                            onSelect: () =>
                              updateActive(
                                removeDirectoryColumn(active, columnId),
                              ),
                            separatorBefore: true,
                          },
                        ]}
                        label={`Column ${index + 1} actions`}
                      />
                    </div>
                  </th>
                ))}
                <th className="w-12" scope="col">
                  <span className="sr-only">Row actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {active.rows.map((row, rowIndex) => (
                <tr
                  className="border-b border-border/50 last:border-0"
                  key={row.id}
                >
                  {active.columnIds.map((columnId, columnIndex) => (
                    <td className="p-1.5 align-top" key={columnId}>
                      <Input
                        aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                        className="rounded-xl border-transparent bg-transparent shadow-none hover:bg-background/60 focus-visible:bg-background"
                        onChange={(event) =>
                          updateActive({
                            ...active,
                            rows: active.rows.map((itemRow) =>
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
                          })
                        }
                        value={row.cells[columnId] ?? ""}
                      />
                    </td>
                  ))}
                  <td className="px-2 text-right">
                    <ActionMenu
                      items={[
                        {
                          icon: ArrowUp01Icon,
                          label: "Insert row before",
                          onSelect: () =>
                            updateActive(
                              insertDirectoryRow(
                                active,
                                row.id,
                                false,
                                createId,
                              ),
                            ),
                        },
                        {
                          icon: ArrowDown01Icon,
                          label: "Insert row after",
                          onSelect: () =>
                            updateActive(
                              insertDirectoryRow(
                                active,
                                row.id,
                                true,
                                createId,
                              ),
                            ),
                        },
                        {
                          icon: Copy01Icon,
                          label: "Duplicate row",
                          onSelect: () =>
                            updateActive(
                              duplicateDirectoryRow(active, row.id, createId),
                            ),
                        },
                        {
                          disabled: rowIndex === 0,
                          icon: ArrowUp01Icon,
                          label: "Move row up",
                          onSelect: () =>
                            updateActive({
                              ...active,
                              rows: moveDirectoryItem(
                                active.rows,
                                row.id,
                                active.rows[rowIndex - 1]!.id,
                              ),
                            }),
                          separatorBefore: true,
                        },
                        {
                          disabled: rowIndex + 1 === active.rows.length,
                          icon: ArrowDown01Icon,
                          label: "Move row down",
                          onSelect: () =>
                            updateActive({
                              ...active,
                              rows: moveDirectoryItem(
                                active.rows,
                                row.id,
                                active.rows[rowIndex + 1]!.id,
                              ),
                            }),
                        },
                        {
                          icon: Copy01Icon,
                          label: "Copy row",
                          onSelect: () =>
                            navigator.clipboard.writeText(
                              active.columnIds
                                .map((id) => row.cells[id] ?? "")
                                .join("\t"),
                            ),
                          separatorBefore: true,
                        },
                        {
                          icon: FilePasteIcon,
                          label: "Paste row",
                          onSelect: async () =>
                            updateActive(
                              pasteDirectoryRow(
                                active,
                                row.id,
                                (await navigator.clipboard.readText()).split(
                                  "\t",
                                ),
                                createId,
                              ),
                            ),
                        },
                        {
                          destructive: true,
                          disabled: active.rows.length === 1,
                          icon: Delete01Icon,
                          label: "Delete row",
                          onSelect: () =>
                            updateActive(deleteDirectoryRow(active, row.id)),
                          separatorBefore: true,
                        },
                      ]}
                      label={`Row ${rowIndex + 1} actions`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BlockShell>
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
    const siblings = tree.nodes
      .filter(({ parentId }) => parentId === (selected?.id ?? null))
      .sort((left, right) => left.order - right.order);
    const Document = host.fields.document;

    return (
      <BlockShell label="Edit decision tree">
        <BlockToolbar>
          <select
            aria-label="Decision tree"
            className={`${selectClassName} max-w-48 flex-1`}
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
          <Input
            aria-label="Tree name"
            className="min-w-40 flex-1 rounded-xl border-transparent bg-background/70 font-medium shadow-none"
            onChange={(event) =>
              updateDataJson(
                renameDecisionTree(data, tree.id, event.target.value),
              )
            }
            value={tree.label}
          />
          <Button
            className="rounded-xl"
            onClick={() => {
              const next = addDecisionTree(data, createId());
              updateDataJson(next.value);
              setTreeId(next.activeId);
              setSelectedId(null);
            }}
            size="sm"
            type="button"
          >
            <HugeiconsIcon icon={Add01Icon} />
            Add tree
          </Button>
          <ActionMenu
            items={[
              {
                destructive: true,
                disabled: data.trees.length === 1,
                icon: Delete01Icon,
                label: "Delete tree",
                onSelect: () => {
                  const next = deleteDecisionTree(data, tree.id);
                  updateDataJson(next.value);
                  setTreeId(next.activeId);
                  setSelectedId(null);
                },
              },
            ]}
            label="Decision tree actions"
          />
        </BlockToolbar>

        <div className="grid min-h-[30rem] gap-3 md:grid-cols-2">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card shadow-xs">
            <nav
              aria-label="Question path"
              className="flex h-11 items-center gap-1 border-b border-border/60 px-2"
            >
              <Button
                onClick={() => setSelectedId(null)}
                size="compact"
                type="button"
                variant={selected ? "ghost" : "secondary"}
              >
                Root
              </Button>
              {selected ? (
                <>
                  <span aria-hidden className="text-muted-foreground">
                    /
                  </span>
                  <Button
                    className="min-w-0 max-w-48 justify-start truncate"
                    onClick={() => setSelectedId(selected.parentId)}
                    size="compact"
                    type="button"
                    variant="ghost"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} />
                    Back
                  </Button>
                </>
              ) : null}
            </nav>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
              {siblings.length ? (
                siblings.map((node, index) => (
                  <div
                    className="group flex min-h-10 items-center gap-1 rounded-xl bg-background/60 px-1.5 hover:bg-muted"
                    key={node.id}
                  >
                    <Button
                      className="min-w-0 flex-1 justify-start truncate px-2"
                      onClick={() => setSelectedId(node.id)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {node.name}
                    </Button>
                    <ActionMenu
                      items={[
                        {
                          disabled: index === 0,
                          icon: ArrowUp01Icon,
                          label: "Move up",
                          onSelect: () =>
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
                            ),
                        },
                        {
                          disabled: index + 1 === siblings.length,
                          icon: ArrowDown01Icon,
                          label: "Move down",
                          onSelect: () =>
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
                            ),
                        },
                        {
                          destructive: true,
                          icon: Delete01Icon,
                          label: "Delete option",
                          onSelect: () =>
                            updateDataJson(
                              updateDecisionTree(
                                data,
                                deleteDecisionNode(tree, node.id).tree,
                              ),
                            ),
                          separatorBefore: true,
                        },
                      ]}
                      label={`${node.name} actions`}
                    />
                  </div>
                ))
              ) : (
                <div className="flex min-h-40 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  No options on this path yet.
                </div>
              )}
            </div>
            <div className="flex gap-2 border-t border-border/60 p-2.5">
              <Input
                aria-label="New question"
                className="rounded-xl border-transparent bg-background/70 shadow-none"
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || !name.trim()) return;
                  event.preventDefault();
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
                placeholder="Add option"
                value={name}
              />
              <Button
                aria-label="Add option"
                className="rounded-xl"
                disabled={!name.trim()}
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
                size="icon"
                type="button"
              >
                <HugeiconsIcon icon={Add01Icon} />
              </Button>
            </div>
          </div>

          <aside
            aria-label="Question context"
            className="min-h-[24rem] overflow-y-auto rounded-2xl bg-card p-4 shadow-xs"
          >
            {selected ? (
              <div className="space-y-3">
                <Input
                  aria-label="Question name"
                  className="rounded-xl border-transparent bg-background/70 font-medium shadow-none"
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
                <div className="min-h-48 rounded-xl bg-background/60 p-3">
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
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center px-6 text-center">
                <div className="max-w-60 space-y-1.5">
                  <p className="text-sm font-medium">Open an option</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Choose an option on the left to edit its rich context.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </BlockShell>
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
    const reset = () => {
      setTitle("");
      setUrl("");
      setArtwork(undefined);
      setEditingId(null);
      setLinkType("website");
    };

    return (
      <BlockShell label="Edit quick links">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid content-start gap-3 sm:grid-cols-2">
            {data.links.length ? (
              data.links.map((link, index) => (
                <article
                  className="group flex min-w-0 items-center gap-3 rounded-2xl bg-card p-3 shadow-xs transition-transform hover:-translate-y-0.5"
                  key={link.id}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                    {link.artwork?.kind === "icon" && host.icons ? (
                      (host.icons.render(link.artwork.id) as ReactNode)
                    ) : link.linkType === "app" ? (
                      <HugeiconsIcon className="size-5" icon={AppWindowIcon} />
                    ) : (
                      <HugeiconsIcon className="size-5" icon={Link02Icon} />
                    )}
                  </span>
                  <button
                    className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setEditingId(link.id);
                      setTitle(link.title);
                      setUrl(link.url);
                      setArtwork(link.artwork);
                      setLinkType(link.linkType);
                    }}
                    type="button"
                  >
                    <span className="block truncate text-sm font-semibold">
                      {link.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {destinationLabel(link)}
                    </span>
                  </button>
                  <ActionMenu
                    items={[
                      {
                        icon: Copy01Icon,
                        label: "Duplicate link",
                        onSelect: () =>
                          updateDataJson({
                            links: [
                              ...data.links.slice(0, index + 1),
                              duplicateQuickLink(link, createId()),
                              ...data.links.slice(index + 1),
                            ],
                          }),
                      },
                      {
                        disabled: index === 0,
                        icon: ArrowUp01Icon,
                        label: "Move up",
                        onSelect: () =>
                          updateDataJson({
                            links: moveQuickLink(data.links, link.id, -1),
                          }),
                        separatorBefore: true,
                      },
                      {
                        disabled: index + 1 === data.links.length,
                        icon: ArrowDown01Icon,
                        label: "Move down",
                        onSelect: () =>
                          updateDataJson({
                            links: moveQuickLink(data.links, link.id, 1),
                          }),
                      },
                      {
                        destructive: true,
                        icon: Delete01Icon,
                        label: "Delete link",
                        onSelect: () => {
                          updateDataJson({
                            links: data.links.filter(
                              ({ id }) => id !== link.id,
                            ),
                          });
                          if (editingId === link.id) reset();
                        },
                        separatorBefore: true,
                      },
                    ]}
                    label={`${link.title} actions`}
                  />
                </article>
              ))
            ) : (
              <div className="col-span-full flex min-h-48 items-center justify-center rounded-2xl bg-card px-6 text-center shadow-xs">
                <div className="max-w-60 space-y-1.5">
                  <p className="text-sm font-medium">No links yet</p>
                  <p className="text-xs text-muted-foreground">
                    Add the first destination with the form.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-2xl bg-card p-4 shadow-xs">
            <div>
              <h3 className="text-sm font-semibold">
                {editingId ? "Edit link" : "Add link"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Link to a website, a BaseBlocks page, or an app.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-link-title">Title</Label>
              <Input
                id="quick-link-title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="OpenEditor docs"
                value={title}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-link-destination">Destination</Label>
              <Input
                aria-describedby={
                  url && !resolved ? "quick-link-error" : undefined
                }
                aria-invalid={Boolean(url && !resolved)}
                id="quick-link-destination"
                onChange={(event) => setUrl(event.target.value)}
                placeholder={
                  linkType === "app" ? "app://open" : "https://example.com"
                }
                value={url}
              />
              <p
                className={`text-xs ${url && !resolved ? "text-destructive" : "text-muted-foreground"}`}
                id="quick-link-error"
              >
                {url && !resolved
                  ? "Enter a safe destination for this link type."
                  : "Relative BaseBlocks paths are also supported."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quick-link-type">Link type</Label>
                <select
                  className={`${selectClassName} w-full`}
                  id="quick-link-type"
                  onChange={(event) =>
                    setLinkType(
                      event.target.value === "app" ? "app" : "website",
                    )
                  }
                  value={linkType}
                >
                  <option value="website">Website</option>
                  <option value="app">App</option>
                </select>
              </div>
              {host.icons ? (
                <div className="space-y-1.5">
                  <Label htmlFor="quick-link-icon">Icon</Label>
                  <select
                    className={`${selectClassName} w-full`}
                    id="quick-link-icon"
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
                </div>
              ) : null}
            </div>
            {host.assets?.pick ? (
              <Button
                className="w-full rounded-xl"
                onClick={async () => {
                  const asset = await host.assets?.pick?.();
                  if (asset) setArtwork({ kind: "asset", assetId: asset.id });
                }}
                type="button"
                variant="outline"
              >
                <HugeiconsIcon icon={ImageAdd01Icon} />
                {artwork?.kind === "asset" ? "Change image" : "Choose image"}
              </Button>
            ) : null}
            <div className="flex justify-end gap-2">
              {editingId ? (
                <Button onClick={reset} type="button" variant="ghost">
                  Cancel
                </Button>
              ) : null}
              <Button
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
                  reset();
                }}
                type="button"
              >
                {editingId ? "Save link" : "Add link"}
              </Button>
            </div>
          </div>
        </div>
      </BlockShell>
    );
  },
});

export const baseBlocksCustomBlockEditors = [
  directoryEditor,
  decisionTreeEditor,
  quickLinksEditor,
] as const;
