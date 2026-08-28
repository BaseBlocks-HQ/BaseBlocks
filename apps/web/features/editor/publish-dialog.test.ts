import { describe, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import { getPublishErrorMessage } from "./publish-dialog";

describe("publish error messages", () => {
  test("preserves the stale-draft error from Convex", () => {
    const error = new ConvexError(
      "The draft changed while publishing. Review the latest changes and try again.",
    );

    expect(getPublishErrorMessage(error)).toBe(
      "The draft changed while publishing. Review the latest changes and try again.",
    );
  });

  test("handles serialized client errors", () => {
    expect(getPublishErrorMessage({ message: "Publication failed" })).toBe(
      "Publication failed",
    );
    expect(getPublishErrorMessage("Publication failed")).toBe(
      "Publication failed",
    );
  });

  test("unwraps the Convex client error envelope", () => {
    expect(
      getPublishErrorMessage(
        new Error(
          "[CONVEX M(releases:publish)] [Request ID: abc] Server Error Uncaught ConvexError: The draft changed while publishing. Review the latest changes and try again. at handler (../convex/releases.ts:267:8) Called by client",
        ),
      ),
    ).toBe(
      "The draft changed while publishing. Review the latest changes and try again.",
    );
  });
});
