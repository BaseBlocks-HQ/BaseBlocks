import { describe, expect, test } from "bun:test";
import crons from "./crons";

describe("scheduled maintenance", () => {
  test("does not poll the durable webhook queue", () => {
    expect(Object.keys(crons.crons)).not.toContain(
      "repair Polar webhook processing",
    );
  });
});
