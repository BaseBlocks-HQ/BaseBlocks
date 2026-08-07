import { expect, test } from "bun:test";
import { loadAnyDocNode, mapAnyDocIngestionFailure } from "./anyDocAdapter";

test("AnyDoc Node boundary loads its platform binding", async () => {
  const anyDoc = await loadAnyDocNode();
  expect(anyDoc.formatFromExtension("pdf")).toBe("pdf");
  expect(anyDoc.toMarkdownBytes).toBeFunction();
});

test("maps nested platform failures to stable application failures", () => {
  const limits = { maxInputBytes: 20, maxOutputBytes: 10 };
  const nested = (code: string, retryable = false) =>
    new Error("outer", {
      cause: Object.assign(new Error("specific"), { code, retryable }),
    });

  expect(mapAnyDocIngestionFailure(nested("integrity-failed"), limits)).toEqual(
    { code: "source_mismatch", message: "specific", retryable: false },
  );
  expect(mapAnyDocIngestionFailure(nested("output-too-large"), limits)).toEqual(
    {
      code: "output_too_large",
      message: "specific",
      retryable: false,
      limit: 10,
    },
  );
  expect(
    mapAnyDocIngestionFailure(nested("deadline-exceeded", true), limits),
  ).toMatchObject({ code: "execution_deadline", retryable: true });
});
