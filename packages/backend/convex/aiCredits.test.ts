import { describe, expect, test } from "bun:test";
import {
  minimumRateCardCharge,
  resolveAiCreditAvailability,
} from "./aiCredits";

describe("AI rate card admission", () => {
  test("rounds each token class and the safety buffer upward", () => {
    expect(
      minimumRateCardCharge({
        inputUnitsPerMillionTokens: 3_000_000n,
        outputUnitsPerMillionTokens: 15_000_000n,
        maxInputTokensPerRun: 10_001,
        maxOutputTokensPerRun: 2_001,
        safetyBufferBps: 2_500,
      }),
    ).toBe(75_023n);
  });

  test("keeps micro-dollar model rates in per-million-token units", () => {
    expect(
      minimumRateCardCharge({
        inputUnitsPerMillionTokens: 750_000n,
        outputUnitsPerMillionTokens: 4_500_000n,
        maxInputTokensPerRun: 64_000,
        maxOutputTokensPerRun: 16_000,
        safetyBufferBps: 2_500,
      }),
    ).toBe(150_000n);
  });
});

describe("AI credit availability", () => {
  test("admits prepaid-credit workspaces without a Plus entitlement", () => {
    expect(
      resolveAiCreditAvailability({
        accountStatus: "active",
        availableUnits: 4_000_000n,
        hasRateCard: true,
      }),
    ).toEqual({ enabled: true, reason: "available" });
  });

  test("sends a zero-balance workspace to credit purchase", () => {
    expect(
      resolveAiCreditAvailability({
        availableUnits: 0n,
        hasRateCard: true,
      }),
    ).toEqual({ enabled: false, reason: "creditsRequired" });
  });
});
