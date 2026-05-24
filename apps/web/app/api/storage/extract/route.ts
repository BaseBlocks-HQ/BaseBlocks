import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readObjectBytes } from "@/lib/storage/server";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const require = createRequire(import.meta.url);

// pdfjs-dist requires DOM globals that don't exist in Node.js.
// We patch them once at module load time rather than on every request —
// serverless functions are single-tenant, so there is no concurrent-write risk.
let pdfGlobalsPatched = false;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function requireSecret(request: NextRequest): boolean {
  const expected = process.env.EXTRACTION_API_SECRET?.trim();
  if (!expected) {
    throw new Error("Missing EXTRACTION_API_SECRET");
  }

  return request.headers.get("x-baseblocks-extraction-secret") === expected;
}

function extractTextFromPlainBytes(bytes: Uint8Array, contentType: string) {
  const rawText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const text =
    contentType === "text/html"
      ? rawText
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : rawText;

  return {
    text,
    wordCount: countWords(text),
  };
}

async function extractPdfText(bytes: Uint8Array) {
  if (!pdfGlobalsPatched) {
    const { DOMMatrix, ImageData, Path2D } = await import("@napi-rs/canvas");
    globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix;
    globalThis.ImageData = ImageData as unknown as typeof globalThis.ImageData;
    globalThis.Path2D = Path2D as unknown as typeof globalThis.Path2D;
    pdfGlobalsPatched = true;
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = (() => {
    try {
      return require.resolve("pdfjs-dist/build/pdf.worker.mjs");
    } catch {
      return (
        [
          path.join(
            process.cwd(),
            "node_modules/pdfjs-dist/build/pdf.worker.mjs",
          ),
          path.join(
            process.cwd(),
            "../node_modules/pdfjs-dist/build/pdf.worker.mjs",
          ),
          path.join(
            process.cwd(),
            "../../node_modules/pdfjs-dist/build/pdf.worker.mjs",
          ),
        ].find((candidate) => existsSync(candidate)) ??
        "pdfjs-dist/build/pdf.worker.mjs"
      );
    }
  })();
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();

  const document = await pdfjs.getDocument({
    data: bytes,
    disableFontFace: true,
    useWorkerFetch: false,
  }).promise;

  try {
    let text = "";
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      text += `${textContent.items.map((item) => ("str" in item ? item.str : "")).join(" ")}\n`;
    }

    const trimmedText = text.trim();
    return {
      text: trimmedText,
      pageCount: document.numPages,
      wordCount: countWords(trimmedText),
    };
  } finally {
    await document.destroy();
  }
}

function getOfficeExtension(objectKey: string, contentType: string): string {
  const objectExtension = path.extname(objectKey).trim().toLowerCase();
  if (objectExtension) {
    return objectExtension;
  }

  switch (contentType) {
    case "application/pdf":
      return ".pdf";
    case "application/rtf":
      return ".rtf";
    case "application/vnd.oasis.opendocument.presentation":
      return ".odp";
    case "application/vnd.oasis.opendocument.spreadsheet":
      return ".ods";
    case "application/vnd.oasis.opendocument.text":
      return ".odt";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return ".pptx";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return ".xlsx";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    default:
      throw new Error(`Unsupported office content type: ${contentType}`);
  }
}

async function extractOfficeTextFromFile(args: {
  bytes: Uint8Array;
  objectKey: string;
  contentType: string;
}) {
  const directory = await mkdtemp(path.join(tmpdir(), "baseblocks-extract-"));
  const filePath = path.join(
    directory,
    `document${getOfficeExtension(args.objectKey, args.contentType)}`,
  );

  try {
    await writeFile(filePath, Buffer.from(args.bytes));

    const { OfficeParser } = await import("officeparser");
    const ast = await OfficeParser.parseOffice(filePath, {
      outputErrorToConsole: false,
      putNotesAtLast: true,
    });
    const text = ast.toText().trim();

    return {
      text,
      pageCount: ast.metadata.pages,
      wordCount: countWords(text),
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!requireSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      bucket?: string;
      objectKey?: string;
      contentType?: string;
    };

    if (!body.bucket || !body.objectKey || !body.contentType) {
      return NextResponse.json(
        { error: "Missing bucket, objectKey, or contentType" },
        { status: 400 },
      );
    }

    const normalizedType = body.contentType.split(";")[0]?.trim().toLowerCase();
    const bytes = await readObjectBytes({
      bucket: body.bucket,
      objectKey: body.objectKey,
    });

    if (
      normalizedType === "text/plain" ||
      normalizedType === "text/markdown" ||
      normalizedType === "text/html" ||
      normalizedType === "text/csv"
    ) {
      const result = extractTextFromPlainBytes(bytes, normalizedType);
      return NextResponse.json({
        success: true,
        text: result.text,
        wordCount: result.wordCount,
      });
    }

    if (
      normalizedType === "application/rtf" ||
      normalizedType === "application/vnd.oasis.opendocument.presentation" ||
      normalizedType === "application/vnd.oasis.opendocument.spreadsheet" ||
      normalizedType === "application/vnd.oasis.opendocument.text" ||
      normalizedType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      normalizedType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      normalizedType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await extractOfficeTextFromFile({
        bytes,
        objectKey: body.objectKey,
        contentType: normalizedType,
      });
      return NextResponse.json({
        success: true,
        text: result.text,
        pageCount: result.pageCount,
        wordCount: result.wordCount,
      });
    }

    if (normalizedType === "application/pdf") {
      const result = await extractPdfText(bytes);
      return NextResponse.json({
        success: true,
        text: result.text,
        pageCount: result.pageCount,
        wordCount: result.wordCount,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: `Unsupported extraction content type: ${normalizedType}`,
      },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Extraction failed",
      },
      { status: 500 },
    );
  }
}
