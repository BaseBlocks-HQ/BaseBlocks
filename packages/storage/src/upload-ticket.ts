import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeMimeType } from "@baseblocks/types";

export interface UploadTicketClaims {
  objectKey: string;
  contentType: string;
  size: number;
  expiresAt: number;
}

type UploadTicketVerificationCode =
  | "invalid_secret"
  | "invalid_token"
  | "invalid_signature"
  | "invalid_claims"
  | "expired_token";

export class UploadTicketVerificationError extends Error {
  readonly code: UploadTicketVerificationCode;

  constructor(code: UploadTicketVerificationCode, message: string) {
    super(message);
    this.code = code;
    this.name = "UploadTicketVerificationError";
  }
}

function requireSecret(secret: string): string {
  const normalizedSecret = secret.trim();
  if (!normalizedSecret) {
    throw new UploadTicketVerificationError(
      "invalid_secret",
      "Upload ticket secret must not be empty",
    );
  }

  return normalizedSecret;
}

function parseClaims(value: unknown): UploadTicketClaims {
  const payload = value as Partial<UploadTicketClaims> | null;
  const objectKey =
    typeof payload?.objectKey === "string" ? payload.objectKey.trim() : "";
  const normalizedContentType =
    typeof payload?.contentType === "string"
      ? normalizeMimeType(payload.contentType)
      : null;
  const size = payload?.size;
  const expiresAt = payload?.expiresAt;

  if (!objectKey) {
    throw new UploadTicketVerificationError(
      "invalid_claims",
      "Upload ticket is missing an object key",
    );
  }

  if (!normalizedContentType) {
    throw new UploadTicketVerificationError(
      "invalid_claims",
      "Upload ticket is missing a valid content type",
    );
  }

  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
    throw new UploadTicketVerificationError(
      "invalid_claims",
      "Upload ticket size must be a positive integer",
    );
  }

  if (
    typeof expiresAt !== "number" ||
    !Number.isInteger(expiresAt) ||
    expiresAt <= 0
  ) {
    throw new UploadTicketVerificationError(
      "invalid_claims",
      "Upload ticket expiry must be a positive integer timestamp",
    );
  }

  const validatedSize = size as number;
  const validatedExpiresAt = expiresAt as number;

  return {
    objectKey,
    contentType: normalizedContentType,
    size: validatedSize,
    expiresAt: validatedExpiresAt,
  };
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function decodePayload(encodedPayload: string): UploadTicketClaims {
  try {
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    return parseClaims(JSON.parse(payload) as unknown);
  } catch (error) {
    if (error instanceof UploadTicketVerificationError) {
      throw error;
    }

    throw new UploadTicketVerificationError(
      "invalid_token",
      "Upload ticket payload is malformed",
    );
  }
}

export function createUploadTicket(args: {
  claims: UploadTicketClaims;
  secret: string;
}): string {
  const secret = requireSecret(args.secret);
  const claims = parseClaims(args.claims);
  const encodedPayload = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url",
  );
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyUploadTicket(args: {
  token: string;
  secret: string;
  now?: number;
}): UploadTicketClaims {
  const secret = requireSecret(args.secret);
  const token = args.token.trim();
  if (!token) {
    throw new UploadTicketVerificationError(
      "invalid_token",
      "Upload ticket is missing",
    );
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new UploadTicketVerificationError(
      "invalid_token",
      "Upload ticket format is invalid",
    );
  }

  const [encodedPayload, providedSignature] = parts;
  const expectedSignature = signPayload(encodedPayload, secret);
  const providedSignatureBytes = Buffer.from(providedSignature);
  const expectedSignatureBytes = Buffer.from(expectedSignature);

  if (
    providedSignatureBytes.length !== expectedSignatureBytes.length ||
    !timingSafeEqual(providedSignatureBytes, expectedSignatureBytes)
  ) {
    throw new UploadTicketVerificationError(
      "invalid_signature",
      "Upload ticket signature is invalid",
    );
  }

  const claims = decodePayload(encodedPayload);
  const now = args.now ?? Date.now();
  if (claims.expiresAt <= now) {
    throw new UploadTicketVerificationError(
      "expired_token",
      "Upload ticket has expired",
    );
  }

  return claims;
}
