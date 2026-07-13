import { afterEach, describe, expect, test } from "bun:test";
import { filesClient } from "./upload";

const originalFetch = globalThis.fetch;
const OriginalXMLHttpRequest = globalThis.XMLHttpRequest;

class SuccessfulXMLHttpRequest {
  status = 204;
  upload = { addEventListener: () => undefined };
  private listeners = new Map<string, () => void>();

  open() {}
  setRequestHeader() {}
  addEventListener(event: string, listener: () => void) {
    this.listeners.set(event, listener);
  }
  abort() {
    this.listeners.get("abort")?.();
  }
  send() {
    this.listeners.get("load")?.();
  }
}

interface MockResponse {
  status: number;
  body?: unknown;
}

function mockRequests(responses: MockResponse[]) {
  const requests: RequestInit[] = [];
  globalThis.fetch = (async (_input, init) => {
    requests.push(init ?? {});
    const response = responses.shift();
    if (!response) throw new Error("Unexpected request");
    return new Response(
      response.body === undefined ? null : JSON.stringify(response.body),
      {
        status: response.status,
        headers:
          response.body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;
  return requests;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.XMLHttpRequest = OriginalXMLHttpRequest;
});

describe("filesClient.uploadAndRegister", () => {
  test("cleans up the transferred object when completion fails", async () => {
    globalThis.XMLHttpRequest =
      SuccessfulXMLHttpRequest as unknown as typeof XMLHttpRequest;
    const requests = mockRequests([
      {
        status: 200,
        body: {
          objectKey: "sites/site-1/assets/logo.png",
          contentType: "image/png",
          target: { method: "PUT", url: "https://uploads.example/logo" },
          uploadToken: "token",
        },
      },
      { status: 500, body: { error: "Verification failed" } },
      { status: 204 },
    ]);
    const register = () => Promise.resolve("file-1");

    await expect(
      filesClient.uploadAndRegister(
        new File(["image"], "logo.png", { type: "image/png" }),
        { siteId: "site-1", purpose: "siteAsset" },
        register,
      ),
    ).rejects.toThrow("Verification failed");

    expect(requests).toHaveLength(3);
    expect(requests[2]?.method).toBe("DELETE");
    expect(JSON.parse(String(requests[2]?.body))).toEqual({
      siteId: "site-1",
      purpose: "siteAsset",
      objectKey: "sites/site-1/assets/logo.png",
    });
  });

  test("cleans up the completed object when registration fails", async () => {
    globalThis.XMLHttpRequest =
      SuccessfulXMLHttpRequest as unknown as typeof XMLHttpRequest;
    const requests = mockRequests([
      {
        status: 200,
        body: {
          objectKey: "sites/site-1/documents/guide.pdf",
          contentType: "application/pdf",
          target: { method: "PUT", url: "https://uploads.example/guide" },
          uploadToken: "token",
        },
      },
      {
        status: 200,
        body: {
          objectKey: "sites/site-1/documents/guide.pdf",
          contentType: "application/pdf",
          size: 3,
          checksum: "checksum",
        },
      },
      { status: 204 },
    ]);

    await expect(
      filesClient.uploadAndRegister(
        new File(["pdf"], "guide.pdf", { type: "application/pdf" }),
        { siteId: "site-1", purpose: "document" },
        () => Promise.reject(new Error("Registration failed")),
      ),
    ).rejects.toThrow("Registration failed");

    expect(requests).toHaveLength(3);
    expect(requests[2]?.method).toBe("DELETE");
    expect(JSON.parse(String(requests[2]?.body))).toEqual({
      siteId: "site-1",
      purpose: "document",
      objectKey: "sites/site-1/documents/guide.pdf",
    });
  });
});
