import { describe, expect, it } from "bun:test";
import { parseRequestHost } from "./hosts";

describe("parseRequestHost", () => {
  it("treats the persistent staging hostname as an application root", () => {
    expect(parseRequestHost("staging.baseblocks.dev")).toEqual({
      kind: "root",
      hostname: "staging.baseblocks.dev",
    });
  });
});
