import { describe, expect, test } from "bun:test";
import { parsePolarOrderAmounts } from "./polarOrderAmounts";

describe("parsePolarOrderAmounts", () => {
  test("uses the gross customer payment rather than the tax-exclusive amount", () => {
    expect(
      parsePolarOrderAmounts({
        amount: 417,
        subtotal_amount: 500,
        discount_amount: 0,
        tax_amount: 83,
        total_amount: 500,
        net_amount: 417,
        refunded_amount: 0,
        refunded_tax_amount: 0,
      }),
    ).toEqual({
      subtotalMinor: 500n,
      discountMinor: 0n,
      taxMinor: 83n,
      grossMinor: 500n,
      netMinor: 417n,
      refundedGrossMinor: 0n,
    });
  });

  test("includes refunded tax in the customer-facing refund amount", () => {
    expect(
      parsePolarOrderAmounts({
        subtotal_amount: 1_000,
        discount_amount: 0,
        tax_amount: 167,
        total_amount: 1_000,
        net_amount: 833,
        refunded_amount: 417,
        refunded_tax_amount: 83,
      }).refundedGrossMinor,
    ).toBe(500n);
  });
});
