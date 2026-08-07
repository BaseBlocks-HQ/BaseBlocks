import { afterEach, describe, expect, test } from "bun:test";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { richOpenEditorDocument } from "./fixtures/rich-openeditor-document";
import { composeOpenEditorDocx, renderOpenEditorDocx } from "./openeditor-docx";

const temporaryFiles: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryFiles.splice(0).map((path) => unlink(path).catch(() => undefined)),
  );
});

describe("OpenEditor DOCX exporter", () => {
  test("composes block structure without flattening it", () => {
    const composition = composeOpenEditorDocx(richOpenEditorDocument);

    expect(composition.children.map((child) => child.rootKey)).toEqual([
      "w:p",
      "w:p",
      "w:p",
      "w:p",
      "w:p",
      "w:p",
      "w:tbl",
    ]);
    expect(composition.numbering).toHaveLength(1);
    expect(composition.numbering[0]?.levels[0]?.start).toBe(3);
  });

  test("writes headings, inline marks, lists, links, and tables to OOXML", async () => {
    const xml = await renderAndReadXml();

    expect(xml.document).toContain('<w:pStyle w:val="Heading2"/>');
    expect(xml.document).toContain("<w:b/>");
    expect(xml.document).toContain("<w:i/>");
    expect(xml.document).toContain('<w:u w:val="single"');
    expect(xml.document).toContain("<w:strike/>");
    expect(xml.document).toContain('w:ascii="Courier New"');
    expect(xml.document).toContain("<w:br/>");
    expect(xml.document).toContain("<w:hyperlink");
    expect(xml.relationships).toContain("https://openeditor.dev/docs");
    expect(xml.document.match(/<w:numPr>/g)).toHaveLength(4);
    expect(xml.numbering).toContain('<w:numFmt w:val="decimal"/>');
    expect(xml.numbering).toContain('<w:start w:val="3"/>');
    expect(xml.document).toContain("<w:tbl>");
    expect(xml.document).toContain("<w:tblHeader/>");
    expect(xml.document).toContain(">Feature</w:t>");
    expect(xml.document).toContain(">Preserved</w:t>");
  });

  test("preserves merged table cells", async () => {
    const buffer = await renderOpenEditorDocx({
      type: "doc",
      version: 1,
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  attrs: { colspan: 2, rowspan: 2, colwidth: [200, 200] },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Merged" }],
                    },
                  ],
                },
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Third" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Below" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const path = await writeTemporaryDocx(buffer);
    const documentXml = await unzipEntry(path, "word/document.xml");

    expect(documentXml).toContain('<w:gridSpan w:val="2"/>');
    expect(documentXml).toContain('<w:vMerge w:val="restart"/>');
    expect(documentXml).toContain('<w:vMerge w:val="continue"/>');
    expect(documentXml).toContain("Merged");
    expect(documentXml).toContain("Below");
  });

  test("ignores unsupported attributes while preserving real child content", async () => {
    const buffer = await renderOpenEditorDocx({
      type: "doc",
      version: 1,
      content: [
        {
          type: "customWidget",
          attrs: { header: "Must not leak", secret: "attribute text" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Visible child" }],
            },
          ],
        },
      ],
    });
    const path = await writeTemporaryDocx(buffer);
    const documentXml = await unzipEntry(path, "word/document.xml");

    expect(documentXml).toContain("Visible child");
    expect(documentXml).not.toContain("Must not leak");
    expect(documentXml).not.toContain("attribute text");
  });

  test("keeps unsafe links as text without emitting external relationships", async () => {
    const buffer = await renderOpenEditorDocx({
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Safe link",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
            {
              type: "text",
              text: " Unsafe script",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
            {
              type: "text",
              text: " Unsafe file",
              marks: [{ type: "link", attrs: { href: "file:///etc/passwd" } }],
            },
          ],
        },
        {
          type: "page",
          attrs: { href: "data:text/html,unsafe" },
          content: [{ type: "text", text: "Unsafe page target" }],
        },
      ],
    });
    const path = await writeTemporaryDocx(buffer);
    const [documentXml, relationships] = await Promise.all([
      unzipEntry(path, "word/document.xml"),
      unzipEntry(path, "word/_rels/document.xml.rels"),
    ]);

    expect(documentXml).toContain("Safe link");
    expect(documentXml).toContain("Unsafe script");
    expect(documentXml).toContain("Unsafe file");
    expect(documentXml).toContain("Unsafe page target");
    expect(relationships).toContain("https://example.com/");
    expect(relationships).not.toContain("javascript:");
    expect(relationships).not.toContain("file:");
    expect(relationships).not.toContain("data:");
    expect(documentXml.match(/<w:hyperlink/g)).toHaveLength(1);
  });

  test("renders meaningful fallbacks for media and BaseBlocks blocks", async () => {
    const buffer = await renderOpenEditorDocx({
      type: "doc",
      version: 1,
      content: [
        { type: "image", attrs: { alt: "Quarterly revenue chart" } },
        {
          type: "attachment",
          attrs: {
            mimeType: "application/pdf",
            name: "Financial report.pdf",
            size: 1536,
          },
        },
        {
          type: "baseblocksQuickLinks",
          attrs: {
            links: [
              { title: "Company site", url: "https://example.com/company" },
              { title: "Blocked link", url: "javascript:alert(1)" },
            ],
          },
        },
        {
          type: "baseblocksDirectory",
          attrs: {
            directory: {
              directories: [
                { label: "Customers", rows: [{ id: "one" }, { id: "two" }] },
              ],
            },
          },
        },
        {
          type: "baseblocksLibrary",
          attrs: { library: { libraryId: "library-123" } },
        },
        {
          type: "baseblocksSearch",
          attrs: { search: { placeholder: "Search reports" } },
        },
        {
          type: "baseblocksDecisionTree",
          attrs: {
            decisionTree: {
              trees: [{ label: "Qualification", nodes: [{ id: "root" }] }],
            },
          },
        },
        {
          type: "baseblocksPageTabs",
          attrs: {
            tabs: {
              tabs: [
                {
                  label: "Overview",
                  document: {
                    type: "doc",
                    version: 1,
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Nested tab content" }],
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    });
    const path = await writeTemporaryDocx(buffer);
    const [documentXml, relationships] = await Promise.all([
      unzipEntry(path, "word/document.xml"),
      unzipEntry(path, "word/_rels/document.xml.rels"),
    ]);

    for (const expected of [
      "Quarterly revenue chart",
      "Financial report.pdf",
      "application/pdf",
      "1.5 KB",
      "Company site",
      "Blocked link",
      "Customers",
      "2 entries",
      "library-123",
      "Search reports",
      "Qualification",
      "1 node",
      "Overview",
      "Nested tab content",
    ]) {
      expect(documentXml).toContain(expected);
    }
    expect(relationships).toContain("https://example.com/company");
    expect(relationships).not.toContain("javascript:");
  });
});

async function renderAndReadXml() {
  const path = await writeTemporaryDocx(
    await renderOpenEditorDocx(richOpenEditorDocument),
  );
  const [document, numbering, relationships] = await Promise.all([
    unzipEntry(path, "word/document.xml"),
    unzipEntry(path, "word/numbering.xml"),
    unzipEntry(path, "word/_rels/document.xml.rels"),
  ]);
  return { document, numbering, relationships };
}

async function writeTemporaryDocx(buffer: Buffer): Promise<string> {
  const path = join(
    tmpdir(),
    `baseblocks-openeditor-${crypto.randomUUID()}.docx`,
  );
  temporaryFiles.push(path);
  await Bun.write(path, buffer);
  return path;
}

async function unzipEntry(path: string, entry: string): Promise<string> {
  const process = Bun.spawn(["unzip", "-p", path, entry], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) throw new Error(stderr);
  return stdout;
}
