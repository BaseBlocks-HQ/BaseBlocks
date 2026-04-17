import {
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from "node:http";
import {
  UploadTicketVerificationError,
  getStorageMaxUploadSizeFromEnv,
  getStorageProviderFromEnv,
  getStorageProviderNameFromEnv,
  verifyUploadTicket,
} from "@baseblocks/storage";
import { normalizeMimeType } from "@baseblocks/types";
import {
  type AllowedOriginPattern,
  isAllowedOrigin,
  parseAllowedOrigins,
} from "./allowed-origin";

// Failure modes:
// - Missing upload signing secret lets unauthenticated clients write objects.
// - Missing allowed origins exposes the upload endpoint to arbitrary browser origins.
// - Content length mismatch means the browser is not sending the file the app authorized.
// - Expired or tampered upload tickets must fail before any bytes are streamed to storage.
const storageProvider = getStorageProviderFromEnv();
const maxUploadSizeBytes = getStorageMaxUploadSizeFromEnv();
const providerName = getStorageProviderNameFromEnv();

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in the upload service environment`);
  }

  return value;
}

function getAllowedOrigins(): AllowedOriginPattern[] {
  return parseAllowedOrigins(requireEnv("STORAGE_UPLOAD_ALLOWED_ORIGINS"));
}

const uploadSigningSecret = requireEnv("STORAGE_UPLOAD_SIGNING_SECRET");
const allowedOrigins = getAllowedOrigins();

function getOrigin(request: IncomingMessage): string | null {
  return typeof request.headers.origin === "string"
    ? request.headers.origin
    : null;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "OPTIONS, PUT",
    "Access-Control-Allow-Headers": "Content-Type, X-Baseblocks-Upload-Ticket",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && isAllowedOrigin(origin, allowedOrigins)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function writeJson(
  response: ServerResponse,
  status: number,
  payload: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function writeEmpty(
  response: ServerResponse,
  status: number,
  headers: Record<string, string> = {},
) {
  response.writeHead(status, headers);
  response.end();
}

function parseContentLength(request: IncomingMessage): number {
  const value =
    typeof request.headers["content-length"] === "string"
      ? request.headers["content-length"]
      : "";
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error("Upload request must include a positive Content-Length");
  }

  return parsedValue;
}

function getUploadTicket(request: IncomingMessage): string {
  const header = request.headers["x-baseblocks-upload-ticket"];
  if (typeof header !== "string" || !header.trim()) {
    throw new Error("Missing X-Baseblocks-Upload-Ticket header");
  }

  return header.trim();
}

async function handleUpload(
  request: IncomingMessage,
  response: ServerResponse,
  origin: string,
) {
  try {
    const ticket = verifyUploadTicket({
      token: getUploadTicket(request),
      secret: uploadSigningSecret,
    });
    const contentType = normalizeMimeType(
      request.headers["content-type"] || "application/octet-stream",
    );

    if (contentType !== ticket.contentType) {
      writeJson(
        response,
        415,
        {
          error: `Expected content type ${ticket.contentType}, received ${contentType ?? "unknown"}`,
        },
        getCorsHeaders(origin),
      );
      return;
    }

    const contentLength = parseContentLength(request);
    if (contentLength !== ticket.size) {
      writeJson(
        response,
        400,
        {
          error: `Expected content length ${ticket.size}, received ${contentLength}`,
        },
        getCorsHeaders(origin),
      );
      return;
    }

    if (maxUploadSizeBytes !== null && contentLength > maxUploadSizeBytes) {
      writeJson(
        response,
        413,
        {
          error: `File too large. Maximum size is ${maxUploadSizeBytes} bytes`,
        },
        getCorsHeaders(origin),
      );
      return;
    }

    await storageProvider.streamObject({
      objectKey: ticket.objectKey,
      contentType: ticket.contentType,
      contentLength,
      body: request,
    });

    writeJson(
      response,
      201,
      { objectKey: ticket.objectKey, size: ticket.size },
      getCorsHeaders(origin),
    );
  } catch (error) {
    if (error instanceof UploadTicketVerificationError) {
      writeJson(
        response,
        401,
        { error: error.message },
        getCorsHeaders(origin),
      );
      return;
    }

    writeJson(
      response,
      500,
      { error: error instanceof Error ? error.message : "Upload failed" },
      getCorsHeaders(origin),
    );
  }
}

const port = Number.parseInt(process.env.PORT ?? "3002", 10);

createServer(async (request, response) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );

  if (request.method === "GET" && url.pathname === "/health") {
    writeJson(response, 200, {
      ok: true,
      provider: providerName,
      maxUploadSizeBytes,
    });
    return;
  }

  if (url.pathname !== "/upload") {
    writeJson(response, 404, { error: "Not found" });
    return;
  }

  const origin = getOrigin(request);
  if (!origin || !isAllowedOrigin(origin, allowedOrigins)) {
    writeJson(response, 403, { error: "Origin not allowed" });
    return;
  }

  if (request.method === "OPTIONS") {
    writeEmpty(response, 204, getCorsHeaders(origin));
    return;
  }

  if (request.method !== "PUT") {
    writeJson(
      response,
      405,
      { error: "Method not allowed" },
      {
        Allow: "OPTIONS, PUT",
        ...getCorsHeaders(origin),
      },
    );
    return;
  }

  await handleUpload(request, response, origin);
}).listen(port);
