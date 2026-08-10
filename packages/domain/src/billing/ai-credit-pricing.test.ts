import { describe, expect, test } from "bun:test";
import {
  aiTopUpAmountToCreditUnits,
  providerCostUsdToRetailCreditUnits,
  validateAiTopUpAmountMinor,
} from "./ai-credit-pricing";

describe("AI credit retail pricing", () => {
  test("grants one customer-facing dollar for each dollar paid", () => {
    expect(aiTopUpAmountToCreditUnits(500n)).toBe(5_000_000n);
    expect(aiTopUpAmountToCreditUnits(1_000n)).toBe(10_000_000n);
    expect(aiTopUpAmountToCreditUnits(2_000n)).toBe(20_000_000n);
  });

  test("enforces only the merchant minimum", () => {
    expect(validateAiTopUpAmountMinor(500n)).toBe(500n);
    expect(validateAiTopUpAmountMinor(5_000_000n)).toBe(5_000_000n);
    expect(() => validateAiTopUpAmountMinor(499n)).toThrow("at least $5");
  });

  test("charges a 25 percent markup over provider cost", () => {
    expect(providerCostUsdToRetailCreditUnits(4)).toBe(5_000_000n);
    expect(providerCostUsdToRetailCreditUnits(0.000001)).toBe(2n);
  });
});
