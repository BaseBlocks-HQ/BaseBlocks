import { describe, expect, test } from "bun:test";
import {
  UploadTicketVerificationError,
  createUploadTicket,
  verifyUploadTicket,
} from "./upload-ticket";

const secret = "super-secret";

describe("upload ticket", () => {
  test("round-trips valid claims", () => {
    const token = createUploadTicket({
      secret,
      claims: {
        objectKey: "sites/site_123/documents/file.pdf",
        contentType: "Application/PDF; charset=utf-8",
        size: 1024,
        expiresAt: Date.now() + 60_000,
      },
    });

    const claims = verifyUploadTicket({ token, secret });

    expect(claims).toEqual({
      objectKey: "sites/site_123/documents/file.pdf",
      contentType: "application/pdf",
      size: 1024,
      expiresAt: claims.expiresAt,
    });
  });

  test("rejects tampered payloads", () => {
    const token = createUploadTicket({
      secret,
      claims: {
        objectKey: "sites/site_123/documents/file.pdf",
        contentType: "application/pdf",
        size: 1024,
        expiresAt: Date.now() + 60_000,
      },
    });

    const [payload, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        objectKey: "sites/site_123/documents/evil.pdf",
        contentType: "application/pdf",
        size: 1024,
        expiresAt: Date.now() + 60_000,
      }),
      "utf8",
    ).toString("base64url");

    expect(() =>
      verifyUploadTicket({
        token: `${tamperedPayload}.${signature}`,
        secret,
      }),
    ).toThrowError(UploadTicketVerificationError);

    expect(() =>
      verifyUploadTicket({
        token: `${payload}.invalid`,
        secret,
      }),
    ).toThrow("Upload ticket signature is invalid");
  });

  test("rejects expired tickets", () => {
    const token = createUploadTicket({
      secret,
      claims: {
        objectKey: "sites/site_123/documents/file.pdf",
        contentType: "application/pdf",
        size: 1024,
        expiresAt: 1,
      },
    });

    expect(() => verifyUploadTicket({ token, secret, now: 2 })).toThrow(
      "Upload ticket has expired",
    );
  });
});
