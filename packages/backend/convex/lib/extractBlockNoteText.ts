/**
 * Extract plain text from BlockNote document format for search indexing
 */
export function extractBlockNoteText(blocks: unknown[] | undefined): string {
  if (!blocks || !Array.isArray(blocks)) return "";

  const extractText = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";

    const obj = node as Record<string, unknown>;
    let text = "";

    // Extract direct text content
    if (typeof obj.text === "string") {
      text += obj.text + " ";
    }

    // Handle BlockNote inline content (text with styles)
    if (Array.isArray(obj.content)) {
      for (const child of obj.content) {
        if (typeof child === "string") {
          text += child + " ";
        } else if (typeof child === "object" && child !== null) {
          const childObj = child as Record<string, unknown>;
          if (typeof childObj.text === "string") {
            text += childObj.text + " ";
          }
          // Recursively extract from nested content
          text += extractText(child);
        }
      }
    }

    // Recursively extract from children array (nested blocks)
    if (Array.isArray(obj.children)) {
      for (const child of obj.children) {
        text += extractText(child);
      }
    }

    return text;
  };

  return blocks.map(extractText).join(" ").replace(/\s+/g, " ").trim();
}
