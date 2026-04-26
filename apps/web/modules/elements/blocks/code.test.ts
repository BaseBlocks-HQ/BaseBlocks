import { describe, expect, test } from "bun:test";
import {
  getCodeLanguageValue,
  getDisplayLanguage,
  normalizeCodeText,
  tokenizeCodeLine,
} from "./code";

describe("code block helpers", () => {
  test("normalizeCodeText_convertsWindowsNewlines", () => {
    expect(normalizeCodeText("const a = 1;\r\nconst b = 2;\r")).toBe(
      "const a = 1;\nconst b = 2;\n",
    );
  });

  test("getCodeLanguageValue_defaultsToPlaintext", () => {
    expect(getCodeLanguageValue(undefined)).toBe("plaintext");
    expect(getCodeLanguageValue(" TypeScript ")).toBe("typescript");
  });

  test("getDisplayLanguage_humanizesKnownAndUnknownLanguages", () => {
    expect(getDisplayLanguage(undefined)).toBe("Plain text");
    expect(getDisplayLanguage("tsx")).toBe("TSX");
    expect(getDisplayLanguage("custom_lang")).toBe("Custom Lang");
  });

  test("tokenizeCodeLine_marksKeywordsStringsNumbersAndComments", () => {
    expect(tokenizeCodeLine('const answer = "42"; // note')).toEqual([
      { value: "const", kind: "keyword" },
      { value: ' answer = "42"; ', kind: "plain" },
      { value: "// note", kind: "comment" },
    ]);
  });
});
