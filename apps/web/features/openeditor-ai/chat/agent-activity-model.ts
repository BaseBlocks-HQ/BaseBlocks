export type ActivityState = "pending" | "completed" | "error";

type ActivityDetail = { label: string; value: string };

export type ActivityItem = {
  detail?: string;
  details?: ActivityDetail[];
  id: string;
  label: string;
  state: ActivityState;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function humanizeIdentifier(value: string) {
  return value
    .replace(/^tool-/, "")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function normalizeState(value: unknown): ActivityState {
  const state = asString(value)?.toLowerCase();
  if (
    state === "completed" ||
    state === "complete" ||
    state === "success" ||
    state === "output-available"
  ) {
    return "completed";
  }
  if (
    state === "failed" ||
    state === "error" ||
    state === "output-error" ||
    state === "output-denied"
  ) {
    return "error";
  }
  return "pending";
}

function summarizeOperations(value: unknown): ActivityDetail[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((operation, index) => {
    const record = asRecord(operation);
    const kind = asString(record?.kind);
    if (!record || !kind) return [];
    const title = asString(record.title);
    return [
      {
        label: `Change ${index + 1}`,
        value: `${humanizeIdentifier(kind)}${title ? ` “${title}”` : " page"}`,
      },
    ];
  });
}

function presentTool(
  toolName: string,
  record: UnknownRecord,
  state: ActivityState,
): Pick<ActivityItem, "label" | "detail" | "details"> | null {
  const input = asRecord(record.input);
  const output = asRecord(record.output);

  if (toolName === "finishTask") return null;

  if (toolName === "getSiteManifest") {
    const site = asRecord(output?.site);
    const pages = Array.isArray(output?.pages) ? output.pages : [];
    const siteName = asString(site?.name);
    const pageTitles = pages.flatMap((page) => {
      const title = asString(asRecord(page)?.title);
      return title ? [title] : [];
    });
    const draftRevision = asNumber(site?.draftRevision);
    return {
      label:
        state === "pending"
          ? "Inspecting site structure"
          : "Inspected site structure",
      detail:
        state === "completed" && siteName
          ? `${pages.length} ${pages.length === 1 ? "page" : "pages"} in ${siteName}`
          : undefined,
      details:
        state === "completed"
          ? [
              ...(siteName ? [{ label: "Site", value: siteName }] : []),
              ...(pageTitles.length
                ? [{ label: "Pages", value: pageTitles.join(", ") }]
                : []),
              ...(draftRevision === undefined
                ? []
                : [
                    {
                      label: "Draft revision",
                      value: String(draftRevision),
                    },
                  ]),
            ]
          : undefined,
    };
  }

  if (toolName === "readPage") {
    const page = asRecord(output?.page);
    const title = asString(page?.title);
    const slug = asString(page?.slug);
    const contentHash = asString(page?.contentHash);
    return {
      label:
        state === "pending"
          ? "Reading page"
          : title
            ? `Read “${title}”`
            : "Read page",
      detail: state === "completed" && slug ? `/${slug}` : undefined,
      details:
        state === "completed"
          ? [
              ...(title ? [{ label: "Page", value: title }] : []),
              ...(slug ? [{ label: "Path", value: `/${slug}` }] : []),
              ...(contentHash
                ? [{ label: "Content version", value: contentHash }]
                : []),
            ]
          : undefined,
    };
  }

  if (toolName === "applyWorkspaceChanges") {
    const operationCount = asNumber(output?.operationCount);
    const site = asRecord(input?.site);
    const siteName = asString(site?.name);
    const draftRevision = asNumber(output?.draftRevision);
    return {
      label:
        state === "pending"
          ? "Applying workspace changes"
          : operationCount === undefined
            ? "Applied workspace changes"
            : `Applied ${operationCount} ${operationCount === 1 ? "change" : "changes"}`,
      detail:
        state === "completed" && siteName
          ? `Renamed site to ${siteName}`
          : undefined,
      details:
        state === "completed"
          ? [
              ...(siteName ? [{ label: "Site name", value: siteName }] : []),
              ...summarizeOperations(input?.operations),
              ...(draftRevision === undefined
                ? []
                : [
                    {
                      label: "Result revision",
                      value: String(draftRevision),
                    },
                  ]),
            ]
          : undefined,
    };
  }

  return { label: humanizeIdentifier(toolName) };
}

function activityFromRecord(
  value: unknown,
  index: number,
  kind: "part" | "step" | "tool-call",
  fallbackState?: unknown,
): ActivityItem | null {
  const record = asRecord(value);
  if (!record) return null;

  const type = asString(record.type);
  const toolName =
    asString(record.toolName) ??
    (type?.startsWith("tool-") ? type.slice("tool-".length) : undefined);
  if (
    kind === "part" &&
    !toolName &&
    (type === "step-start" || type === "step-finish")
  ) {
    return null;
  }
  if (
    kind === "part" &&
    !toolName &&
    (type === "workspace-applied" || type === "data-workspace-applied")
  ) {
    return null;
  }
  if (kind === "part" && !toolName && type !== "dynamic-tool") return null;

  const state = normalizeState(record.state ?? record.status ?? fallbackState);
  const presentation = toolName ? presentTool(toolName, record, state) : null;
  if (toolName && !presentation) return null;
  const label =
    presentation?.label ??
    asString(record.label) ??
    asString(record.title) ??
    asString(record.name) ??
    (toolName ? humanizeIdentifier(toolName) : undefined);
  if (!label) return null;

  return {
    id:
      asString(record.id) ?? asString(record.toolCallId) ?? `${kind}-${index}`,
    label,
    detail:
      asString(record.errorText) ??
      presentation?.detail ??
      asString(record.detail),
    details: presentation?.details,
    state,
  };
}

export function getAgentActivity(source: unknown): ActivityItem[] {
  const record = asRecord(source);
  if (!record) return [];

  const candidates: ActivityItem[] = [];
  const append = (values: unknown, kind: "part" | "step" | "tool-call") => {
    if (!Array.isArray(values)) return;
    for (const [index, value] of values.entries()) {
      const item = activityFromRecord(value, index, kind, record.status);
      if (item) candidates.push(item);
    }
  };

  append(record.parts, "part");
  append(record.steps, "step");
  append(record.toolCalls, "tool-call");

  return candidates.filter(
    (item, index) =>
      !candidates
        .slice(index + 1)
        .some(
          (candidate) =>
            candidate.id === item.id ||
            (candidate.label === item.label && candidate.state === item.state),
        ),
  );
}
