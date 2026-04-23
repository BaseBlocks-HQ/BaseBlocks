import { describe, expect, test } from "bun:test";
import { fromBuffer } from "yauzl";
import {
  type PageExportDocument,
  buildPageExportDocument,
  renderPageExportDocx,
} from "./page-export";

function readZipEntryText(
  buffer: Buffer,
  entryName: string,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error ?? new Error("Failed to read zip buffer"));
        return;
      }

      const closeAndResolve = (value: string | null) => {
        zipFile.close();
        resolve(value);
      };

      zipFile.readEntry();
      zipFile.on("entry", (entry) => {
        if (entry.fileName !== entryName) {
          zipFile.readEntry();
          return;
        }

        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            reject(streamError ?? new Error("Failed to open zip entry"));
            return;
          }

          const chunks: Buffer[] = [];
          stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          stream.on("error", reject);
          stream.on("end", () => {
            closeAndResolve(Buffer.concat(chunks).toString("utf8"));
          });
        });
      });

      zipFile.on("end", () => closeAndResolve(null));
      zipFile.on("error", reject);
    });
  });
}

describe("page export", () => {
  test("buildPageExportDocument_serializesSupportedBlocks", () => {
    const exportDocument = buildPageExportDocument({
      pageTitle: "Page Export",
      layouts: [
        {
          order: 0,
          type: "single",
          settings: {},
          slots: [
            {
              position: 0,
              blocks: [
                {
                  id: "heading-1",
                  type: "heading",
                  content: { text: "Overview", level: 2 },
                },
                {
                  id: "paragraph-1",
                  type: "paragraph",
                  content: { text: "Line one\nLine two" },
                },
                {
                  id: "rich-1",
                  type: "richtext",
                  content: {
                    document: [
                      {
                        type: "heading",
                        content: "Rich Heading",
                        props: { level: 3 },
                      },
                      {
                        type: "paragraph",
                        content: [{ text: "Alpha" }, { text: " Beta" }],
                      },
                      {
                        type: "bulletListItem",
                        content: "Bullet item",
                      },
                      {
                        type: "numberedListItem",
                        content: "Numbered item",
                      },
                      {
                        type: "checkListItem",
                        content: "Done item",
                        props: { checked: true },
                      },
                      {
                        type: "codeBlock",
                        props: { language: "ts" },
                        content: "const value = 1;",
                      },
                    ],
                  },
                },
                {
                  id: "directory-1",
                  type: "directory",
                  content: {
                    columns: [
                      { id: "name", header: "Name" },
                      { id: "email", header: "Email" },
                    ],
                    rows: [
                      {
                        id: "row-1",
                        cells: {
                          name: "Ada Lovelace",
                          email: "ada@example.com",
                        },
                      },
                    ],
                    settings: {
                      copyMode: "none",
                      pageSize: 10,
                      showSearch: true,
                    },
                  },
                },
                {
                  id: "flow-1",
                  type: "flowchart",
                  content: {
                    mermaidCode: "graph TD; A-->B;",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(exportDocument.title).toBe("Page Export");
    expect(exportDocument.blocks).toEqual([
      { type: "heading", level: 1, text: "Page Export" },
      { type: "heading", level: 2, text: "Overview" },
      { type: "paragraph", text: "Line one" },
      { type: "paragraph", text: "Line two" },
      { type: "heading", level: 3, text: "Rich Heading" },
      { type: "paragraph", text: "Alpha Beta" },
      { type: "list-item", ordered: false, level: 0, text: "Bullet item" },
      { type: "list-item", ordered: true, level: 0, text: "Numbered item" },
      { type: "task-item", checked: true, level: 0, text: "Done item" },
      { type: "code", language: "ts", text: "const value = 1;" },
      {
        type: "table",
        headers: ["Name", "Email"],
        rows: [["Ada Lovelace", "ada@example.com"]],
      },
      {
        type: "unsupported",
        label: "Flowchart",
        text: "This block type is not included in Word exports yet.",
      },
    ]);
  });

  test("renderPageExportDocx_includesExpectedDocumentText", async () => {
    const exportDocument: PageExportDocument = {
      title: "Architecture Notes",
      blocks: [
        { type: "heading", level: 1, text: "Architecture Notes" },
        { type: "paragraph", text: "The export route runs on the server." },
        { type: "list-item", ordered: false, level: 0, text: "Draft export" },
        {
          type: "list-item",
          ordered: true,
          level: 0,
          text: "Published export",
        },
        {
          type: "table",
          headers: ["Format", "Phase"],
          rows: [["Word", "Now"]],
        },
        {
          type: "code",
          language: "ts",
          text: "export const runtime = 'nodejs';",
        },
      ],
    };

    const buffer = await renderPageExportDocx(exportDocument);
    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(Buffer.from(buffer).subarray(0, 2).toString("utf8")).toBe("PK");

    const documentXml = await readZipEntryText(
      Buffer.from(buffer),
      "word/document.xml",
    );

    expect(documentXml).not.toBeNull();
    expect(documentXml).toContain("Architecture Notes");
    expect(documentXml).toContain("The export route runs on the server.");
    expect(documentXml).toContain("Draft export");
    expect(documentXml).toContain("Published export");
    expect(documentXml).toContain("Format");
    expect(documentXml).toContain("Word");
    expect(documentXml).toContain("export const runtime = &apos;nodejs&apos;;");
  });
});
