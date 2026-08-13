export function pageTabDomId(
  instanceId: string,
  tabId: string,
  part: "tab" | "panel",
) {
  return `baseblocks-${instanceId}-${part}-${tabId}`.replace(
    /[^A-Za-z0-9_-]/g,
    "-",
  );
}
